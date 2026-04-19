"""
ResNet50 Training Script — MedAI Organ / Subtype Classifier
============================================================

Trains a ResNet50 image classifier for either the organ-level or subtype-level
stage of the hierarchical cancer inference pipeline and saves a checkpoint that
the existing ``backend/model_loader.py`` can load without any modifications.

Hardware targets
----------------
Google Colab Tesla T4 (16 GB VRAM):
  - Default batch size 64 fills the T4 comfortably with FP16 AMP.
  - num_workers=2 keeps the T4 saturated without competing with Colab's
    CPU-intensive Drive I/O.
  - Dataset must be copied to /content/ (local SSD) before training —
    reading a 10 GB dataset directly from Google Drive causes severe I/O
    stalls that can triple epoch time.  See the Colab Setup section below.

GTX 1660 Ti (6 GB VRAM) + i7-9750H:
  - Use --batch-size 32 and --num-workers 4 locally.
  - AMP halves VRAM use; staged fine-tuning protects pretrained features.

Usage — local (GTX 1660 Ti)
----------------------------
    python scripts/train.py --target organ  --data-dir /path/to/dataset
    python scripts/train.py --target subtype --data-dir /path/to/dataset

    # Full options:
    python scripts/train.py \\
        --target organ \\
        --data-dir /path/to/dataset \\
        --epochs 30 \\
        --freeze-epochs 5 \\
        --batch-size 32 \\
        --lr 1e-3 \\
        --lr-backbone 1e-4 \\
        --val-split 0.2 \\
        --output-dir models/ \\
        --num-workers 4 \\
        --device cuda

Usage — Google Colab (Tesla T4, 16 GB VRAM)
--------------------------------------------
IMPORTANT: Copy your dataset from Drive to /content/ BEFORE training.
Reading a 10 GB dataset directly from Google Drive introduces severe I/O
latency that keeps the GPU idle between batches.

    # ── Cell 1: Runtime setup ────────────────────────────────────────────────
    !git clone https://github.com/<your-username>/<your-repo>.git
    %cd <your-repo>
    !pip install -q torch torchvision pillow

    # ── Cell 2: Mount Google Drive ────────────────────────────────────────────
    from google.colab import drive
    drive.mount('/content/drive')

    # ── Cell 3: Copy & unzip dataset to local SSD (critical for speed) ────────
    # Copying to /content/ avoids slow Drive I/O during training.
    # A 10 GB zip typically takes 3–5 minutes to transfer; this saves far
    # more time across all epochs.
    import shutil, zipfile, os

    DRIVE_ZIP  = "/content/drive/MyDrive/YourDataset.zip"
    LOCAL_ZIP  = "/content/YourDataset.zip"
    LOCAL_DATA = "/content/dataset"

    if not os.path.exists(LOCAL_DATA):
        print("Copying dataset from Drive to local SSD...")
        shutil.copy2(DRIVE_ZIP, LOCAL_ZIP)          # Drive → local SSD
        print("Unzipping...")
        with zipfile.ZipFile(LOCAL_ZIP, "r") as zf:
            zf.extractall(LOCAL_DATA)
        os.remove(LOCAL_ZIP)                        # free space
        print(f"Dataset ready at {LOCAL_DATA}")
    else:
        print("Dataset already extracted, skipping.")

    # ── Cell 4: Train (batch 64 saturates T4's 16 GB with FP16) ──────────────
    # --drive-backup-dir copies the best checkpoint to Drive every 5 epochs
    # automatically, protecting against session disconnects mid-training.
    !python scripts/train.py \\
        --target organ \\
        --data-dir /content/dataset \\
        --epochs 30 \\
        --freeze-epochs 5 \\
        --batch-size 64 \\
        --num-workers 2 \\
        --device cuda \\
        --drive-backup-dir /content/drive/MyDrive/models \\
        --backup-every 5

    # ── Cell 5: (Optional) Copy the final checkpoint to Drive manually ────────
    # The best checkpoint is already copied to Drive automatically during
    # training via --drive-backup-dir.  Use the cell below only if you also
    # want the final-epoch checkpoint saved to Drive:
    import shutil
    shutil.copy("models/resnet50_organ_classifier.pth",
                "/content/drive/MyDrive/models/resnet50_organ_classifier.pth")
    print("Checkpoint saved to Drive.")

Dataset folder structure
------------------------
    <data-dir>/
        Organ Folder/           (e.g. "Brain Cancer")
            subtype_folder/     (e.g. "brain_glioma")
                img001.jpg
                img002.png
                ...

  --target organ   → organ folder name is the label
  --target subtype → subtype folder name is the label

Performance note
----------------
Training on CPU is *very* slow — even a small dataset will take hours per
epoch.  A GPU machine (Google Colab T4 or your GTX 1660 Ti) is strongly
recommended.
"""

from __future__ import annotations

import argparse
import collections
import os
import shutil
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms
from torchvision.models import resnet50, ResNet50_Weights
from torchvision.transforms import InterpolationMode
from PIL import Image, UnidentifiedImageError

# ── Label dictionaries ────────────────────────────────────────────────────────
# Imported from the project when running locally.  When running in Google Colab
# (or any environment where backend/ is not present) the inline fallback dicts
# are used instead — no code change needed.
try:
    from backend.utils import (
        ORGAN_CLASSES,
        SUBTYPE_CLASSES,
        IMAGENET_MEAN,
        IMAGENET_STD,
    )
except ImportError:
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD  = [0.229, 0.224, 0.225]
    ORGAN_CLASSES = {
        0: 'ALL', 1: 'Brain Cancer', 2: 'Breast Cancer', 3: 'Cervical Cancer',
        4: 'Kidney Cancer', 5: 'Lung and Colon Cancer', 6: 'Lymphoma', 7: 'Oral Cancer',
    }
    SUBTYPE_CLASSES = {
        0: 'all_benign', 1: 'all_early', 2: 'all_pre', 3: 'all_pro',
        4: 'brain_glioma', 5: 'brain_healthy', 6: 'brain_menin', 7: 'brain_pituitary',
        8: 'brain_tumor', 9: 'breast_benign', 10: 'breast_malignant',
        11: 'cervix_dyk', 12: 'cervix_koc', 13: 'cervix_mep', 14: 'cervix_pab',
        15: 'cervix_sfi', 16: 'kidney_normal', 17: 'kidney_tumor',
        18: 'colon_aca', 19: 'colon_bnt', 20: 'lung_aca', 21: 'lung_bnt',
        22: 'lung_scc', 23: 'lymph_cll', 24: 'lymph_fl', 25: 'lymph_mcl',
        26: 'oral_normal', 27: 'oral_scc',
    }

IMAGE_SIZE       = 224
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}

ORGAN_FOLDER_TO_INDEX:   dict[str, int] = {v: k for k, v in ORGAN_CLASSES.items()}
SUBTYPE_FOLDER_TO_INDEX: dict[str, int] = {v: k for k, v in SUBTYPE_CLASSES.items()}


# ── Transforms ────────────────────────────────────────────────────────────────

def build_train_transform() -> transforms.Compose:
    """
    Medical-imaging-appropriate augmentation pipeline.

    Includes spatial transforms (crop, flip, rotation, elastic deformation)
    and appearance transforms (color jitter, random erasing) to improve
    generalisation on histopathology slides.
    """
    resize_size = int(round(IMAGE_SIZE * 1.14))
    return transforms.Compose([
        transforms.Resize(resize_size, interpolation=InterpolationMode.BILINEAR),
        transforms.RandomCrop(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=180),
        transforms.ElasticTransform(alpha=50.0, sigma=5.0),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
    ])


def build_val_transform() -> transforms.Compose:
    resize_size = int(round(IMAGE_SIZE * 1.14))
    return transforms.Compose([
        transforms.Resize(resize_size, interpolation=InterpolationMode.BILINEAR),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


# ── Dataset ───────────────────────────────────────────────────────────────────

class FlatImageDataset(Dataset):
    """
    Walks a two-level directory tree and builds a flat list of (path, label)
    pairs.  Which level provides the label is controlled by ``target``.
    Unreadable / corrupt images are silently skipped at build time so they
    never reach the training loop.
    """

    def __init__(
        self,
        data_dir: Path,
        target: str,
        transform: transforms.Compose,
        samples: list[tuple[Path, int]] | None = None,
    ) -> None:
        self.transform = transform
        self.target    = target

        if samples is not None:
            self.samples = samples
            return

        folder_to_index = (
            ORGAN_FOLDER_TO_INDEX if target == "organ" else SUBTYPE_FOLDER_TO_INDEX
        )

        self.samples:    list[tuple[Path, int]] = []
        skipped_folders: list[str]              = []
        bad_images:      list[Path]             = []

        for level1_dir in sorted(data_dir.iterdir()):
            if not level1_dir.is_dir():
                continue
            for level2_dir in sorted(level1_dir.iterdir()):
                if not level2_dir.is_dir():
                    continue

                label_folder = level1_dir.name if target == "organ" else level2_dir.name
                label_index  = folder_to_index.get(label_folder)
                if label_index is None:
                    skipped_folders.append(f"{level1_dir.name}/{level2_dir.name}")
                    continue

                for img_path in sorted(level2_dir.iterdir()):
                    if img_path.suffix.lower() not in IMAGE_EXTENSIONS:
                        continue
                    try:
                        with Image.open(img_path) as _img:
                            _img.convert("RGB")
                        self.samples.append((img_path, label_index))
                    except (UnidentifiedImageError, OSError, ValueError):
                        bad_images.append(img_path)

        if skipped_folders:
            print(f"  [WARN] Skipped {len(skipped_folders)} folder(s) with no label mapping:")
            for folder in skipped_folders[:10]:
                print(f"         {folder}")
            if len(skipped_folders) > 10:
                print(f"         ... and {len(skipped_folders) - 10} more")
        if bad_images:
            print(f"  [WARN] Skipped {len(bad_images)} unreadable image file(s):")
            for p in bad_images[:5]:
                print(f"         {p}")
            if len(bad_images) > 5:
                print(f"         ... and {len(bad_images) - 5} more")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        with Image.open(img_path) as img:
            img    = img.convert("RGB")
            tensor = self.transform(img)
        return tensor, label

    def class_counts(self) -> dict[int, int]:
        counts: dict[int, int] = collections.defaultdict(int)
        for _, label in self.samples:
            counts[label] += 1
        return dict(counts)


# ── Dataset splitting ─────────────────────────────────────────────────────────

def split_dataset(
    data_dir: Path,
    target: str,
    val_split: float,
    train_transform: transforms.Compose,
    val_transform: transforms.Compose,
) -> tuple[FlatImageDataset, FlatImageDataset]:
    full    = FlatImageDataset(data_dir, target, transform=train_transform)
    n_total = len(full)
    n_val   = max(1, int(n_total * val_split))
    n_train = n_total - n_val

    indices       = torch.randperm(n_total).tolist()
    train_samples = [full.samples[i] for i in indices[:n_train]]
    val_samples   = [full.samples[i] for i in indices[n_train:]]

    train_ds = FlatImageDataset(data_dir, target, transform=train_transform, samples=train_samples)
    val_ds   = FlatImageDataset(data_dir, target, transform=val_transform,   samples=val_samples)
    return train_ds, val_ds


# ── Weighted sampler (class imbalance) ────────────────────────────────────────

def build_weighted_sampler(train_ds: FlatImageDataset) -> WeightedRandomSampler:
    """
    Builds a WeightedRandomSampler so that every class is sampled at roughly
    equal frequency, regardless of how many images each class has.
    """
    counts      = train_ds.class_counts()
    n_samples   = len(train_ds)
    weights     = [1.0 / counts[label] for _, label in train_ds.samples]
    sampler     = WeightedRandomSampler(
        weights=weights,
        num_samples=n_samples,
        replacement=True,
    )
    return sampler


def build_class_weights(train_ds: FlatImageDataset, num_classes: int, device: torch.device) -> torch.Tensor:
    """
    Inverse-frequency class weights for CrossEntropyLoss — an additional
    safeguard on top of the sampler, especially useful when val loss is
    monitored without resampling.
    """
    counts  = train_ds.class_counts()
    total   = len(train_ds.samples)
    weights = torch.zeros(num_classes)
    for cls in range(num_classes):
        cnt = counts.get(cls, 0)
        weights[cls] = total / (num_classes * cnt) if cnt > 0 else 0.0
    return weights.to(device)


# ── Model construction ────────────────────────────────────────────────────────

def build_model(num_classes: int) -> nn.Module:
    model    = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def freeze_backbone(model: nn.Module) -> None:
    """Freeze everything except the final FC layer (Phase 1)."""
    for name, param in model.named_parameters():
        param.requires_grad = name.startswith("fc.")


def unfreeze_top_layers(model: nn.Module) -> None:
    """
    Unfreeze layer4 and FC for fine-tuning (Phase 2).
    layer3 onwards gives the model enough capacity to adapt to histopathology
    without disturbing the lower-level edge/texture features.
    """
    for name, param in model.named_parameters():
        param.requires_grad = any(
            name.startswith(prefix) for prefix in ("layer3.", "layer4.", "fc.")
        )


def unfreeze_all(model: nn.Module) -> None:
    for param in model.parameters():
        param.requires_grad = True


def make_param_groups(model: nn.Module, lr_head: float, lr_backbone: float) -> list[dict]:
    """
    Separate parameter groups so the backbone gets a lower LR than the head.
    This prevents catastrophic forgetting of ImageNet features.
    """
    head_params     = list(model.fc.parameters())
    head_param_ids  = {id(p) for p in head_params}
    backbone_params = [p for p in model.parameters() if id(p) not in head_param_ids and p.requires_grad]

    groups = []
    if backbone_params:
        groups.append({"params": backbone_params, "lr": lr_backbone})
    groups.append({"params": head_params, "lr": lr_head})
    return groups


# ── Training loop ─────────────────────────────────────────────────────────────

def run_epoch(
    model:     nn.Module,
    loader:    DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    device:    torch.device,
    scaler:    "torch.cuda.amp.GradScaler",
    is_train:  bool,
    use_amp:   bool,
) -> tuple[float, float]:
    model.train(is_train)
    total_loss = 0.0
    correct    = 0
    total      = 0

    with torch.set_grad_enabled(is_train):
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            with torch.autocast(device_type=device.type, enabled=use_amp):
                logits = model(images)
                loss   = criterion(logits, labels)

            if is_train and optimizer is not None:
                optimizer.zero_grad()
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()

            total_loss += loss.item() * images.size(0)
            preds       = logits.argmax(dim=1)
            correct    += (preds == labels).sum().item()
            total      += images.size(0)

    avg_loss = total_loss / total if total > 0 else 0.0
    accuracy = correct   / total if total > 0 else 0.0
    return avg_loss, accuracy


# ── Checkpoint ────────────────────────────────────────────────────────────────

def save_checkpoint(
    model:        nn.Module,
    target:       str,
    num_classes:  int,
    label_to_idx: dict[str, int],
    output_path:  Path,
    *,
    optimizer=None,
    scheduler=None,
    epoch: int | None = None,
    best_val_acc: float | None = None,
) -> None:
    idx_key    = "organ_to_idx" if target == "organ" else "subtype_to_idx"
    checkpoint = {
        "model_state_dict": model.state_dict(),
        "num_classes":      num_classes,
        "target":           target,
        idx_key:            label_to_idx,
    }
    if optimizer is not None:
        checkpoint["optimizer_state_dict"] = optimizer.state_dict()
    if scheduler is not None:
        checkpoint["scheduler_state_dict"] = scheduler.state_dict()
    if epoch is not None:
        checkpoint["epoch"] = epoch
    if best_val_acc is not None:
        checkpoint["best_val_acc"] = best_val_acc
    torch.save(checkpoint, output_path)
    print(f"  Checkpoint saved → {output_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train a ResNet50 organ or subtype classifier for MedAI.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--target",        required=True, choices=["organ", "subtype"],
                        help="Which classifier to train.")
    parser.add_argument("--data-dir",      type=Path, required=True,
                        help="Root directory containing the two-level folder dataset.")
    parser.add_argument("--epochs",        type=int,   default=30,
                        help="Total number of training epochs.")
    parser.add_argument("--freeze-epochs", type=int,   default=5,
                        help="Epochs to train only the FC head before unfreezing top layers.")
    parser.add_argument("--batch-size",    type=int,   default=64,
                        help="Mini-batch size (64 for Colab T4 16 GB, 32 for GTX 1660 Ti 6 GB).")
    parser.add_argument("--lr",            type=float, default=1e-3,
                        help="Learning rate for the classifier head.")
    parser.add_argument("--lr-backbone",   type=float, default=1e-4,
                        help="Learning rate for backbone layers when unfrozen (Phase 2+).")
    parser.add_argument("--val-split",     type=float, default=0.2,
                        help="Fraction of data held out for validation (0 < val-split < 1).")
    parser.add_argument("--output-dir",    type=Path,  default=PROJECT_ROOT / "models",
                        help="Directory where checkpoint files are written.")
    parser.add_argument("--num-workers",   type=int,   default=-1,
                        help="DataLoader worker processes (-1 = auto-detect from CPU count).")
    parser.add_argument("--device",        type=str,   default=None,
                        help="PyTorch device string (cuda / cpu / mps). Auto-detected if omitted.")
    parser.add_argument("--no-amp",        action="store_true",
                        help="Disable Automatic Mixed Precision even on CUDA.")
    parser.add_argument("--no-weighted-sampler", action="store_true",
                        help="Disable WeightedRandomSampler (use plain shuffled sampling instead).")
    parser.add_argument("--drive-backup-dir", type=Path, default=None,
                        help="(Colab) Google Drive folder to copy the best checkpoint into during training.")
    parser.add_argument("--backup-every", type=int, default=5,
                        help="Copy the best checkpoint to --drive-backup-dir every N epochs (default: 5).")
    parser.add_argument("--resume", action="store_true",
                        help="Resume training from the best-validation checkpoint in --output-dir. "
                             "Note: restores the epoch/optimizer/scheduler state saved at the best "
                             "val-acc point, not necessarily the very last completed epoch.")
    parser.add_argument("--reset-best-acc", action="store_true",
                        help="When used with --resume, reset the best-val-acc threshold to 0 so the "
                             "first epoch that completes will save a new checkpoint. Useful when "
                             "retraining on a larger or different dataset where the old threshold "
                             "may never be reached.")
    args = parser.parse_args()

    # ── Validation ────────────────────────────────────────────────────────────
    if not (0 < args.val_split < 1):
        parser.error("--val-split must be strictly between 0 and 1.")
    if args.backup_every < 1:
        parser.error("--backup-every must be a positive integer (>= 1).")
    if not args.data_dir.exists():
        parser.error(f"--data-dir does not exist: {args.data_dir}")

    # ── Device & AMP ──────────────────────────────────────────────────────────
    if args.device:
        device = torch.device(args.device)
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    use_amp = (device.type == "cuda") and (not args.no_amp)
    scaler  = torch.cuda.amp.GradScaler(enabled=use_amp)

    # ── num_workers ───────────────────────────────────────────────────────────
    # 2 workers is the sweet spot for Colab T4: enough to hide I/O latency
    # without starving Colab's CPU of the threads it needs for Drive I/O.
    # On a local i7-9750H you can pass --num-workers 4 for higher throughput.
    if args.num_workers == -1:
        if device.type == "cuda":
            num_workers = 2
        else:
            num_workers = 0
    else:
        num_workers = args.num_workers

    args.output_dir.mkdir(parents=True, exist_ok=True)

    if args.target == "organ":
        num_classes     = len(ORGAN_CLASSES)
        label_to_idx    = ORGAN_FOLDER_TO_INDEX
        best_ckpt_name  = "resnet50_organ_classifier.pth"
        last_ckpt_name  = "resnet50_organ_classifier_last.pth"
        final_ckpt_name = "resnet50_organ_classifier_final.pth"
    else:
        num_classes     = len(SUBTYPE_CLASSES)
        label_to_idx    = SUBTYPE_FOLDER_TO_INDEX
        best_ckpt_name  = "resnet50_subtype_classifier_best.pth"
        last_ckpt_name  = "resnet50_subtype_classifier_last.pth"
        final_ckpt_name = "resnet50_subtype_classifier_final.pth"

    # ── Banner ────────────────────────────────────────────────────────────────
    print("=" * 64)
    print(f"  MedAI ResNet50 Training — target: {args.target}")
    print("=" * 64)
    print(f"  Device           : {device}" + (" (AMP enabled)" if use_amp else ""))
    print(f"  Data dir         : {args.data_dir}")
    print(f"  Num classes      : {num_classes}")
    print(f"  Epochs           : {args.epochs}  (freeze first {args.freeze_epochs})")
    print(f"  Batch size       : {args.batch_size}")
    print(f"  LR head          : {args.lr}")
    print(f"  LR backbone      : {args.lr_backbone}")
    print(f"  Val split        : {args.val_split:.0%}")
    print(f"  num_workers      : {num_workers}")
    print(f"  Weighted sampler : {'no' if args.no_weighted_sampler else 'yes'}")
    print(f"  Output dir       : {args.output_dir}")
    if args.drive_backup_dir:
        print(f"  Drive backup dir : {args.drive_backup_dir}  (every {args.backup_every} epochs)")
    if args.resume:
        print(f"  Resume           : yes (prefers {last_ckpt_name}, falls back to {best_ckpt_name})")
    print()

    # ── Dataset ───────────────────────────────────────────────────────────────
    print("Building dataset splits...")
    train_ds, val_ds = split_dataset(
        args.data_dir, args.target, args.val_split,
        build_train_transform(), build_val_transform(),
    )
    print(f"  Train samples    : {len(train_ds)}")
    print(f"  Val   samples    : {len(val_ds)}")

    counts = train_ds.class_counts()
    print(f"  Classes in train : {len(counts)}")
    if len(counts) > 1:
        min_c, max_c = min(counts.values()), max(counts.values())
        print(f"  Imbalance ratio  : {max_c / min_c:.1f}× (min {min_c}, max {max_c})")
    print()

    if len(train_ds) == 0:
        print("ERROR: No training samples found. Check --data-dir and folder structure.", file=sys.stderr)
        sys.exit(1)

    # ── DataLoaders ───────────────────────────────────────────────────────────
    if args.no_weighted_sampler:
        train_loader = DataLoader(
            train_ds, batch_size=args.batch_size, shuffle=True,
            num_workers=num_workers, pin_memory=(device.type == "cuda"),
            persistent_workers=(num_workers > 0),
        )
    else:
        sampler = build_weighted_sampler(train_ds)
        train_loader = DataLoader(
            train_ds, batch_size=args.batch_size, sampler=sampler,
            num_workers=num_workers, pin_memory=(device.type == "cuda"),
            persistent_workers=(num_workers > 0),
        )

    val_loader = DataLoader(
        val_ds, batch_size=args.batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=(device.type == "cuda"),
        persistent_workers=(num_workers > 0),
    )

    # ── Model — Phase 1: freeze backbone ──────────────────────────────────────
    print("Loading ResNet50 with ImageNet pretrained weights...")
    model = build_model(num_classes).to(device)
    freeze_backbone(model)
    print(f"  FC layer         : {model.fc.in_features} → {num_classes}")
    print(f"  Phase 1 epochs   : 1–{args.freeze_epochs} (backbone frozen, head only)")
    print(f"  Phase 2 epochs   : {args.freeze_epochs + 1}–{args.epochs} (layer3+4 + head unfrozen)")
    print()

    # ── Loss with class weights ───────────────────────────────────────────────
    class_weights = build_class_weights(train_ds, num_classes, device)
    criterion     = nn.CrossEntropyLoss(weight=class_weights)

    # ── Optimizer & scheduler ─────────────────────────────────────────────────
    def make_optimizer(phase: int) -> torch.optim.AdamW:
        if phase == 1:
            return torch.optim.AdamW(
                filter(lambda p: p.requires_grad, model.parameters()),
                lr=args.lr, weight_decay=1e-4,
            )
        param_groups = make_param_groups(model, lr_head=args.lr, lr_backbone=args.lr_backbone)
        return torch.optim.AdamW(param_groups, weight_decay=1e-4)

    optimizer = make_optimizer(phase=1)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=3,
    )

    best_val_acc  = -1.0
    start_epoch     = 0
    best_ckpt_path  = args.output_dir / best_ckpt_name
    last_ckpt_path  = args.output_dir / last_ckpt_name
    final_ckpt_path = args.output_dir / final_ckpt_name
    new_best_since_last_backup = False

    # ── Resume ────────────────────────────────────────────────────────────────
    if args.resume:
        # Prefer the last-epoch checkpoint (exact epoch) over best-val-acc checkpoint
        resume_path = last_ckpt_path if last_ckpt_path.exists() else best_ckpt_path
        if resume_path.exists():
            print(f"  Resuming from checkpoint: {resume_path}")
            ckpt = torch.load(resume_path, map_location=device)
            model.load_state_dict(ckpt["model_state_dict"])
            saved_epoch = ckpt.get("epoch", 0)
            if saved_epoch > args.freeze_epochs:
                unfreeze_top_layers(model)
                optimizer = make_optimizer(phase=2)
                scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                    optimizer, mode="min", factor=0.5, patience=3,
                )
                print(f"  [Resume] Restored Phase 2 (backbone lr={args.lr_backbone:.0e})")
            if "optimizer_state_dict" in ckpt:
                optimizer.load_state_dict(ckpt["optimizer_state_dict"])
            if "scheduler_state_dict" in ckpt:
                scheduler.load_state_dict(ckpt["scheduler_state_dict"])
            best_val_acc = ckpt.get("best_val_acc", -1.0)
            start_epoch  = saved_epoch
            if args.reset_best_acc:
                best_val_acc = -1.0
                print(f"  Resumed at epoch {start_epoch}, best val acc reset to 0% (--reset-best-acc)")
            else:
                print(f"  Resumed at epoch {start_epoch}, best val acc so far: {best_val_acc:.2%}")
            print()
        else:
            print(f"  WARNING: --resume given but no checkpoint found. Starting from scratch.")
            print()

    header = (
        f"{'Epoch':>6}  {'Phase':>6}  {'LR(head)':>10}  "
        f"{'Train Loss':>10}  {'Train Acc':>9}  {'Val Loss':>9}  {'Val Acc':>8}"
    )
    print(header)
    print("-" * len(header))

    for epoch in range(start_epoch + 1, args.epochs + 1):

        # ── Phase transition ──────────────────────────────────────────────────
        if epoch == args.freeze_epochs + 1:
            unfreeze_top_layers(model)
            optimizer = make_optimizer(phase=2)
            scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode="min", factor=0.5, patience=3,
            )
            print(f"\n  [Phase 2] Unfroze layer3 + layer4 + FC (backbone lr={args.lr_backbone:.0e})\n")

        phase_label = "1-freeze" if epoch <= args.freeze_epochs else "2-finetune"
        current_lr  = optimizer.param_groups[-1]["lr"]
        t0          = time.time()

        train_loss, train_acc = run_epoch(
            model, train_loader, criterion, optimizer, device, scaler, is_train=True,  use_amp=use_amp)
        val_loss, val_acc     = run_epoch(
            model, val_loader,   criterion, None,      device, scaler, is_train=False, use_amp=use_amp)

        scheduler.step(val_loss)
        elapsed = time.time() - t0

        marker = " *" if val_acc > best_val_acc else ""
        print(
            f"{epoch:>6}  {phase_label:>8}  {current_lr:>10.2e}  "
            f"{train_loss:>10.4f}  {train_acc:>8.2%}  {val_loss:>9.4f}  {val_acc:>7.2%}  "
            f"({elapsed:.0f}s){marker}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_checkpoint(
                model, args.target, num_classes, label_to_idx, best_ckpt_path,
                optimizer=optimizer, scheduler=scheduler,
                epoch=epoch, best_val_acc=best_val_acc,
            )
            # Back up best checkpoint to Drive immediately — don't wait for epoch N
            if args.drive_backup_dir:
                args.drive_backup_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(best_ckpt_path, args.drive_backup_dir / best_ckpt_name)
                print(f"  Best backup → {args.drive_backup_dir / best_ckpt_name}")

        # Always save the last-completed-epoch checkpoint so --resume picks up
        # the true last epoch, not just the best-val-acc epoch
        save_checkpoint(
            model, args.target, num_classes, label_to_idx, last_ckpt_path,
            optimizer=optimizer, scheduler=scheduler,
            epoch=epoch, best_val_acc=best_val_acc,
        )
        # Back up last checkpoint to Drive every --backup-every epochs
        if args.drive_backup_dir and epoch % args.backup_every == 0:
            args.drive_backup_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(last_ckpt_path, args.drive_backup_dir / last_ckpt_name)
            print(f"  Last backup  → {args.drive_backup_dir / last_ckpt_name}")

    print()
    print(f"Training complete. Best val accuracy: {best_val_acc:.2%}")
    save_checkpoint(model, args.target, num_classes, label_to_idx, final_ckpt_path)
    print()
    if args.output_dir.resolve() == (PROJECT_ROOT / "models").resolve():
        print("Best checkpoint is already in models/ — the app will load it automatically.")
    else:
        print("To deploy the best checkpoint, copy it to models/:")
        print(f"  cp {best_ckpt_path} {PROJECT_ROOT / 'models' / best_ckpt_name}")


if __name__ == "__main__":
    main()

"""
ResNet50 Training Script — MedAI Organ / Subtype Classifier
============================================================

Trains a ResNet50 image classifier for either the organ-level or subtype-level
stage of the hierarchical cancer inference pipeline and saves a checkpoint that
the existing ``backend/model_loader.py`` can load without any modifications.

Usage examples
--------------
Train the organ classifier (8 classes):

    python scripts/train.py --target organ --data-dir /path/to/dataset

Train the subtype classifier (28 classes):

    python scripts/train.py --target subtype --data-dir /path/to/dataset

All options:

    python scripts/train.py \\
        --target organ \\
        --data-dir /path/to/dataset \\
        --epochs 30 \\
        --batch-size 32 \\
        --lr 1e-4 \\
        --val-split 0.2 \\
        --output-dir models/ \\
        --device cuda

Dataset folder structure
------------------------
The script expects the same two-level folder layout used by the evaluation
script and the web-app dataset upload:

    <data-dir>/
        Organ Folder/           (e.g. "Brain Cancer")
            subtype_folder/     (e.g. "brain_glioma")
                img001.jpg
                img002.png
                ...

For --target organ  the organ folder name determines the label.
For --target subtype the subtype folder name determines the label.

Performance note
----------------
Training on CPU is *very* slow — even a small dataset will take hours per
epoch.  A GPU machine (e.g. Google Colab with a T4 runtime) is strongly
recommended.  Set --device cuda or --device mps accordingly.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import resnet50, ResNet50_Weights
from torchvision.transforms import InterpolationMode
from PIL import Image, UnidentifiedImageError

from backend.utils import (
    ORGAN_CLASSES,
    SUBTYPE_CLASSES,
    IMAGENET_MEAN,
    IMAGENET_STD,
)

IMAGE_SIZE = 224
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}

ORGAN_FOLDER_TO_INDEX: dict[str, int] = {
    v: k for k, v in ORGAN_CLASSES.items()
}

SUBTYPE_FOLDER_TO_INDEX: dict[str, int] = {
    v: k for k, v in SUBTYPE_CLASSES.items()
}


def build_train_transform() -> transforms.Compose:
    resize_size = int(round(IMAGE_SIZE * 1.14))
    return transforms.Compose([
        transforms.Resize(resize_size, interpolation=InterpolationMode.BILINEAR),
        transforms.RandomCrop(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def build_val_transform() -> transforms.Compose:
    resize_size = int(round(IMAGE_SIZE * 1.14))
    return transforms.Compose([
        transforms.Resize(resize_size, interpolation=InterpolationMode.BILINEAR),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


class FlatImageDataset(Dataset):
    """
    Walks a two-level directory tree and builds a flat list of (path, label)
    pairs.  Which level provides the label is controlled by ``target``.
    """

    def __init__(
        self,
        data_dir: Path,
        target: str,
        transform: transforms.Compose,
        samples: list[tuple[Path, int]] | None = None,
    ) -> None:
        self.transform = transform
        self.target = target

        if samples is not None:
            self.samples = samples
            return

        folder_to_index = (
            ORGAN_FOLDER_TO_INDEX if target == "organ" else SUBTYPE_FOLDER_TO_INDEX
        )

        self.samples: list[tuple[Path, int]] = []
        skipped_folders: list[str] = []
        bad_images: list[Path] = []

        for level1_dir in sorted(data_dir.iterdir()):
            if not level1_dir.is_dir():
                continue
            for level2_dir in sorted(level1_dir.iterdir()):
                if not level2_dir.is_dir():
                    continue

                label_folder = level1_dir.name if target == "organ" else level2_dir.name
                label_index = folder_to_index.get(label_folder)
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
            print(f"  [WARN] Skipped {len(bad_images)} unreadable image file(s):"  )
            for p in bad_images[:5]:
                print(f"         {p}")
            if len(bad_images) > 5:
                print(f"         ... and {len(bad_images) - 5} more")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            tensor = self.transform(img)
        return tensor, label


def split_dataset(
    data_dir: Path,
    target: str,
    val_split: float,
    train_transform: transforms.Compose,
    val_transform: transforms.Compose,
) -> tuple[FlatImageDataset, FlatImageDataset]:
    full = FlatImageDataset(data_dir, target, transform=train_transform)
    n_total = len(full)
    n_val = max(1, int(n_total * val_split))
    n_train = n_total - n_val

    indices = torch.randperm(n_total).tolist()
    train_indices = indices[:n_train]
    val_indices = indices[n_train:]

    train_samples = [full.samples[i] for i in train_indices]
    val_samples = [full.samples[i] for i in val_indices]

    train_ds = FlatImageDataset(data_dir, target, transform=train_transform, samples=train_samples)
    val_ds = FlatImageDataset(data_dir, target, transform=val_transform, samples=val_samples)
    return train_ds, val_ds


def build_model(num_classes: int) -> nn.Module:
    model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    for param in model.parameters():
        param.requires_grad = True
    return model


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    is_train: bool,
) -> tuple[float, float]:
    model.train(is_train)
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.set_grad_enabled(is_train):
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            logits = model(images)
            loss = criterion(logits, labels)

            if is_train and optimizer is not None:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            preds = logits.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += images.size(0)

    avg_loss = total_loss / total if total > 0 else 0.0
    accuracy = correct / total if total > 0 else 0.0
    return avg_loss, accuracy


def save_checkpoint(
    model: nn.Module,
    target: str,
    num_classes: int,
    label_to_idx: dict[str, int],
    output_path: Path,
) -> None:
    if target == "organ":
        idx_key = "organ_to_idx"
    else:
        idx_key = "subtype_to_idx"

    checkpoint = {
        "model_state_dict": model.state_dict(),
        "num_classes": num_classes,
        "target": target,
        idx_key: label_to_idx,
    }
    torch.save(checkpoint, output_path)
    print(f"  Checkpoint saved → {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train a ResNet50 organ or subtype classifier for MedAI.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--target",
        required=True,
        choices=["organ", "subtype"],
        help="Which classifier to train.",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        required=True,
        help="Root directory containing the two-level folder dataset.",
    )
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs.")
    parser.add_argument("--batch-size", type=int, default=32, help="Mini-batch size.")
    parser.add_argument("--lr", type=float, default=1e-4, help="Initial learning rate.")
    parser.add_argument(
        "--val-split",
        type=float,
        default=0.2,
        help="Fraction of data held out for validation (0 < val-split < 1).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "models",
        help="Directory where checkpoint files are written.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="PyTorch device string (e.g. cuda, cpu, mps). Auto-detected if omitted.",
    )
    args = parser.parse_args()

    if not (0 < args.val_split < 1):
        parser.error("--val-split must be strictly between 0 and 1.")
    if not args.data_dir.exists():
        parser.error(f"--data-dir does not exist: {args.data_dir}")

    if args.device:
        device = torch.device(args.device)
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    args.output_dir.mkdir(parents=True, exist_ok=True)

    if args.target == "organ":
        num_classes = len(ORGAN_CLASSES)
        label_to_idx = ORGAN_FOLDER_TO_INDEX
        # Named to match the app's DEFAULT_ORGAN_CHECKPOINT path so it can be
        # dropped into models/ directly without renaming.
        best_ckpt_name = "resnet50_organ_classifier.pth"
        final_ckpt_name = "resnet50_organ_classifier_final.pth"
    else:
        num_classes = len(SUBTYPE_CLASSES)
        label_to_idx = SUBTYPE_FOLDER_TO_INDEX
        # Named to match the app's DEFAULT_SUBTYPE_CHECKPOINT path.
        best_ckpt_name = "resnet50_subtype_classifier_best.pth"
        final_ckpt_name = "resnet50_subtype_classifier_final.pth"

    print("=" * 60)
    print(f"  MedAI ResNet50 Training — target: {args.target}")
    print("=" * 60)
    print(f"  Device       : {device}")
    print(f"  Data dir     : {args.data_dir}")
    print(f"  Num classes  : {num_classes}")
    print(f"  Epochs       : {args.epochs}")
    print(f"  Batch size   : {args.batch_size}")
    print(f"  Learning rate: {args.lr}")
    print(f"  Val split    : {args.val_split:.0%}")
    print(f"  Output dir   : {args.output_dir}")
    print()

    print("Building dataset splits...")
    train_ds, val_ds = split_dataset(
        args.data_dir,
        args.target,
        args.val_split,
        build_train_transform(),
        build_val_transform(),
    )
    print(f"  Train samples: {len(train_ds)}")
    print(f"  Val   samples: {len(val_ds)}")
    print()

    if len(train_ds) == 0:
        print("ERROR: No training samples found. Check --data-dir and folder structure.", file=sys.stderr)
        sys.exit(1)

    num_workers = 0
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=num_workers, pin_memory=(device.type == "cuda"))
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=num_workers, pin_memory=(device.type == "cuda"))

    print("Loading ResNet50 with ImageNet pretrained weights...")
    model = build_model(num_classes).to(device)
    print(f"  FC layer: {model.fc.in_features} → {num_classes}")
    print()

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val_acc = -1.0
    best_ckpt_path = args.output_dir / best_ckpt_name
    final_ckpt_path = args.output_dir / final_ckpt_name

    header = f"{'Epoch':>6}  {'LR':>10}  {'Train Loss':>10}  {'Train Acc':>9}  {'Val Loss':>9}  {'Val Acc':>8}"
    print(header)
    print("-" * len(header))

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        current_lr = scheduler.get_last_lr()[0] if epoch > 1 else args.lr

        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device, is_train=True)
        val_loss, val_acc = run_epoch(model, val_loader, criterion, None, device, is_train=False)

        scheduler.step()
        elapsed = time.time() - t0

        marker = " *" if val_acc > best_val_acc else ""
        print(
            f"{epoch:>6}  {current_lr:>10.2e}  {train_loss:>10.4f}  "
            f"{train_acc:>8.2%}  {val_loss:>9.4f}  {val_acc:>7.2%}  "
            f"({elapsed:.0f}s){marker}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_checkpoint(model, args.target, num_classes, label_to_idx, best_ckpt_path)

    print()
    print(f"Training complete. Best val accuracy: {best_val_acc:.2%}")
    save_checkpoint(model, args.target, num_classes, label_to_idx, final_ckpt_path)
    print()
    if args.output_dir.resolve() == (PROJECT_ROOT / "models").resolve():
        print("Best checkpoint is already in models/ and the app will load it automatically.")
    else:
        print("To deploy the best checkpoint, copy it to models/:")
        print(f"  cp {best_ckpt_path} {PROJECT_ROOT / 'models' / best_ckpt_name}")


if __name__ == "__main__":
    main()

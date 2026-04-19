# MedAI ResNet50 Training Guide

Complete step-by-step instructions for retraining the organ and subtype classifiers used by the MedAI Dashboard.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Requirements](#2-requirements)
3. [Prepare Your Dataset](#3-prepare-your-dataset)
4. [Choose Your Training Route](#4-choose-your-training-route)
5. [Route A — Local Machine (GTX 1660 Ti)](#5-route-a--local-machine-gtx-1660-ti)
6. [Route B — Google Colab (Tesla T4)](#6-route-b--google-colab-tesla-t4)
7. [All CLI Options](#7-all-cli-options)
8. [Understanding the Training Output](#8-understanding-the-training-output)
9. [How the Script Works](#9-how-the-script-works)
10. [Deploy Your New Model](#10-deploy-your-new-model)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

The script `scripts/train.py` trains a **ResNet50** image classifier for one of two stages in the MedAI pipeline:

| Target | Classes | Best checkpoint | Last-epoch checkpoint |
|---|---|---|---|
| `organ` | 8 organ types | `models/resnet50_organ_classifier.pth` | `models/resnet50_organ_classifier_last.pth` |
| `subtype` | 28 cancer subtypes | `models/resnet50_subtype_classifier_best.pth` | `models/resnet50_subtype_classifier_last.pth` |

You run the script once per target. Once saved, the checkpoint is loaded automatically by the web app — no code changes needed.

> **Two checkpoints are kept per target.** The *best* checkpoint is updated whenever validation accuracy improves. The *last* checkpoint is overwritten at the end of every epoch regardless of accuracy, so `--resume` can always pick up from the true last completed epoch even if the session dropped before a new best was reached.

---

## 2. Requirements

### 2.1 Hardware

| Environment | GPU | VRAM | Recommended batch size |
|---|---|---|---|
| Local machine | GTX 1660 Ti | 6 GB | 32 |
| Google Colab | Tesla T4 | 16 GB | 64 |
| CPU only | — | — | 16 (very slow) |

> Training on CPU alone takes several hours per epoch even on a small dataset. A GPU is strongly recommended.

### 2.2 Python version

Python **3.9 or later** is required.

### 2.3 Python packages

Install everything with one command from the project root:

```bash
pip install torch torchvision pillow
```

The exact versions known to work:

| Package | Minimum version | Notes |
|---|---|---|
| `torch` | 2.0 | For `torch.autocast` and `GradScaler` |
| `torchvision` | 0.14 | For `ElasticTransform` |
| `pillow` | 9.0 | For image decoding |

> **Colab note:** PyTorch and torchvision are pre-installed on Colab GPU runtimes. You only need `!pip install -q pillow` if Pillow is missing.

---

## 3. Prepare Your Dataset

### 3.1 Required folder structure

The script expects a **two-level** directory tree:

```
YourDataset/
├── ALL/
│   ├── all_benign/
│   │   ├── img001.jpg
│   │   └── img002.png
│   ├── all_early/
│   ├── all_pre/
│   └── all_pro/
├── Brain Cancer/
│   ├── brain_glioma/
│   ├── brain_healthy/
│   ├── brain_menin/
│   ├── brain_pituitary/
│   └── brain_tumor/
├── Breast Cancer/
│   ├── breast_benign/
│   └── breast_malignant/
└── ...
```

- **Level 1 folder name** → organ label (used when `--target organ`)
- **Level 2 folder name** → subtype label (used when `--target subtype`)

### 3.2 Supported image formats

`.jpg` · `.jpeg` · `.png` · `.bmp` · `.tiff` · `.tif`

Corrupt or unreadable images are **automatically skipped** with a warning — they will never crash the training run.

### 3.3 Exact folder names required

The folder names must match the labels the app expects exactly (case-sensitive):

**Level 1 — organ folders:**

| Folder name |
|---|
| `ALL` |
| `Brain Cancer` |
| `Breast Cancer` |
| `Cervical Cancer` |
| `Kidney Cancer` |
| `Lung and Colon Cancer` |
| `Lymphoma` |
| `Oral Cancer` |

**Level 2 — subtype folders:**

| | | | |
|---|---|---|---|
| `all_benign` | `all_early` | `all_pre` | `all_pro` |
| `brain_glioma` | `brain_healthy` | `brain_menin` | `brain_pituitary` |
| `brain_tumor` | `breast_benign` | `breast_malignant` | `cervix_dyk` |
| `cervix_koc` | `cervix_mep` | `cervix_pab` | `cervix_sfi` |
| `colon_aca` | `colon_bnt` | `kidney_normal` | `kidney_tumor` |
| `lung_aca` | `lung_bnt` | `lung_scc` | `lymph_cll` |
| `lymph_fl` | `lymph_mcl` | `oral_normal` | `oral_scc` |

> Folders whose names do not match any of the above are skipped with a `[WARN]` message. This lets you keep extra folders (e.g. `README`, `.DS_Store`) without breaking the run.

---

## 4. Choose Your Training Route

```
Do you have a GPU available?
│
├─ Yes, on my local machine (GTX 1660 Ti or similar)
│       → Follow Route A (Section 5)
│
├─ Yes, via Google Colab
│       → Follow Route B (Section 6)
│
└─ No GPU — CPU only
        → Follow Route A but add --device cpu --batch-size 16
          Expect several hours per epoch.
```

---

## 5. Route A — Local Machine (GTX 1660 Ti)

### Step 1 — Open a terminal in the project root

```bash
cd /path/to/medai-dashboard
```

### Step 2 — Verify your GPU is visible to PyTorch

```bash
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

Expected output: `True  NVIDIA GeForce GTX 1660 Ti`

### Step 3 — Train the organ classifier

```bash
python scripts/train.py \
    --target organ \
    --data-dir /path/to/YourDataset \
    --epochs 30 \
    --freeze-epochs 5 \
    --batch-size 32 \
    --lr 1e-3 \
    --lr-backbone 1e-4 \
    --num-workers 4 \
    --device cuda
```

### Step 4 — Train the subtype classifier

```bash
python scripts/train.py \
    --target subtype \
    --data-dir /path/to/YourDataset \
    --epochs 30 \
    --freeze-epochs 5 \
    --batch-size 32 \
    --lr 1e-3 \
    --lr-backbone 1e-4 \
    --num-workers 4 \
    --device cuda
```

### Step 5 — Verify checkpoints were saved

```
models/
├── resnet50_organ_classifier.pth          ← best organ checkpoint (auto-loaded by app)
├── resnet50_organ_classifier_final.pth    ← weights at final epoch
├── resnet50_subtype_classifier_best.pth   ← best subtype checkpoint (auto-loaded by app)
└── resnet50_subtype_classifier_final.pth
```

The app loads the `best` checkpoints automatically. No further steps are needed.

---

## 6. Route B — Google Colab (Tesla T4)

> **Critical:** Never read a large dataset directly from Google Drive during training. Drive I/O is slow (~20 MB/s) and will keep the GPU idle between batches, tripling epoch time. Always copy the dataset to Colab's local SSD first.

### Step 1 — Open a new Colab notebook

Go to [colab.research.google.com](https://colab.research.google.com) and create a new notebook.

### Step 2 — Switch to a GPU runtime

`Runtime` → `Change runtime type` → select **T4 GPU** → `Save`

### Step 3 — Clone the repo and install dependencies

```python
# Cell 1
!git clone https://github.com/<your-username>/<your-repo>.git
%cd <your-repo>
!pip install -q torch torchvision pillow
```

### Step 4 — Mount Google Drive

```python
# Cell 2
from google.colab import drive
drive.mount('/content/drive')
```

A browser prompt will ask you to sign in and grant access. After authorisation, your Drive appears at `/content/drive/MyDrive/`.

### Step 5 — Copy and unzip the dataset to local SSD

> This step takes 3–5 minutes for a 10 GB dataset. It saves far more time over 30 epochs of training.

```python
# Cell 3
import shutil, zipfile, os

DRIVE_ZIP  = "/content/drive/MyDrive/YourDataset.zip"   # ← update this path
LOCAL_ZIP  = "/content/YourDataset.zip"
LOCAL_DATA = "/content/dataset"

if not os.path.exists(LOCAL_DATA):
    print("Copying dataset from Drive to local SSD...")
    shutil.copy2(DRIVE_ZIP, LOCAL_ZIP)          # Drive → local SSD
    print("Unzipping...")
    with zipfile.ZipFile(LOCAL_ZIP, "r") as zf:
        zf.extractall(LOCAL_DATA)
    os.remove(LOCAL_ZIP)                        # free the temporary zip
    print(f"Dataset ready at {LOCAL_DATA}")
else:
    print("Dataset already extracted — skipping.")
```

> If your dataset is not zipped, replace the copy+unzip block with:
> ```python
> shutil.copytree("/content/drive/MyDrive/YourDataset", LOCAL_DATA)
> ```

### Step 6 — Train the organ classifier

The command below enables automatic Drive backups every 5 epochs and supports resuming if the session drops:

```python
# Cell 4
!python scripts/train.py \
    --target organ \
    --data-dir /content/dataset \
    --epochs 30 \
    --freeze-epochs 5 \
    --batch-size 64 \
    --num-workers 2 \
    --device cuda \
    --drive-backup-dir /content/drive/MyDrive/medai-models \
    --backup-every 5 \
    --resume
```

> `--resume` is safely ignored on the first run when no checkpoint exists yet. On any subsequent run after a disconnect it automatically picks up from the last best checkpoint.

### Step 7 — Train the subtype classifier

```python
# Cell 5
!python scripts/train.py \
    --target subtype \
    --data-dir /content/dataset \
    --epochs 30 \
    --freeze-epochs 5 \
    --batch-size 64 \
    --num-workers 2 \
    --device cuda \
    --drive-backup-dir /content/drive/MyDrive/medai-models \
    --backup-every 5 \
    --resume
```

### Step 8 — Save checkpoints back to Drive

Backups are written to Drive automatically during training via `--drive-backup-dir` (see Steps 6 & 7). If you prefer to copy them manually at the end of the session as well, run:

```python
# Cell 6 (optional — backups are already on Drive if --drive-backup-dir was used)
import shutil, os

os.makedirs("/content/drive/MyDrive/medai-models", exist_ok=True)

shutil.copy("models/resnet50_organ_classifier.pth",
            "/content/drive/MyDrive/medai-models/resnet50_organ_classifier.pth")

shutil.copy("models/resnet50_subtype_classifier_best.pth",
            "/content/drive/MyDrive/medai-models/resnet50_subtype_classifier_best.pth")

print("Both checkpoints saved to Google Drive.")
```

### Step 9 — Copy checkpoints into the app (if running locally)

Download the `.pth` files from Drive, then place them in the project's `models/` folder:

```
models/
├── resnet50_organ_classifier.pth
└── resnet50_subtype_classifier_best.pth
```

The app loads these automatically — no restart required after dropping them in.

---

## 7. All CLI Options

Run `python scripts/train.py --help` at any time to see this reference:

| Flag | Default | Description |
|---|---|---|
| `--target` | *(required)* | `organ` or `subtype` — which classifier to train |
| `--data-dir` | *(required)* | Path to the root dataset folder |
| `--epochs` | `30` | Total number of training epochs |
| `--freeze-epochs` | `5` | Epochs to train only the final layer before unfreezing deeper layers |
| `--batch-size` | `64` | Images per gradient step (64 for T4, 32 for GTX 1660 Ti) |
| `--lr` | `1e-3` | Learning rate for the classifier head |
| `--lr-backbone` | `1e-4` | Learning rate for backbone layers once unfrozen |
| `--val-split` | `0.2` | Fraction of data held out for validation |
| `--output-dir` | `models/` | Where checkpoint files are written |
| `--num-workers` | auto | DataLoader worker processes (auto = 2 on GPU, 0 on CPU) |
| `--device` | auto | `cuda`, `cpu`, or `mps` (auto-detected if omitted) |
| `--no-amp` | off | Disable Automatic Mixed Precision (not recommended on GPU) |
| `--no-weighted-sampler` | off | Disable balanced class sampling |
| `--drive-backup-dir` | `None` | Google Drive folder to copy checkpoints into during training (Colab only) |
| `--backup-every` | `5` | Copy the *last-epoch* checkpoint to Drive every N epochs. The *best* checkpoint is always copied to Drive immediately when a new best val acc is achieved. |
| `--resume` | off | Resume training. Loads the *last-epoch* checkpoint first (exact epoch); falls back to the *best* checkpoint if no last-epoch file exists. Restores model, optimizer, scheduler, and epoch count. |
| `--reset-best-acc` | off | Use with `--resume` to reset the saved accuracy threshold to 0%, so checkpoints are saved normally after retraining on a new or larger dataset |

---

## 8. Understanding the Training Output

After the dataset loads, a header row and per-epoch table are printed:

```
 Epoch   Phase    LR(head)  Train Loss  Train Acc   Val Loss   Val Acc
----------------------------------------------------------------------
     1  1-freeze    1.00e-03      0.8412    72.14%     0.7903   74.22%  (38s) *
     2  1-freeze    1.00e-03      0.7108    76.50%     0.7241   77.89%  (38s) *
  ...
  [Phase 2] Unfroze layer3 + layer4 + FC (backbone lr=1e-04)
  ...
     6  2-finetune  1.00e-03      0.5903    82.11%     0.6012   81.44%  (52s) *
```

| Column | Meaning |
|---|---|
| `Phase` | `1-freeze` = only the head trains; `2-finetune` = top layers also training |
| `LR(head)` | Current learning rate for the classifier head |
| `Train Loss / Acc` | Average loss and accuracy on the training split |
| `Val Loss / Acc` | Average loss and accuracy on the held-out validation split |
| `(Ns)` | Wall-clock seconds for the epoch |
| `*` | A new best validation accuracy — checkpoint saved automatically |

> **What to look for:** Val Acc should increase steadily. If Val Loss rises while Train Loss falls, the model is overfitting — try reducing `--epochs` or increasing `--val-split`.

---

## 9. How the Script Works

### 9.1 Staged fine-tuning (two phases)

Training proceeds in two phases to protect the pretrained ImageNet features:

- **Phase 1** (epochs 1 → `--freeze-epochs`): The entire ResNet50 backbone is frozen. Only the final classification layer is trained. This lets the head adapt quickly without disturbing low-level features.
- **Phase 2** (remaining epochs): `layer3`, `layer4`, and the head are unfrozen. The backbone uses a lower learning rate (`--lr-backbone`) to fine-tune gently. This is where the model learns cancer-specific texture patterns.

### 9.2 Automatic Mixed Precision (AMP)

On CUDA, the script automatically uses 16-bit floating point (FP16) for forward and backward passes. This roughly halves VRAM usage — allowing a larger batch size — while maintaining full 32-bit accuracy for weight updates. Disable with `--no-amp` if you see NaN losses.

### 9.3 Class imbalance handling

Cancer subtype datasets are typically imbalanced (some subtypes have far more images than others). The script uses two independent safeguards:

- **WeightedRandomSampler** — rare classes are sampled more often per batch so the model sees them equally during training.
- **CrossEntropyLoss with class weights** — each class's contribution to the loss is scaled by its inverse frequency, penalising errors on rare classes more heavily.

### 9.4 Adaptive learning rate (ReduceLROnPlateau)

Instead of decaying the LR on a fixed schedule, the scheduler watches validation loss. If it does not improve for 3 consecutive epochs, the LR is halved automatically. This lets training continue until it genuinely plateaus rather than stopping prematurely.

### 9.5 Medical augmentation

Each training image passes through this pipeline:

| Transform | Purpose |
|---|---|
| Random crop (256 → 224) | Scale invariance |
| Horizontal + vertical flip | Slides have no canonical orientation |
| Random rotation up to 180° | Orientation invariance |
| Elastic deformation | Simulates tissue deformation between samples |
| Color jitter (brightness, contrast, saturation, hue) | Scanner / stain variation |
| Random erasing | Forces the model to use context, not single spots |

Validation images use only resize + centre crop + normalise to give an unbiased accuracy estimate.

---

## 10. Deploy Your New Model

Once training is complete the best checkpoint is saved to `models/` automatically.

| Target trained | File written | Loaded by app at |
|---|---|---|
| `organ` | `models/resnet50_organ_classifier.pth` | App startup |
| `subtype` | `models/resnet50_subtype_classifier_best.pth` | App startup |

**No further action is needed.** The next time the web app starts it will load the new weights automatically. If the app is already running, restart it to pick up the new checkpoint.

To verify the checkpoint loads correctly:

```bash
python - << 'EOF'
import torch
from backend.model_loader import load_resnet50_classifier

ckpt = torch.load("models/resnet50_organ_classifier.pth", map_location="cpu")
print("num_classes :", ckpt["num_classes"])
print("target      :", ckpt["target"])
print("classes     :", list(ckpt.get("organ_to_idx", {}).keys())[:5], "...")
EOF
```

---

## 11. Troubleshooting

### "CUDA out of memory"

Reduce the batch size:

```bash
--batch-size 16     # GTX 1660 Ti, if 32 is too large
--batch-size 32     # Colab T4, if 64 is too large
```

Also ensure no other processes are using the GPU (`nvidia-smi` to check).

---

### "No training samples found"

The dataset folder does not match the expected structure. Check that:

1. `--data-dir` points to the root folder (the one containing `ALL/`, `Brain Cancer/`, etc.)
2. Folder names match exactly — they are case-sensitive
3. Images are at least two levels deep (`organ_folder/subtype_folder/image.jpg`)

---

### "Skipped N folder(s) with no label mapping"

One or more folder names do not match the expected labels. Check the exact names required in [Section 3.3](#33-exact-folder-names-required).

---

### Loss is NaN from epoch 1

Disable AMP (mixed precision) to rule out a numerical stability issue:

```bash
--no-amp
```

If the loss is still NaN, check for corrupt images — though the script pre-validates images at load time, a very small number of edge cases may still produce invalid tensors.

---

### Colab session disconnected mid-training

Every epoch the script writes two checkpoint files:

- **Best checkpoint** (`*_classifier.pth` / `*_best.pth`) — updated only when validation accuracy improves. If `--drive-backup-dir` is set this is copied to Drive **immediately** after each improvement, not just every N epochs.
- **Last-epoch checkpoint** (`*_last.pth`) — overwritten at the end of **every** epoch. If `--drive-backup-dir` is set this is also copied to Drive every `--backup-every` epochs (default: 5).

`--resume` loads the last-epoch file first (exact epoch), then falls back to the best checkpoint. This means it will never silently rewind to epoch 1 just because the session timed out before a new best was reached.

If the local `models/` files were lost but your Drive backup is intact, copy them back before running with `--resume`:

```python
import shutil
# Restore last-epoch checkpoint (preferred — gives exact resume epoch)
shutil.copy("/content/drive/MyDrive/medai-models/resnet50_organ_classifier_last.pth",
            "models/resnet50_organ_classifier_last.pth")
# Also restore best checkpoint (fallback)
shutil.copy("/content/drive/MyDrive/medai-models/resnet50_organ_classifier.pth",
            "models/resnet50_organ_classifier.pth")
```

Then run the training command with `--resume`.

---

### Training is very slow even on GPU

Check that `--device cuda` is set and that AMP is active (the banner line should read `Device : cuda (AMP enabled)`). If you are on Colab and loading data directly from Drive, re-run the unzip step in [Section 6, Step 5](#step-5--copy-and-unzip-the-dataset-to-local-ssd).

---

*Last updated: April 2026 — added `--resume`, `--drive-backup-dir`, `--backup-every`, `--reset-best-acc` flags; last-epoch checkpoint (`*_last.pth`) now saved every epoch; best checkpoint backed up to Drive immediately on improvement*

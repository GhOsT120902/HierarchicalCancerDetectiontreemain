# MedAI Clinical Support — Hierarchical Cancer Inference System

## Overview
A web-based clinical decision support platform for classifying histopathology images into cancer types and subtypes using deep learning (PyTorch ResNet50). The pipeline runs in three hierarchical stages: tissue routing → normality assessment → subtype classification. Includes Grad-CAM explainability, PDF reporting, model accuracy evaluation, and a full user auth system.

## Architecture
- **Backend**: Python `ThreadingHTTPServer` with a custom REST API; also serves the React build as static files
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 SPA, built to `client/dist/`
- **Fallback Frontend**: Legacy vanilla HTML/CSS/JS in `frontend/` (used only if `client/dist/` is absent)
- **Models**: Fine-tuned ResNet50 checkpoints for organ and subtype classification stored as `.pth` files

## Project Structure
```
backend/                  - Python backend (inference, decision engine, API routes)
  inference_engine.py     - HierarchicalCancerInference orchestrator + Grad-CAM
  decision_engine.py      - Confidence thresholds, entropy, override logic
  web_app.py              - HTTP server, all API route handlers
  utils.py                - Class mappings, image preprocessing, constants
  report_generator.py     - Low-level PDF stream builder
  test_decision_support.py - Regression tests for decision logic
client/                   - React + Vite frontend
  src/components/         - All UI components (see below)
  vite.config.js          - Tailwind plugin + /api proxy to :5000
  package.json            - Node dependencies
frontend/                 - Legacy vanilla frontend (fallback)
models/                   - ResNet50 .pth checkpoints
data/                     - Runtime data (users, sessions, history, reports)
  credentials/users.json        - PBKDF2-SHA256 hashed user accounts
  credentials/reset_codes.json  - Password reset tokens (15-min TTL)
  admin_sessions.json           - Admin sessions with TTL (persisted across restarts)
  history/                      - Per-user inference result JSON files
  reports/                      - Generated PDF reports
Test Data/                - Bundled histopathology test images (by organ/subtype)
scripts/                  - Training utilities
  train.py                - ResNet50 fine-tuning script
  TRAINING_GUIDE.md       - Training documentation
evaluate_accuracy.py      - Batch evaluation script with progress callbacks
launch_web_app.py         - App entry point
```

## Key Frontend Components (`client/src/components/`)
| Component | Role |
|---|---|
| `AuthScreen.jsx` | Login / Register / Google OAuth / Forgot-password flow |
| `UploadWorkflow.jsx` | Drag-and-drop upload, test image browser, organ override, submit |
| `DiagnosticResults.jsx` | Renders all 3 pipeline levels + Grad-CAM + confidence bars |
| `ModelAccuracy.jsx` | Admin-only evaluation tab with progress bar + per-class metrics |
| `History.jsx` | Paginated inference history with search and re-open |
| `Reports.jsx` | PDF report management (download / delete) |
| `Dashboard.jsx` | Top-level layout routing between tabs |
| `Sidebar.jsx` | Nav tabs, user info, theme toggle, logout |
| `Header.jsx` | App title bar |
| `GuidedTour.jsx` | Step-by-step onboarding overlay for new users |
| `HeroSection.jsx` | Landing hero shown before first upload |
| `Help.jsx` | In-app documentation panel |
| `Settings.jsx` | User settings (password change, etc.) |

## Running
Workflow "Start application":
```
cd client && npm run build && cd .. && python launch_web_app.py
```
Server listens on `0.0.0.0:5000`. Vite dev mode proxies `/api/*` to `:5000`.

## API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check + model status |
| POST | `/api/predict` | Run inference (base64 image in JSON) |
| POST | `/api/report` | Generate and save PDF report |
| GET | `/api/reports` | List saved reports |
| GET | `/api/report/download` | Download a specific PDF |
| DELETE | `/api/report` | Delete a report |
| GET | `/api/history` | Fetch user inference history |
| DELETE | `/api/history` | Clear history entry |
| GET/POST | `/api/evaluate` | Start / poll batch model evaluation |
| GET | `/api/test-images` | Test data folder tree |
| GET | `/api/test-image?path=` | Serve individual test image |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Validate credentials |
| POST | `/api/auth/forgot-password` | Email password reset code |
| POST | `/api/auth/reset-password` | Apply reset code |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/google-client-id` | OAuth client ID |
| POST | `/api/auth/google` | Verify Google ID token |
| GET | `/api/admin/history` | Admin: all-user history |

## Classification Taxonomy
- **8 organ classes**: ALL (Blood/Leukemia), Brain Cancer, Breast Cancer, Cervical Cancer, Kidney Cancer, Lung & Colon Cancer, Lymphoma, Oral Cancer
- **27 registered subtypes** (model outputs 28 classes; brain_tumor display entry removed): all_benign, all_early, all_pre, all_pro, brain_glioma, brain_healthy, brain_menin, brain_pituitary, breast_benign, breast_malignant, cervix_dyk/koc/mep/pab/sfi, kidney_normal/tumor, colon_aca/bnt, lung_aca/bnt/scc, lymph_cll/fl/mcl, oral_normal/scc

## Inference Pipeline Stages
1. **Step 0 — Modality Validation**: Blur (Laplacian variance), blank (std dev), grayscale channel diff, min resolution checks
2. **Level 1 — Organ Routing**: ResNet50 organ classifier → selects tissue class; low-confidence triggers optional user override
3. **Level 2 — Normality**: Compares top normal subtype vs top abnormal subtype probabilities; entropy-gated
4. **Level 3 — Subtype**: Masked softmax over organ-specific subtypes; Grad-CAM generated for top prediction

## Model Accuracy Evaluation
- Admin-authenticated: session PIN, persisted to `data/admin_sessions.json` (with TTL)
- Upload a ZIP of test images (supports full hierarchy, subtype-at-root, and wrapper layouts; case-insensitive; handles macOS `__MACOSX` folders; up to 4 nesting levels)
- Live progress bar with ETA updated from `/api/evaluate` polling
- Per-class accuracy tables for each of the 3 pipeline levels

## Auth & Security
- Passwords hashed with PBKDF2-SHA256 (100,000 iterations)
- Google OAuth via `google-auth` library (ID token verification)
- Admin sessions stored as JSON with TTL, loaded on server startup
- `RESEND_API_KEY` env secret required for password reset emails
- `GOOGLE_CLIENT_ID` env secret required for Google OAuth

## Dependencies
- `torch`, `torchvision` (CPU-optimized) — model inference
- `Pillow` — image preprocessing
- `numpy` — array ops
- `resend` — transactional email
- `reportlab` — PDF fallback; main PDF uses raw stream commands
- `google-auth` — Google ID token verification

## Environment Variables / Secrets
| Name | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | For password reset | Sends reset code emails |
| `GOOGLE_CLIENT_ID` | For Google OAuth | Verifies ID tokens from the frontend |

## Data Persistence
All runtime data is file-based JSON in `data/`. There is no external database.

## Theme
- Default: dark mode (`dark` class on `<html>`)
- Toggle in sidebar; persisted to `localStorage.medai_theme`
- CSS variables defined in `client/src/index.css`

## Training (`scripts/train.py`)
- `--resume` — resume from best checkpoint
- `--drive-backup-dir <path>` — copy checkpoint to Google Drive (Colab)
- `--backup-every <N>` — Drive backup frequency in epochs (default: 5)
- See `scripts/TRAINING_GUIDE.md` for full usage

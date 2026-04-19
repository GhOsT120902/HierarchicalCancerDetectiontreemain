# MedAI Clinical Support

**A hierarchical cancer imaging classification system powered by deep learning.**

MedAI Clinical Support is a web-based clinical decision support tool that classifies histopathology slide images through a three-stage AI pipeline: tissue type identification → normality assessment → cancer subtype classification. Every prediction includes Grad-CAM attention heatmaps and can be exported as a structured PDF report.

> **Disclaimer**: This tool is intended for research and educational purposes. It is not FDA-cleared and should not be used as the sole basis for clinical decisions.

---

## Features

### Intelligent Inference Pipeline
- **Step 0 — Modality Validation**: Rejects blurry, blank, low-resolution, or non-histopathology images before inference
- **Level 1 — Tissue Routing**: Classifies into one of 8 organ/tissue categories (Blood, Brain, Breast, Cervical, Kidney, Lung & Colon, Lymphatic, Oral)
- **Level 2 — Normality Assessment**: Determines Normal vs Abnormal tissue; suppresses subtype inference for normal tissue
- **Level 3 — Subtype Classification**: Identifies the specific cancer subtype using organ-masked probability ranking across 27 registered subtypes

### Explainable AI
- Grad-CAM heatmaps highlight the image regions the model focused on for each prediction
- Confidence scores and ranked candidates shown for both organ and subtype stages
- Entropy-based uncertainty indicators flag low-confidence results

### Clinical Reporting
- One-click PDF report generation (image + findings + Grad-CAM overlay + disclaimer)
- Full diagnostic history per user with search and re-open
- Admin-level view across all users

### Model Accuracy Evaluation (Admin)
- Upload a ZIP of labeled test images to benchmark the full pipeline
- Supports multiple folder layouts (full hierarchy, subtype-at-root, wrapper nesting)
- Handles macOS `__MACOSX` metadata, case-insensitive matching, up to 4 nesting levels
- Live progress bar with image count, percentage, and estimated time remaining
- Per-class accuracy breakdown for all three pipeline levels

### User Management
- Email/password accounts (PBKDF2-SHA256, 100,000 iterations)
- Google OAuth sign-in
- Password reset via email OTP (6-digit code, 15-minute expiry)
- Admin sessions with PIN authentication, persisted across server restarts

### UX
- Dark mode (default) and light mode, persisted per user
- Guided onboarding tour for new users
- Built-in test data browser with one-click image loading
- Drag-and-drop or file-picker upload

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Lucide React |
| Backend | Python 3.12, `http.server.ThreadingHTTPServer` |
| Inference | PyTorch (CPU), ResNet50 fine-tuned checkpoints |
| Image Processing | Pillow, NumPy |
| PDF Generation | Custom raw PDF stream builder |
| Email | Resend API |
| Auth | PBKDF2-SHA256 + `google-auth` |

---

## Project Structure

```
├── backend/
│   ├── inference_engine.py     # Hierarchical pipeline + Grad-CAM
│   ├── decision_engine.py      # Confidence thresholds and routing logic
│   ├── web_app.py              # HTTP server and all API routes
│   ├── utils.py                # Class mappings, image validation, constants
│   └── report_generator.py    # PDF report builder
├── client/                     # React + Vite SPA
│   ├── src/
│   │   ├── components/         # All UI components
│   │   └── App.jsx             # Root: auth state, routing, theme
│   └── vite.config.js          # Tailwind plugin + /api proxy
├── frontend/                   # Legacy vanilla frontend (fallback)
├── models/                     # ResNet50 .pth checkpoints (not in repo)
├── data/                       # Runtime data (users, history, reports)
├── Test Data/                  # Bundled labeled test images
├── scripts/
│   ├── train.py                # Fine-tuning script
│   └── TRAINING_GUIDE.md       # Training documentation
├── evaluate_accuracy.py        # Batch evaluation with progress callbacks
└── launch_web_app.py           # App entry point
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- `uv` (Python package manager) — or `pip`
- Model checkpoint files (`resnet50_organ_classifier.pth`, `resnet50_subtype_classifier_best.pth`) placed in `models/`

### 1. Install Python dependencies

```bash
uv sync
# or: pip install torch torchvision pillow numpy resend reportlab google-auth
```

### 2. Install Node dependencies and build the frontend

```bash
cd client
npm install
npm run build
cd ..
```

### 3. Set environment variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Transactional email for password reset |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |

```bash
export RESEND_API_KEY=your_key_here
export GOOGLE_CLIENT_ID=your_client_id_here
```

### 4. Start the server

```bash
python launch_web_app.py
```

The app will be available at `http://localhost:5000`.

### Development (with hot reload)

```bash
# Terminal 1 — Python backend
python launch_web_app.py

# Terminal 2 — Vite dev server (proxies /api to :5000)
cd client && npm run dev
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Model status and system health |
| POST | `/api/predict` | User | Run inference (base64 image in JSON body) |
| POST | `/api/report` | User | Generate and save PDF report |
| GET | `/api/reports` | User | List user's reports |
| GET | `/api/report/download?id=` | User | Download a PDF |
| DELETE | `/api/report` | User | Delete a report |
| GET | `/api/history` | User | Fetch inference history |
| DELETE | `/api/history` | User | Delete a history entry |
| GET/POST | `/api/evaluate` | Admin | Start or poll batch evaluation job |
| GET | `/api/test-images` | None | Test data folder tree |
| GET | `/api/test-image?path=` | None | Serve individual test image |
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Authenticate |
| POST | `/api/auth/forgot-password` | None | Send password reset OTP |
| POST | `/api/auth/reset-password` | None | Apply reset code |
| POST | `/api/auth/change-password` | User | Change password |
| GET | `/api/auth/google-client-id` | None | OAuth client ID |
| POST | `/api/auth/google` | None | Verify Google ID token |
| GET | `/api/admin/history` | Admin | All-user history |

### Predict Request

```json
POST /api/predict
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "organ_override": "Brain Cancer"
}
```

### Predict Response (abbreviated)

```json
{
  "ok": true,
  "final_decision": "Brain Glioma",
  "confidence": 0.87,
  "organ_prediction": { "label": "Brain Cancer", "confidence": 0.93 },
  "normality_prediction": { "label": "Abnormal", "confidence": 0.91 },
  "subtype_prediction": { "label": "Brain Glioma", "confidence": 0.87 },
  "gradcam_overlay": "data:image/png;base64,..."
}
```

---

## Classification Taxonomy

### Organ Classes (Level 1)
| Index | Raw Label | Display Name |
|---|---|---|
| 0 | ALL | Blood (Leukemia-related) |
| 1 | Brain Cancer | Brain Tissue |
| 2 | Breast Cancer | Breast Tissue |
| 3 | Cervical Cancer | Cervical Tissue |
| 4 | Kidney Cancer | Kidney Tissue |
| 5 | Lung and Colon Cancer | Lung & Colon Tissue |
| 6 | Lymphoma | Lymphatic System |
| 7 | Oral Cancer | Oral Tissue |

### Subtype Classes (Level 3, selected)
| Organ | Subtypes |
|---|---|
| Blood (ALL) | Benign, Early, Pre-B, Pro-B |
| Brain | Glioma, Healthy, Meningioma, Pituitary Tumor |
| Breast | Benign, Malignant |
| Cervical | Dyskeratotic, Koilocytotic, Metaplastic, Parabasal, Superficial-Intermediate |
| Kidney | Normal, Tumor |
| Lung & Colon | Lung ACA, Lung Benign, Lung SCC, Colon ACA, Colon Benign |
| Lymphoma | CLL, Follicular, Mantle Cell |
| Oral | Normal, Squamous Cell Carcinoma |

---

## Training

The models were fine-tuned on publicly available histopathology datasets. The training script supports checkpointing, resumption, and Google Drive backup for Colab environments.

```bash
# Initial training
python scripts/train.py --target organ

# Resume from best checkpoint
python scripts/train.py --target organ --resume

# With Google Drive backup (Colab)
python scripts/train.py --target organ --drive-backup-dir /content/drive/MyDrive/models --backup-every 5
```

See [`scripts/TRAINING_GUIDE.md`](scripts/TRAINING_GUIDE.md) for full documentation.

---

## Model Evaluation

To benchmark the pipeline against a labeled test set:

1. Log in as admin in the app
2. Navigate to the **Model Accuracy** tab
3. Upload a ZIP containing labeled images in any of these layouts:

```
# Full hierarchy
Brain Cancer/brain_glioma/image001.jpg

# Subtype at root
brain_glioma/image001.jpg

# Wrapper with subtypes
dataset/Brain Cancer/brain_glioma/image001.jpg
```

4. Monitor the live progress bar and review the per-class accuracy tables when complete.

---

## Deployment

The app is designed to run on any Linux environment with Python 3.12+ and Node.js 18+. For production:

- Replace the file-based JSON storage with SQLite or PostgreSQL for multi-user scale
- Use a GPU-enabled host for significantly faster inference
- Place the app behind a reverse proxy (nginx/caddy) with TLS termination
- Set `RESEND_API_KEY` and `GOOGLE_CLIENT_ID` as environment secrets

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

Please keep PRs focused on a single concern and include a brief description of what changed and why.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Model weights are not included in this repository and must be obtained separately. The included test images are sourced from publicly available research datasets and are used for demonstration purposes only.

# Hierarchical Cancer Inference System

## Overview
A web-based platform for classifying histopathology images into cancer types and subtypes using deep learning (PyTorch ResNet50 models). Users can upload histopathology images and receive hierarchical predictions: first the organ/tissue type, then the specific cancer subtype.

## Architecture
- **Backend**: Python HTTP server (`http.server.ThreadingHTTPServer`) with REST API endpoints
- **Frontend**: React + Vite + Tailwind CSS + Lucide React SPA, built to `client/dist/` and served by the Python backend
- **Models**: Pre-trained ResNet50 checkpoints for organ and subtype classification

## Project Structure
```
backend/         - Python backend logic (inference, models, API)
client/          - React + Vite frontend (source in client/src/, built to client/dist/)
frontend/        - Legacy vanilla HTML/CSS/JS (fallback if client/dist/ does not exist)
models/          - Pre-trained ResNet50 .pth model weights
launch_web_app.py - Entry point
```

## Key Files
- `launch_web_app.py` - App entry point
- `backend/web_app.py` - HTTP server and API routes; serves `client/dist/` (or `frontend/` as fallback) for non-API routes
- `backend/inference_engine.py` - Main inference class
- `backend/utils.py` - Image processing, class mappings, constants
- `client/src/App.jsx` - React app entry point (auth state, theme)
- `client/src/components/` - React components (Sidebar, Header, HeroSection, UploadWorkflow, DiagnosticResults, AuthScreen, Dashboard)
- `client/vite.config.js` - Vite config with Tailwind plugin and API proxy
- `client/package.json` - Node.js dependencies

## Running
The app runs on `0.0.0.0:5000` via workflow "Start application":
```
cd client && npm run build && cd .. && python launch_web_app.py
```
The workflow builds the React app first, then starts the Python server which serves the built files.

## API Endpoints
- `GET /api/health` - Health check and model status
- `POST /api/predict` - Submit image for classification (base64 data URL encoded)
- `POST /api/report` - Generate PDF report from prediction result
- `GET/POST /api/evaluate` - Run/poll model accuracy evaluation
- `GET /api/test-images` - List test data folder structure
- `GET /api/test-image?path=` - Serve individual test image
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Validate credentials
- `POST /api/auth/forgot-password` - Generate + email reset code
- `POST /api/auth/reset-password` - Apply reset code and set new password
- `POST /api/auth/change-password` - Change password (requires current password)
- `GET /api/auth/google-client-id` - Get Google OAuth client ID
- `POST /api/auth/google` - Verify Google ID token

## React Frontend Tech Stack
- React 18 + Vite 8 (build tool)
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Lucide React (icons)
- CSS variables for dark/light theme switching

## Dark/Light Mode
- Default: dark mode (adds `dark` class to `<html>` element)
- Toggle via sidebar button; persisted in `localStorage.medai_theme`
- CSS variables defined in `client/src/index.css` under `.dark` and root

## Dependencies
- `torch`, `torchvision` - Deep learning
- `Pillow` - Image processing
- `numpy` - Numerical computation
- `resend` - Transactional email (password reset codes)
- `reportlab` - PDF report generation

## Credentials / Auth
- User accounts stored in `data/credentials/users.json` (PBKDF2-SHA256 hashed passwords)
- Reset codes stored in `data/credentials/reset_codes.json` (15-minute expiry)
- `RESEND_API_KEY` secret required for password reset emails
- Auth state stored in localStorage: `medai_logged_in`, `medai_user_email`

## Features
- Hierarchical cancer classification (8 organs, 28 subtypes)
- Image validation (blur, blank, grayscale, resolution checks)
- Manual organ override support
- Grad-CAM visualizations
- PDF report generation (browser download)
- Model accuracy evaluation tab (from old frontend - not yet ported to React)
- Real user authentication (register, login, forgot password via email)
- Dark/light theme UI
- Responsive on desktop and tablet

## Training Script (`scripts/train.py`)
- `--resume` — resumes training from the best saved checkpoint (restores model, optimizer, scheduler, and epoch)
- `--drive-backup-dir <path>` — automatically copies the best checkpoint to a Google Drive folder during training (Colab)
- `--backup-every <N>` — controls how often (in epochs) the Drive backup runs (default: 5)
- See `scripts/TRAINING_GUIDE.md` for full usage

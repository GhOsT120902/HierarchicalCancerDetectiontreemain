# Hierarchical Cancer Inference System

## Overview
A web-based platform for classifying histopathology images into cancer types and subtypes using deep learning (PyTorch ResNet50 models). Users can upload histopathology images and receive hierarchical predictions: first the organ/tissue type, then the specific cancer subtype.

## Architecture
- **Backend**: Python HTTP server (`http.server.ThreadingHTTPServer`) with REST API endpoints
- **Frontend**: Vanilla HTML/CSS/JavaScript static files served by the backend
- **Models**: Pre-trained ResNet50 checkpoints for organ and subtype classification

## Project Structure
```
backend/         - Python backend logic (inference, models, API)
frontend/        - HTML/CSS/JS frontend
models/          - Pre-trained ResNet50 .pth model weights
launch_web_app.py - Entry point
```

## Key Files
- `launch_web_app.py` - App entry point
- `backend/web_app.py` - HTTP server and API routes
- `backend/inference_engine.py` - Main inference class
- `backend/utils.py` - Image processing, class mappings, constants
- `frontend/index.html` - Main UI
- `frontend/app.js` - Frontend logic
- `frontend/styles.css` - Styling (dark/light mode)

## Running
The app runs on `0.0.0.0:5000` via workflow "Start application":
```
python launch_web_app.py
```

## API Endpoints
- `GET /api/health` - Health check and model status
- `POST /api/predict` - Submit image for classification (base64 encoded)
- `POST /api/report` - Generate PDF report from prediction result
- `GET/POST /api/evaluate` - Run/poll model accuracy evaluation
- `GET /api/test-images` - List test data folder structure
- `GET /api/test-image?path=` - Serve individual test image
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Validate credentials
- `POST /api/auth/forgot-password` - Generate + email reset code
- `POST /api/auth/reset-password` - Apply reset code and set new password
- `POST /api/auth/change-password` - Change password (requires current password)

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
- Emails sent from `accounts@med-scan.app` (domain verified in Resend)
- NOTE: If email fails (domain not verified, key invalid), check `backend/mailer.py` `FROM_ADDRESS`

## Features
- Hierarchical cancer classification (8 organs, 28 subtypes)
- Image validation (blur, blank, grayscale, resolution checks)
- Manual organ override support
- Grad-CAM visualizations
- PDF report generation (browser download)
- Test data browser (browse/select from Test Data folder on dashboard)
- Model accuracy evaluation tab with per-class metrics
- Real user authentication (register, login, forgot password via email, change password)
- Profile avatar (top-right header) with dropdown: shows user initials, links to History, Settings, and sign-out
- History tab: past analyses stored in localStorage per user (up to 50 entries), image thumbnails, re-downloadable reports
- Settings tab: change-password form with current/new/confirm fields + show/hide toggles
- Dark/light theme UI

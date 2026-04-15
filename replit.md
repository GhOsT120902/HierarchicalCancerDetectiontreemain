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
- `POST /api/report` - Generate text report from prediction result

## Dependencies
- `torch`, `torchvision` - Deep learning
- `Pillow` - Image processing
- `numpy` - Numerical computation

## Features
- Hierarchical cancer classification (8 organs, 28 subtypes)
- Image validation (blur, blank, grayscale, resolution checks)
- Manual organ override support
- Grad-CAM visualizations
- Report generation
- Dark/light theme UI

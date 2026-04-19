# Product Requirements Document
## MedAI Clinical Support — Hierarchical Cancer Imaging Classification System

**Version**: 1.0  
**Date**: April 2026  
**Status**: Active Development

---

## 1. Executive Summary

MedAI Clinical Support is a web-based AI-assisted diagnostic tool that classifies histopathology slide images into cancer types and subtypes using a three-stage hierarchical deep learning pipeline. The system is designed to assist trained clinicians—not replace them—by surfacing probabilistic predictions, attention heatmaps (Grad-CAM), and structured PDF reports for inclusion in clinical workflows.

---

## 2. Problem Statement

Manual review of histopathology slides is:
- **Time-intensive**: Expert pathologists spend significant time on routine tissue classification
- **Subjective**: Inter-observer variability exists, particularly for rare subtypes
- **Bottlenecked**: Specialist availability is limited in under-resourced settings

A reliable second-opinion system that routes images through a structured hierarchy (tissue type → normal/abnormal → cancer subtype) can accelerate triage and reduce diagnostic error rates.

---

## 3. Goals

| Goal | Success Metric |
|---|---|
| Accurate tissue routing | Level 1 (organ) accuracy ≥ 90% on held-out test set |
| Accurate subtype classification | Level 3 (subtype) accuracy ≥ 80% on abnormal cases |
| Clinical explainability | Grad-CAM overlay available for every positive prediction |
| System reliability | Zero crashes on valid histopathology inputs |
| Admin accountability | Full evaluation audit trail with per-class breakdown |
| Onboarding speed | New user completes guided tour in under 3 minutes |

---

## 4. User Personas

### 4.1 Clinical Researcher / Pathologist
- Uploads patient slide images for AI-assisted second opinion
- Reviews confidence scores, Grad-CAM overlays, and ranked candidates
- Exports PDF reports for inclusion in patient files
- **Key needs**: Speed, accuracy, explainability, trust indicators

### 4.2 Hospital Administrator / Lab Manager
- Monitors model performance on institutional datasets
- Runs batch evaluation jobs against curated test sets
- **Key needs**: Accuracy metrics, per-class breakdowns, progress visibility

### 4.3 System Administrator
- Manages user accounts and access
- Audits system-wide diagnostic history
- **Key needs**: Admin auth, all-user history view, model status dashboard

### 4.4 New Clinical User (Onboarding)
- Unfamiliar with the system
- Needs contextual guidance to understand each pipeline stage
- **Key needs**: Guided tour, test data browser, clear UI hierarchy

---

## 5. Functional Requirements

### 5.1 Image Intake & Validation (Step 0)
- **FR-01**: Accept JPEG, PNG, BMP, TIFF, and WebP uploads via drag-and-drop or file picker
- **FR-02**: Reject blurry images (Laplacian variance below threshold)
- **FR-03**: Reject blank/empty images (pixel std deviation below threshold)
- **FR-04**: Reject non-histopathology images (grayscale channel difference below threshold)
- **FR-05**: Reject images below minimum resolution
- **FR-06**: Display a clear, actionable rejection reason to the user

### 5.2 Hierarchical Inference Pipeline
- **FR-07**: Level 1 — classify tissue into one of 8 organ categories using ResNet50
- **FR-08**: Level 2 — classify as Normal or Abnormal; suppress Level 3 if Normal
- **FR-09**: Level 3 — classify abnormal tissue into a specific cancer subtype using organ-masked softmax
- **FR-10**: Display top-2 organ candidates and top-3 subtype candidates with confidence percentages
- **FR-11**: Display overall pipeline decision with confidence gap and uncertainty indicators
- **FR-12**: Allow manual organ override when Level 1 confidence is low or Step 0 is uncertain

### 5.3 Explainability (Grad-CAM)
- **FR-13**: Generate a Grad-CAM attention heatmap for the Level 3 subtype prediction
- **FR-14**: Overlay the heatmap on the original image with configurable opacity
- **FR-15**: Display the heatmap alongside the result in the diagnostic panel

### 5.4 Reporting
- **FR-16**: Generate a multi-page PDF report from any diagnostic result
- **FR-17**: Report must include: patient image, pipeline outcomes, confidence scores, Grad-CAM overlay, and disclaimer
- **FR-18**: Reports saved to `data/reports/` and listed in the Reports tab
- **FR-19**: User can download or delete their own reports

### 5.5 History
- **FR-20**: Every prediction is saved to `data/history/` and shown in the History tab
- **FR-21**: History is paginated and searchable
- **FR-22**: User can re-open a historical result (rendering the full diagnostic view)
- **FR-23**: Admin can view system-wide history across all users

### 5.6 Model Accuracy Evaluation
- **FR-24**: Admin-only access, gated by a session PIN persisted across server restarts
- **FR-25**: Accept ZIP uploads containing labeled test images (multiple folder structure layouts supported)
- **FR-26**: Auto-detect ZIP layout: full hierarchy, subtype-at-root, and wrapper-with-subtypes
- **FR-27**: Handle macOS `__MACOSX` metadata folders and up to 4 nesting levels
- **FR-28**: Case-insensitive matching of organ and subtype folder names
- **FR-29**: Show live progress bar with image count, percentage, and estimated time remaining
- **FR-30**: Produce per-class accuracy tables for Levels 1, 2, and 3

### 5.7 Authentication
- **FR-31**: Email/password registration with server-side PBKDF2-SHA256 hashing
- **FR-32**: Login with persistent auth state in localStorage
- **FR-33**: Forgot-password flow via email OTP (6-digit code, 15-minute TTL) using Resend API
- **FR-34**: Google OAuth sign-in via ID token verification
- **FR-35**: Password change while logged in (requires current password)

### 5.8 Test Data Browser
- **FR-36**: Display bundled test images organized by organ and subtype
- **FR-37**: One-click load of any test image into the upload pipeline

### 5.9 Guided Tour
- **FR-38**: Step-by-step overlay highlighting each section of the UI
- **FR-39**: Skippable at any step; accessible from the Help menu

### 5.10 Theme
- **FR-40**: Dark mode (default) and light mode toggle
- **FR-41**: Theme preference persisted in localStorage

---

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Response time for single image inference | < 10 seconds (CPU) |
| NFR-02 | Concurrent users supported | ≥ 5 (ThreadingHTTPServer) |
| NFR-03 | PDF report generation time | < 5 seconds |
| NFR-04 | Model checkpoint load time | < 30 seconds on cold start |
| NFR-05 | Frontend bundle size | < 2 MB gzipped |
| NFR-06 | Browser support | Chrome 110+, Firefox 110+, Edge 110+ |
| NFR-07 | Accessibility | WCAG 2.1 AA for core diagnostic workflow |

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React SPA (client/)                │
│   AuthScreen → Dashboard → UploadWorkflow           │
│                          → DiagnosticResults        │
│                          → ModelAccuracy (admin)    │
│                          → History / Reports        │
└──────────────────────┬──────────────────────────────┘
                       │  JSON REST API (HTTP)
┌──────────────────────▼──────────────────────────────┐
│               Python Backend (web_app.py)           │
│   ThreadingHTTPServer on 0.0.0.0:5000               │
│   ┌──────────────────────────────────────────────┐  │
│   │  HierarchicalCancerInference                 │  │
│   │   Step 0: Image validation                   │  │
│   │   Level 1: Organ ResNet50 (organ.pth)        │  │
│   │   Level 2: Normality decision                │  │
│   │   Level 3: Subtype ResNet50 (subtype.pth)    │  │
│   │   Grad-CAM generator                         │  │
│   └──────────────────────────────────────────────┘  │
│   ┌──────────────────────────────────────────────┐  │
│   │  DecisionEngine — confidence/entropy logic   │  │
│   └──────────────────────────────────────────────┘  │
│   ┌──────────────────────────────────────────────┐  │
│   │  ReportGenerator — PDF stream builder        │  │
│   └──────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               File System (data/)                   │
│   users.json  sessions.json  history/  reports/     │
└─────────────────────────────────────────────────────┘
```

---

## 8. Data Requirements

| Data Store | Format | Location | Notes |
|---|---|---|---|
| User accounts | JSON | `data/credentials/users.json` | PBKDF2-SHA256 hashed passwords |
| Reset codes | JSON | `data/credentials/reset_codes.json` | 15-min TTL |
| Admin sessions | JSON | `data/admin_sessions.json` | Persisted across restarts; TTL-based |
| Inference history | JSON | `data/history/<user_email>/` | One file per result |
| PDF reports | Binary | `data/reports/<user_email>/` | Generated on demand |
| Test images | Files | `Test Data/` | Bundled with repo; read-only at runtime |
| Model weights | `.pth` | `models/` | Not committed to repo; must be provided |

---

## 9. Security Considerations

- Passwords never stored in plaintext; PBKDF2-SHA256 with 100,000 iterations
- Google ID tokens verified server-side via `google-auth` library before session creation
- Path traversal protection on all file-serving endpoints (`relative_to()` guard)
- Admin sessions require a shared PIN and expire via TTL
- No external database; attack surface limited to the filesystem
- `RESEND_API_KEY` and `GOOGLE_CLIENT_ID` stored as environment secrets (not hardcoded)

---

## 10. Out of Scope (v1.0)

- DICOM / whole-slide image (WSI) support
- Real-time video frame classification
- FHIR / HL7 EHR integration
- Multi-tenant data isolation (all users share one server instance)
- GPU inference (CPU-only target for Replit deployment)
- Automated retraining pipelines (training is a separate offline process)
- Regulatory / FDA clearance pathway (tool is research/educational use only)

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Model overfits to training distribution | Medium | High | Evaluate on diverse external test sets |
| False negatives for rare subtypes | Medium | High | Display uncertainty score and override option |
| CPU inference too slow for clinical use | Low | Medium | Serve from GPU-enabled host for production |
| File-based storage not scalable | High | Medium | Migrate to SQLite or PostgreSQL for >10 concurrent users |
| User uploads non-medical images | High | Low | Step 0 modality validation rejects invalid inputs |

---

## 12. Future Roadmap

| Priority | Feature |
|---|---|
| P1 | SQLite-backed persistence to replace JSON file storage |
| P1 | GPU inference support for production deployments |
| P2 | DICOM file format support |
| P2 | Per-subtype confidence calibration |
| P3 | FHIR export of diagnostic findings |
| P3 | Multi-institution admin hierarchy |
| P3 | Automated model retraining pipeline |

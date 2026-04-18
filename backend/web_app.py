from __future__ import annotations

import argparse
import base64
import json
import shutil
import tempfile
import threading
import zipfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import mimetypes
from urllib.parse import parse_qs, unquote, urlparse

from .auth import change_password, create_reset_code, register_user, reset_password, verify_google_token, verify_login
from .history import add_entry, bulk_import, clear_history, delete_entry, load_history
from .inference_engine import HierarchicalCancerInference
from .report_generator import build_pdf_bytes
from .utils import (
    DEFAULT_BLANK_STD_THRESHOLD,
    DEFAULT_BLUR_THRESHOLD,
    DEFAULT_ENTROPY_THRESHOLD,
    DEFAULT_GRAYSCALE_CHANNEL_DIFF_THRESHOLD,
    DEFAULT_ORGAN_CHECKPOINT,
    DEFAULT_SUBTYPE_CHECKPOINT,
    DEFAULT_TEMPERATURE,
    configure_logging,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / 'frontend'
TEST_DATA_DIR = PROJECT_ROOT / 'Test Data' / 'Test Data'
_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}


def _run_evaluation(server: 'InferenceHTTPServer') -> None:
    import logging
    logger = logging.getLogger('hierarchical_inference')

    def log(msg: str) -> None:
        with server._eval_lock:
            server._eval_log.append(msg)

    temp_dir_to_clean: str | None = None
    try:
        from evaluate_accuracy import collect_image_paths, evaluate, compute_metrics, DEFAULT_TEST_DATA_DIR
        organ_filter = server._eval_organ_filter

        with server._eval_lock:
            custom_dir = server._eval_custom_dir
            temp_dir_to_clean = server._eval_temp_dir

        if custom_dir is not None:
            test_data_dir = custom_dir
            scope_label = f'custom dataset'
            if organ_filter:
                scope_label += f' / organ "{organ_filter}"'
        else:
            test_data_dir = DEFAULT_TEST_DATA_DIR
            scope_label = f'organ "{organ_filter}"' if organ_filter else 'all organs'

        log(f'Loading test images ({scope_label})...')
        entries = collect_image_paths(test_data_dir, logger=logger, organ_filter=organ_filter or None)
        log(f'Found {len(entries)} images. Running inference (this may take several minutes)...')

        original_gradcam = server.engine._generate_gradcam
        server.engine._generate_gradcam = lambda *a, **kw: None
        try:
            raw_results = evaluate(server.engine, entries, logger)
        finally:
            server.engine._generate_gradcam = original_gradcam

        log('Computing metrics...')
        metrics = compute_metrics(raw_results)
        with server._eval_lock:
            server._eval_status = 'done'
            server._eval_metrics = metrics
            server._eval_log.append('Evaluation complete.')
    except Exception as exc:
        logger.error('Evaluation failed: %s', exc, exc_info=True)
        with server._eval_lock:
            server._eval_status = 'error'
            server._eval_error = str(exc)
            server._eval_log.append(f'Error: {exc}')
    finally:
        if temp_dir_to_clean:
            try:
                shutil.rmtree(temp_dir_to_clean, ignore_errors=True)
            except Exception:
                pass
            with server._eval_lock:
                server._eval_temp_dir = None
                server._eval_custom_dir = None


class InferenceHTTPServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], handler_class: type[BaseHTTPRequestHandler], engine: HierarchicalCancerInference) -> None:
        super().__init__(server_address, handler_class)
        self.engine = engine
        self.frontend_dir = FRONTEND_DIR
        self._eval_status = 'idle'
        self._eval_metrics = None
        self._eval_error = None
        self._eval_log: list[str] = []
        self._eval_lock = threading.Lock()
        self._eval_organ_filter: str | None = None
        self._eval_custom_dir: Path | None = None
        self._eval_temp_dir: str | None = None


class InferenceRequestHandler(BaseHTTPRequestHandler):
    server: InferenceHTTPServer

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == '/api/health':
            self._send_json({'ok': True, 'model_status': self.server.engine.get_model_status()})
            return
        if parsed.path == '/api/evaluate':
            self._handle_evaluate_get()
            return
        if parsed.path == '/api/history':
            self._handle_history_get()
            return
        if parsed.path == '/api/test-images':
            self._handle_test_images()
            return
        if parsed.path == '/api/test-image':
            self._handle_test_image(parsed.query)
            return
        if parsed.path == '/api/auth/google-client-id':
            self._handle_google_client_id()
            return
        if parsed.path in {'/', '/index.html'}:
            self._serve_file(self.server.frontend_dir / 'index.html', 'text/html; charset=utf-8')
            return
        if parsed.path == '/styles.css':
            self._serve_file(self.server.frontend_dir / 'styles.css', 'text/css; charset=utf-8')
            return
        if parsed.path == '/app.js':
            self._serve_file(self.server.frontend_dir / 'app.js', 'application/javascript; charset=utf-8')
            return
        self._send_json({'ok': False, 'error': 'Not found'}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == '/api/predict':
            self._handle_predict()
            return
        if parsed.path == '/api/report':
            self._handle_report()
            return
        if parsed.path == '/api/evaluate':
            self._handle_evaluate_post()
            return
        if parsed.path == '/api/evaluate/upload':
            self._handle_evaluate_upload()
            return
        if parsed.path == '/api/history':
            self._handle_history_post()
            return
        if parsed.path == '/api/history/delete':
            self._handle_history_delete()
            return
        if parsed.path == '/api/history/clear':
            self._handle_history_clear()
            return
        if parsed.path == '/api/history/bulk':
            self._handle_history_bulk()
            return
        if parsed.path == '/api/auth/register':
            self._handle_auth_register()
            return
        if parsed.path == '/api/auth/login':
            self._handle_auth_login()
            return
        if parsed.path == '/api/auth/forgot-password':
            self._handle_auth_forgot()
            return
        if parsed.path == '/api/auth/reset-password':
            self._handle_auth_reset()
            return
        if parsed.path == '/api/auth/change-password':
            self._handle_auth_change_password()
            return
        if parsed.path == '/api/auth/google':
            self._handle_auth_google()
            return
        self._send_json({'ok': False, 'error': 'Not found'}, status=HTTPStatus.NOT_FOUND)

    def _handle_predict(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        image_data = payload.get('image_data')
        if not image_data:
            self._send_json({'ok': False, 'error': 'image_data is required.'}, status=HTTPStatus.BAD_REQUEST)
            return

        if isinstance(image_data, str) and image_data.startswith('data:'):
            image_data = image_data.split(',', 1)[1]

        try:
            image_bytes = base64.b64decode(image_data, validate=True)
        except Exception:
            self._send_json({'ok': False, 'error': 'Uploaded image could not be decoded.'}, status=HTTPStatus.BAD_REQUEST)
            return

        filename = payload.get('filename') or 'upload'
        manual_override = bool(payload.get('manual_override', False))
        organ_override = payload.get('organ_override') or None
        prediction = self.server.engine.predict_bytes(
            image_bytes=image_bytes,
            source_name=str(filename),
            manual_override=manual_override,
            organ_override=organ_override,
        )
        self._send_json({'ok': True, 'result': prediction})

    def _handle_report(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        result = payload.get('result')
        if not isinstance(result, dict):
            self._send_json({'ok': False, 'error': 'result payload is required.'}, status=HTTPStatus.BAD_REQUEST)
            return

        image_bytes = None
        image_data = payload.get('image_data')
        if image_data:
            if isinstance(image_data, str) and image_data.startswith('data:'):
                image_data = image_data.split(',', 1)[1]
            try:
                image_bytes = base64.b64decode(image_data, validate=True)
            except Exception:
                self._send_json({'ok': False, 'error': 'Report image could not be decoded.'}, status=HTTPStatus.BAD_REQUEST)
                return

        from datetime import datetime
        filename = str(payload.get('filename') or 'upload')
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        safe_stem = Path(filename).stem or 'upload'
        download_name = f'{safe_stem}_report_{timestamp}.pdf'
        try:
            pdf = build_pdf_bytes(result=result, image_name=filename, image_bytes=image_bytes)
        except Exception as exc:
            import logging
            logging.getLogger('hierarchical_inference').error('Report generation error for %s: %s', filename, exc, exc_info=True)
            self._send_json({'ok': False, 'error': 'Report generation failed. Please try again.'}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return
        self._send_pdf(pdf, download_name)

    def _handle_auth_register(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        email = str(body.get('email', ''))
        password = str(body.get('password', ''))
        ok, error = register_user(email, password)
        self._send_json({'ok': ok, 'error': error})

    def _handle_auth_login(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        email = str(body.get('email', ''))
        password = str(body.get('password', ''))
        ok, error = verify_login(email, password)
        self._send_json({'ok': ok, 'error': error})

    def _handle_auth_forgot(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        email = str(body.get('email', ''))
        ok, _code, error = create_reset_code(email)
        self._send_json({'ok': ok, 'error': error})

    def _handle_auth_change_password(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        email = str(body.get('email', ''))
        current = str(body.get('current_password', ''))
        new_pw = str(body.get('new_password', ''))
        ok, error = change_password(email, current, new_pw)
        self._send_json({'ok': ok, 'error': error})

    def _handle_auth_reset(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        email = str(body.get('email', ''))
        code = str(body.get('code', ''))
        new_password = str(body.get('new_password', ''))
        ok, error = reset_password(email, code, new_password)
        self._send_json({'ok': ok, 'error': error})

    def _handle_google_client_id(self) -> None:
        import os
        client_id = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
        if not client_id:
            self._send_json({'ok': False, 'error': 'Google login is not configured.'}, status=HTTPStatus.SERVICE_UNAVAILABLE)
            return
        self._send_json({'ok': True, 'client_id': client_id})

    def _handle_auth_google(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        id_token = str(body.get('id_token', ''))
        if not id_token:
            self._send_json({'ok': False, 'error': 'id_token is required.'}, status=HTTPStatus.BAD_REQUEST)
            return
        ok, email, error = verify_google_token(id_token)
        if not ok:
            self._send_json({'ok': False, 'error': error}, status=HTTPStatus.UNAUTHORIZED)
            return
        self._send_json({'ok': True, 'email': email})

    def _handle_test_images(self) -> None:
        organs: dict[str, dict] = {}
        if TEST_DATA_DIR.is_dir():
            for organ_dir in sorted(TEST_DATA_DIR.iterdir()):
                if not organ_dir.is_dir():
                    continue
                subtypes: dict[str, list[str]] = {}
                for sub_dir in sorted(organ_dir.iterdir()):
                    if not sub_dir.is_dir():
                        continue
                    files = sorted(
                        f.name for f in sub_dir.iterdir()
                        if f.is_file() and f.suffix.lower() in _IMAGE_EXTS
                    )
                    if files:
                        subtypes[sub_dir.name] = files
                if subtypes:
                    organs[organ_dir.name] = {'subtypes': subtypes}
        self._send_json({'ok': True, 'organs': organs})

    def _handle_test_image(self, query_string: str) -> None:
        params = parse_qs(query_string or '')
        path_parts = params.get('path', [''])
        rel = unquote(path_parts[0]).lstrip('/').replace('..', '')
        img_path = (TEST_DATA_DIR / rel).resolve()
        try:
            img_path.relative_to(TEST_DATA_DIR.resolve())
        except ValueError:
            self._send_json({'ok': False, 'error': 'Invalid path'}, status=HTTPStatus.BAD_REQUEST)
            return
        if not img_path.is_file() or img_path.suffix.lower() not in _IMAGE_EXTS:
            self._send_json({'ok': False, 'error': 'Not found'}, status=HTTPStatus.NOT_FOUND)
            return
        mime = mimetypes.guess_type(img_path.name)[0] or 'application/octet-stream'
        data = img_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'public, max-age=3600')
        self.end_headers()
        self.wfile.write(data)

    def _handle_evaluate_get(self) -> None:
        with self.server._eval_lock:
            self._send_json({
                'ok': True,
                'status': self.server._eval_status,
                'metrics': self.server._eval_metrics,
                'error': self.server._eval_error,
                'log': self.server._eval_log[-80:],
                'organ_filter': self.server._eval_organ_filter,
            })

    def _handle_evaluate_post(self) -> None:
        try:
            body = self._read_json_body()
        except ValueError:
            body = {}
        organ_filter: str | None = body.get('organ_filter') or None
        with self.server._eval_lock:
            if self.server._eval_status == 'running':
                self._send_json({'ok': False, 'error': 'Evaluation is already running.'})
                return
            self.server._eval_status = 'running'
            self.server._eval_metrics = None
            self.server._eval_error = None
            self.server._eval_organ_filter = organ_filter
            scope_label = f'"{organ_filter}"' if organ_filter else 'all organs'
            self.server._eval_log = [f'Starting evaluation ({scope_label})...']
        thread = threading.Thread(target=_run_evaluation, args=(self.server,), daemon=True)
        thread.start()
        self._send_json({'ok': True, 'status': 'running'})

    def _handle_evaluate_upload(self) -> None:
        with self.server._eval_lock:
            if self.server._eval_status == 'running':
                self._send_json({'ok': False, 'error': 'Evaluation is already running.'})
                return

        content_length = self.headers.get('Content-Length')
        if not content_length:
            self._send_json({'ok': False, 'error': 'No file data received.'}, status=HTTPStatus.BAD_REQUEST)
            return
        try:
            length = int(content_length)
        except ValueError:
            self._send_json({'ok': False, 'error': 'Invalid Content-Length.'}, status=HTTPStatus.BAD_REQUEST)
            return
        if length > 500 * 1024 * 1024:
            self._send_json({'ok': False, 'error': 'File too large (max 500 MB).'}, status=HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        zip_bytes = self.rfile.read(length)

        if not zipfile.is_zipfile(__import__('io').BytesIO(zip_bytes)):
            self._send_json({'ok': False, 'error': 'Uploaded file is not a valid ZIP archive.'}, status=HTTPStatus.BAD_REQUEST)
            return

        temp_dir = tempfile.mkdtemp(prefix='medai_eval_')
        try:
            with zipfile.ZipFile(__import__('io').BytesIO(zip_bytes)) as zf:
                zf.extractall(temp_dir)
        except zipfile.BadZipFile as exc:
            shutil.rmtree(temp_dir, ignore_errors=True)
            self._send_json({'ok': False, 'error': f'Could not extract ZIP: {exc}'}, status=HTTPStatus.BAD_REQUEST)
            return

        extracted_root = Path(temp_dir)
        subdirs = [d for d in extracted_root.iterdir() if d.is_dir()]
        if len(subdirs) == 1:
            candidate = subdirs[0]
            inner = [d for d in candidate.iterdir() if d.is_dir()]
            if inner:
                extracted_root = candidate

        organ_filter_raw = self.headers.get('X-Organ-Filter') or None
        organ_filter: str | None = organ_filter_raw.strip() if organ_filter_raw and organ_filter_raw.strip() else None

        with self.server._eval_lock:
            if self.server._eval_status == 'running':
                shutil.rmtree(temp_dir, ignore_errors=True)
                self._send_json({'ok': False, 'error': 'Evaluation is already running.'})
                return
            self.server._eval_status = 'running'
            self.server._eval_metrics = None
            self.server._eval_error = None
            self.server._eval_organ_filter = organ_filter
            self.server._eval_custom_dir = extracted_root
            self.server._eval_temp_dir = temp_dir
            self.server._eval_log = ['Starting evaluation on uploaded dataset...']

        thread = threading.Thread(target=_run_evaluation, args=(self.server,), daemon=True)
        thread.start()
        self._send_json({'ok': True, 'status': 'running'})

    def _get_user_email(self) -> str | None:
        email = (self.headers.get('X-User-Email') or '').strip().lower()
        return email if email and '@' in email else None

    def _handle_history_get(self) -> None:
        email = self._get_user_email()
        if not email:
            self._send_json({'ok': False, 'error': 'Not authenticated.'}, status=HTTPStatus.UNAUTHORIZED)
            return
        entries = load_history(email)
        self._send_json({'ok': True, 'entries': entries})

    def _handle_history_post(self) -> None:
        email = self._get_user_email()
        if not email:
            self._send_json({'ok': False, 'error': 'Not authenticated.'}, status=HTTPStatus.UNAUTHORIZED)
            return
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        entry = body.get('entry')
        if not isinstance(entry, dict) or not entry.get('id'):
            self._send_json({'ok': False, 'error': 'Invalid entry.'}, status=HTTPStatus.BAD_REQUEST)
            return
        add_entry(email, entry)
        self._send_json({'ok': True})

    def _handle_history_delete(self) -> None:
        email = self._get_user_email()
        if not email:
            self._send_json({'ok': False, 'error': 'Not authenticated.'}, status=HTTPStatus.UNAUTHORIZED)
            return
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        entry_id = body.get('id') or ''
        if not entry_id:
            self._send_json({'ok': False, 'error': 'id is required.'}, status=HTTPStatus.BAD_REQUEST)
            return
        delete_entry(email, str(entry_id))
        self._send_json({'ok': True})

    def _handle_history_clear(self) -> None:
        email = self._get_user_email()
        if not email:
            self._send_json({'ok': False, 'error': 'Not authenticated.'}, status=HTTPStatus.UNAUTHORIZED)
            return
        clear_history(email)
        self._send_json({'ok': True})

    def _handle_history_bulk(self) -> None:
        email = self._get_user_email()
        if not email:
            self._send_json({'ok': False, 'error': 'Not authenticated.'}, status=HTTPStatus.UNAUTHORIZED)
            return
        try:
            body = self._read_json_body()
        except ValueError as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        entries = body.get('entries')
        if not isinstance(entries, list):
            self._send_json({'ok': False, 'error': 'entries must be a list.'}, status=HTTPStatus.BAD_REQUEST)
            return
        bulk_import(email, entries)
        self._send_json({'ok': True})

    def log_message(self, format: str, *args) -> None:
        return

    def _read_json_body(self) -> dict[str, object]:
        content_length = self.headers.get('Content-Length')
        if not content_length:
            raise ValueError('Request body is empty.')
        try:
            length = int(content_length)
        except ValueError as exc:
            raise ValueError('Invalid Content-Length header.') from exc
        body = self.rfile.read(length)
        try:
            return json.loads(body.decode('utf-8'))
        except json.JSONDecodeError as exc:
            raise ValueError('Request body must be valid JSON.') from exc

    def _serve_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self._send_json({'ok': False, 'error': 'Not found'}, status=HTTPStatus.NOT_FOUND)
            return
        content = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Pragma', 'no-cache')
        self.end_headers()
        self.wfile.write(content)

    def _send_json(self, payload: dict[str, object], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_pdf(self, pdf_bytes: bytes, filename: str) -> None:
        safe_name = ''.join(c if ord(c) >= 32 and c not in ('"', '\\', '/') else '_' for c in filename) or 'report.pdf'
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', f'attachment; filename="{safe_name}"')
        self.send_header('Content-Length', str(len(pdf_bytes)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(pdf_bytes)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Serve the hierarchical inference frontend.')
    parser.add_argument('--host', type=str, default='0.0.0.0')
    parser.add_argument('--port', type=int, default=5000)
    parser.add_argument('--device', type=str, default=None)
    parser.add_argument('--image-size', type=int, default=224)
    parser.add_argument('--temperature', type=float, default=DEFAULT_TEMPERATURE)
    parser.add_argument('--entropy-threshold', type=float, default=DEFAULT_ENTROPY_THRESHOLD)
    parser.add_argument('--blur-threshold', type=float, default=DEFAULT_BLUR_THRESHOLD)
    parser.add_argument('--blank-std-threshold', type=float, default=DEFAULT_BLANK_STD_THRESHOLD)
    parser.add_argument('--grayscale-channel-diff-threshold', type=float, default=DEFAULT_GRAYSCALE_CHANNEL_DIFF_THRESHOLD)
    parser.add_argument('--organ-checkpoint', type=Path, default=DEFAULT_ORGAN_CHECKPOINT)
    parser.add_argument('--subtype-checkpoint', type=Path, default=DEFAULT_SUBTYPE_CHECKPOINT)
    parser.add_argument('--log-level', type=str, default='INFO')
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    logger = configure_logging(args.log_level)
    engine = HierarchicalCancerInference(
        organ_checkpoint=args.organ_checkpoint,
        subtype_checkpoint=args.subtype_checkpoint,
        image_size=args.image_size,
        temperature=args.temperature,
        entropy_threshold=args.entropy_threshold,
        blur_threshold=args.blur_threshold,
        blank_std_threshold=args.blank_std_threshold,
        grayscale_channel_diff_threshold=args.grayscale_channel_diff_threshold,
        device=args.device,
        logger=logger,
    )
    import os as _os
    import sys as _sys
    if not _os.environ.get('GOOGLE_CLIENT_ID', '').strip():
        logger.error(
            'GOOGLE_CLIENT_ID is not set. '
            'Set this environment variable to a valid Google OAuth 2.0 Client ID '
            'obtained from the Google Cloud Console (APIs & Services → Credentials).'
        )
        _sys.exit(1)
    server = InferenceHTTPServer((args.host, args.port), InferenceRequestHandler, engine)
    logger.info('Frontend available at http://%s:%s', args.host, args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info('Shutting down web server.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
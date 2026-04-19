from __future__ import annotations

import hashlib
import json
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parent.parent / 'data' / 'reports'
REPORTS_MAX = 50

_lock = Lock()


def _user_dir(email: str) -> Path:
    safe = hashlib.sha256(email.strip().lower().encode()).hexdigest()
    return DATA_DIR / safe


def _index_file(email: str) -> Path:
    return _user_dir(email) / 'index.json'


def _load_index(email: str) -> list:
    f = _index_file(email)
    if f.is_file():
        try:
            return json.loads(f.read_text(encoding='utf-8'))
        except Exception:
            return []
    return []


def _save_index(email: str, entries: list) -> None:
    d = _user_dir(email)
    d.mkdir(parents=True, exist_ok=True)
    _index_file(email).write_text(
        json.dumps(entries, ensure_ascii=False),
        encoding='utf-8',
    )


def save_report(
    email: str,
    report_id: str,
    filename: str,
    pdf_bytes: bytes,
    status: str,
    timestamp: int,
    final_decision: str = '',
    organ: str = '',
) -> None:
    with _lock:
        d = _user_dir(email)
        d.mkdir(parents=True, exist_ok=True)
        (d / f'{report_id}.pdf').write_bytes(pdf_bytes)
        entries = _load_index(email)
        entries = [e for e in entries if e.get('report_id') != report_id]
        entries.insert(0, {
            'report_id': report_id,
            'filename': filename,
            'timestamp': timestamp,
            'status': status,
            'final_decision': final_decision,
            'organ': organ,
        })
        kept = entries[:REPORTS_MAX]
        evicted = entries[REPORTS_MAX:]
        for old in evicted:
            (d / f'{old["report_id"]}.pdf').unlink(missing_ok=True)
        _save_index(email, kept)


def list_reports(email: str) -> list:
    with _lock:
        index = _load_index(email)
    d = _user_dir(email)
    return [e for e in index if (d / f'{e["report_id"]}.pdf').is_file()]


def get_report_path(email: str, report_id: str) -> Path | None:
    safe_id = report_id.replace('..', '').replace('/', '').replace('\\', '')
    p = _user_dir(email) / f'{safe_id}.pdf'
    return p if p.is_file() else None


def delete_report(email: str, report_id: str) -> None:
    with _lock:
        d = _user_dir(email)
        pdf = d / f'{report_id}.pdf'
        if pdf.is_file():
            pdf.unlink(missing_ok=True)
        entries = _load_index(email)
        entries = [e for e in entries if e.get('report_id') != report_id]
        _save_index(email, entries)

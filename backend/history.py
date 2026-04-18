from __future__ import annotations

import hashlib
import json
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parent.parent / 'data' / 'history'
HISTORY_MAX = 50

_lock = Lock()


def _user_file(email: str) -> Path:
    safe = hashlib.sha256(email.strip().lower().encode()).hexdigest()
    return DATA_DIR / f'{safe}.json'


def load_history(email: str) -> list:
    f = _user_file(email)
    if f.is_file():
        try:
            return json.loads(f.read_text(encoding='utf-8'))
        except Exception:
            return []
    return []


def _save(email: str, entries: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _user_file(email).write_text(
        json.dumps(entries, ensure_ascii=False),
        encoding='utf-8',
    )


def add_entry(email: str, entry: dict) -> None:
    with _lock:
        entries = load_history(email)
        entries = [e for e in entries if e.get('id') != entry.get('id')]
        entries.insert(0, entry)
        _save(email, entries[:HISTORY_MAX])


def delete_entry(email: str, entry_id: str) -> None:
    with _lock:
        entries = load_history(email)
        entries = [e for e in entries if e.get('id') != entry_id]
        _save(email, entries)


def clear_history(email: str) -> None:
    with _lock:
        _save(email, [])


def bulk_import(email: str, entries: list) -> None:
    with _lock:
        existing = load_history(email)
        existing_ids = {e.get('id') for e in existing}
        new_entries = [e for e in entries if e.get('id') not in existing_ids]
        merged = (new_entries + existing)[:HISTORY_MAX]
        _save(email, merged)

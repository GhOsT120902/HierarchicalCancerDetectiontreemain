from __future__ import annotations

import hashlib
import json
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parent.parent / 'data' / 'history'
HISTORY_MAX = 50

_lock = Lock()

EMAIL_INDEX_FILE = DATA_DIR / '_email_index.json'
_index_lock = Lock()


def _user_file_stem(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


def _user_file(email: str) -> Path:
    return DATA_DIR / f'{_user_file_stem(email)}.json'


def _load_email_index() -> dict[str, str]:
    """Load mapping of file_stem -> email."""
    if EMAIL_INDEX_FILE.is_file():
        try:
            return json.loads(EMAIL_INDEX_FILE.read_text(encoding='utf-8'))
        except Exception:
            return {}
    return {}


def _save_email_index(index: dict[str, str]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    EMAIL_INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False), encoding='utf-8')


def _register_email(email: str) -> None:
    """Register an email in the index so admins can see which user owns which file."""
    stem = _user_file_stem(email)
    with _index_lock:
        index = _load_email_index()
        if index.get(stem) != email.strip().lower():
            index[stem] = email.strip().lower()
            _save_email_index(index)


def backfill_email_index() -> None:
    """Backfill the email index from the credentials/users.json file for legacy entries."""
    try:
        from pathlib import Path as _Path
        import json as _json
        users_file = _Path(__file__).resolve().parent.parent / 'data' / 'credentials' / 'users.json'
        if not users_file.is_file():
            return
        users = _json.loads(users_file.read_text(encoding='utf-8'))
        with _index_lock:
            index = _load_email_index()
            changed = False
            for email in users:
                email_clean = email.strip().lower()
                stem = _user_file_stem(email_clean)
                if index.get(stem) != email_clean:
                    index[stem] = email_clean
                    changed = True
            if changed:
                _save_email_index(index)
    except Exception:
        pass


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
    _register_email(email)
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
    _register_email(email)
    with _lock:
        existing = load_history(email)
        existing_ids = {e.get('id') for e in existing}
        new_entries = [e for e in entries if e.get('id') not in existing_ids]
        merged = (new_entries + existing)[:HISTORY_MAX]
        _save(email, merged)


def load_all_history() -> list[dict]:
    """Load all history entries across all users, attaching user email as _user_email."""
    results = []
    if not DATA_DIR.is_dir():
        return results
    email_index = _load_email_index()
    for f in DATA_DIR.glob('*.json'):
        if f.name.startswith('_'):
            continue
        try:
            entries = json.loads(f.read_text(encoding='utf-8'))
            user_email = email_index.get(f.stem, f'user:{f.stem[:8]}...')
            for entry in entries:
                entry['_user_email'] = user_email
                entry['_user_file'] = f.stem
            results.extend(entries)
        except Exception:
            pass
    return results


def admin_delete_entry(user_email: str, entry_id: str) -> None:
    """Delete an entry identified by user email and entry_id."""
    stem = _user_file_stem(user_email)
    path = DATA_DIR / f'{stem}.json'
    if not path.is_file():
        return
    with _lock:
        try:
            entries = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            return
        entries = [e for e in entries if e.get('id') != entry_id]
        path.write_text(json.dumps(entries, ensure_ascii=False), encoding='utf-8')


def admin_update_entry(user_email: str, entry_id: str, updates: dict) -> bool:
    """Update allowed fields on an entry identified by user email + entry_id. Returns True if found and updated."""
    stem = _user_file_stem(user_email)
    path = DATA_DIR / f'{stem}.json'
    if not path.is_file():
        return False
    with _lock:
        try:
            entries = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            return False
        found = False
        ALLOWED = {'filename', 'notes'}
        for entry in entries:
            if entry.get('id') == entry_id:
                for k, v in updates.items():
                    if k in ALLOWED:
                        entry[k] = v
                found = True
                break
        if found:
            path.write_text(json.dumps(entries, ensure_ascii=False), encoding='utf-8')
        return found

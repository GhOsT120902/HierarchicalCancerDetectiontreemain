from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parent.parent / 'data' / 'credentials'
USERS_FILE = DATA_DIR / 'users.json'
RESET_CODES_FILE = DATA_DIR / 'reset_codes.json'

RESET_EXPIRY_SECONDS = 900
MIN_PASSWORD_LENGTH = 6

_lock = Lock()


def _ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_users() -> dict:
    if USERS_FILE.is_file():
        try:
            return json.loads(USERS_FILE.read_text(encoding='utf-8'))
        except Exception:
            return {}
    return {}


def _save_users(users: dict) -> None:
    _ensure_dir()
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding='utf-8')


def _load_reset_codes() -> dict:
    if RESET_CODES_FILE.is_file():
        try:
            return json.loads(RESET_CODES_FILE.read_text(encoding='utf-8'))
        except Exception:
            return {}
    return {}


def _save_reset_codes(codes: dict) -> None:
    _ensure_dir()
    RESET_CODES_FILE.write_text(json.dumps(codes, indent=2), encoding='utf-8')


def _hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 260_000)
    return digest.hex(), salt


def register_user(email: str, password: str) -> tuple[bool, str]:
    email = email.strip().lower()
    if not email or '@' not in email or '.' not in email.split('@')[-1]:
        return False, 'Please enter a valid email address.'
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f'Password must be at least {MIN_PASSWORD_LENGTH} characters.'
    with _lock:
        users = _load_users()
        if email in users:
            return False, 'An account with this email already exists.'
        pw_hash, salt = _hash_password(password)
        users[email] = {
            'password_hash': pw_hash,
            'salt': salt,
            'created_at': time.time(),
        }
        _save_users(users)
    return True, ''


def verify_login(email: str, password: str) -> tuple[bool, str]:
    email = email.strip().lower()
    with _lock:
        users = _load_users()
    record = users.get(email)
    if not record:
        return False, 'No account found with that email address.'
    expected_hash, _ = _hash_password(password, record['salt'])
    if not hmac.compare_digest(expected_hash, record['password_hash']):
        return False, 'Incorrect password. Please try again.'
    return True, ''


def create_reset_code(email: str) -> tuple[bool, str, str]:
    email = email.strip().lower()
    with _lock:
        users = _load_users()
        if email not in users:
            return False, '', 'No account found with that email address.'
        code = str(secrets.randbelow(900_000) + 100_000)
        codes = _load_reset_codes()
        codes[email] = {'code': code, 'expires_at': time.time() + RESET_EXPIRY_SECONDS}
        _save_reset_codes(codes)
    return True, code, ''


def reset_password(email: str, code: str, new_password: str) -> tuple[bool, str]:
    email = email.strip().lower()
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return False, f'Password must be at least {MIN_PASSWORD_LENGTH} characters.'
    with _lock:
        codes = _load_reset_codes()
        entry = codes.get(email)
        if not entry:
            return False, 'No reset code found for this email. Please request a new one.'
        if time.time() > entry['expires_at']:
            del codes[email]
            _save_reset_codes(codes)
            return False, 'Reset code has expired (15 minutes). Please request a new one.'
        if not hmac.compare_digest(str(entry['code']), code.strip()):
            return False, 'Incorrect reset code. Please check and try again.'
        users = _load_users()
        pw_hash, salt = _hash_password(new_password)
        users[email]['password_hash'] = pw_hash
        users[email]['salt'] = salt
        _save_users(users)
        del codes[email]
        _save_reset_codes(codes)
    return True, ''

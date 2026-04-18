from __future__ import annotations

import time
from threading import Lock


class RateLimiter:
    """Thread-safe in-memory rate limiter supporting two strategies:
    - Per-key cooldown: enforce a minimum gap between consecutive requests for the same key.
    - Per-key sliding window: allow at most `max_requests` within a rolling `window_seconds` period.
    """

    def __init__(self) -> None:
        self._lock = Lock()
        self._cooldowns: dict[str, float] = {}
        self._windows: dict[str, list[float]] = {}

    def check_cooldown(self, key: str, cooldown_seconds: float) -> bool:
        """Return True (allowed) if at least `cooldown_seconds` have elapsed since the last
        allowed request for `key`.  Records the current time when access is granted."""
        now = time.monotonic()
        with self._lock:
            last = self._cooldowns.get(key)
            if last is not None and now - last < cooldown_seconds:
                return False
            self._cooldowns[key] = now
            return True

    def check_window(self, key: str, max_requests: int, window_seconds: float) -> bool:
        """Return True (allowed) if fewer than `max_requests` have been made for `key`
        within the last `window_seconds`.  Records the current attempt when allowed."""
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            timestamps = self._windows.get(key, [])
            timestamps = [t for t in timestamps if t > cutoff]
            if len(timestamps) >= max_requests:
                self._windows[key] = timestamps
                return False
            timestamps.append(now)
            self._windows[key] = timestamps
            return True

    def purge_stale(self, max_age_seconds: float = 3600.0) -> None:
        """Remove entries that have not been active recently (optional housekeeping)."""
        cutoff = time.monotonic() - max_age_seconds
        with self._lock:
            stale_cd = [k for k, v in self._cooldowns.items() if v < cutoff]
            for k in stale_cd:
                del self._cooldowns[k]
            stale_win = [k for k, v in self._windows.items() if not v or max(v) < cutoff]
            for k in stale_win:
                del self._windows[k]


_forgot_password_limiter = RateLimiter()

EMAIL_COOLDOWN_SECONDS = 60.0
IP_MAX_REQUESTS = 10
IP_WINDOW_SECONDS = 60.0


def check_forgot_password(email: str, ip: str) -> tuple[bool, str]:
    """Check both IP and email rate limits for the forgot-password endpoint.

    Returns (allowed, reason).  `reason` is an empty string when allowed.
    """
    if not _forgot_password_limiter.check_window(f'ip:{ip}', IP_MAX_REQUESTS, IP_WINDOW_SECONDS):
        return False, 'Too many requests from your network. Please wait a moment and try again.'
    if not _forgot_password_limiter.check_cooldown(f'email:{email}', EMAIL_COOLDOWN_SECONDS):
        return False, 'A reset code was already sent recently. Please wait 60 seconds before requesting another.'
    return True, ''

"""
Tiny in-process TTL cache with single-flight locking.

Used to collapse repeated/concurrent identical upstream API calls (e.g. multiple
browser tabs or widgets polling the same WITS endpoint on the same tick) into a
single outbound request, which keeps us under the provider's rate limits.

In-memory only: the cache is empty after a process restart. That is fine here —
the host keeps the instance warm, and a cold start simply repopulates on first use.
"""

import functools
import json
import logging
import threading
import time

_log = logging.getLogger(__name__)


class TTLCache:
    def __init__(self, ttl_seconds: float):
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, object]] = {}  # key -> (expires_at, value)
        self._global_lock = threading.Lock()
        self._key_locks: dict[str, threading.Lock] = {}

    def _key_lock(self, key: str) -> threading.Lock:
        with self._global_lock:
            lock = self._key_locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._key_locks[key] = lock
            return lock

    def get_or_set(self, key: str, producer):
        """Return the cached value for `key`, else call `producer()` once and cache it.

        Concurrent callers for the same missing key wait on a per-key lock so only
        one of them runs `producer()`. Exceptions are not cached.
        """
        hit = self._store.get(key)
        if hit and hit[0] > time.time():
            return hit[1]

        with self._key_lock(key):
            # Re-check: another thread may have populated it while we waited.
            hit = self._store.get(key)
            if hit and hit[0] > time.time():
                return hit[1]
            value = producer()
            self._store[key] = (time.time() + self._ttl, value)
            return value


def _make_key(name: str, args: tuple, kwargs: dict) -> str:
    # args/kwargs are plain strings/ints/None/lists here; default=str is a safety net.
    return json.dumps([name, args, kwargs], default=str, sort_keys=True)


def ttl_cached(cache: TTLCache):
    """Decorator: memoize an instance method by its arguments for `cache`'s TTL."""

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(self, *args, **kwargs):
            key = _make_key(fn.__qualname__, args, kwargs)
            return cache.get_or_set(key, lambda: fn(self, *args, **kwargs))

        return wrapper

    return decorator

"""
Pluggable persistence for OAuth tokens.

Local dev writes a JSON file (unchanged behaviour). Production sets DATABASE_URL
(e.g. a Neon Postgres connection string) and tokens are stored in a single row,
so they survive Render free-tier spin-downs and redeploys where the filesystem is
ephemeral.

Both backends store/return the same shape the iSolarCloud client uses:
    {"access_token": ..., "refresh_token": ..., "expires_at": ...}

All DB errors are caught and logged rather than raised: a database hiccup must
never take down the rest of the API (e.g. WITS), and an in-memory token can still
serve the current process.
"""

import json
import logging
import os
from pathlib import Path

_log = logging.getLogger(__name__)


class FileTokenStore:
    """JSON-file token store — used for local development."""

    def __init__(self, path: str = "token_store.json", key: str = "isolar_cloud"):
        self._path = Path(path)
        self._key = key

    def load(self) -> dict | None:
        try:
            data = json.loads(self._path.read_text())
            return data.get(self._key)
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            return None

    def save(self, tokens: dict) -> None:
        try:
            data = json.loads(self._path.read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            data = {}
        data[self._key] = tokens
        self._path.write_text(json.dumps(data, indent=2))


class PostgresTokenStore:
    """Postgres-backed token store — used in production (DATABASE_URL set).

    Stores tokens as a JSONB blob keyed by `key` in an `oauth_tokens` table.
    Connections are opened per call (token reads/writes are rare) so there is no
    pool to manage. The table is created lazily on first use.
    """

    def __init__(self, dsn: str, key: str = "isolar_cloud"):
        self._dsn = dsn
        self._key = key
        self._table_ready = False

    def _ensure_table(self, conn) -> None:
        if self._table_ready:
            return
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS oauth_tokens (
                    key        TEXT PRIMARY KEY,
                    tokens     JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        conn.commit()
        self._table_ready = True

    def load(self) -> dict | None:
        try:
            import psycopg

            with psycopg.connect(self._dsn, connect_timeout=10) as conn:
                self._ensure_table(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT tokens FROM oauth_tokens WHERE key = %s", (self._key,)
                    )
                    row = cur.fetchone()
            if row:
                _log.info("iSolarCloud: tokens loaded from Postgres.")
                return row[0]  # psycopg decodes JSONB -> dict
            return None
        except Exception as exc:  # noqa: BLE001 — never let DB errors break startup
            _log.warning("Token store: Postgres load failed (%s) — continuing without tokens.", exc)
            return None

    def save(self, tokens: dict) -> None:
        try:
            import psycopg
            from psycopg.types.json import Json

            with psycopg.connect(self._dsn, connect_timeout=10) as conn:
                self._ensure_table(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO oauth_tokens (key, tokens, updated_at)
                        VALUES (%s, %s, now())
                        ON CONFLICT (key)
                        DO UPDATE SET tokens = EXCLUDED.tokens, updated_at = now()
                        """,
                        (self._key, Json(tokens)),
                    )
                conn.commit()
            _log.info("iSolarCloud: tokens saved to Postgres.")
        except Exception as exc:  # noqa: BLE001
            _log.error("Token store: Postgres save failed (%s) — tokens not persisted.", exc)


def make_token_store(
    key: str = "isolar_cloud", file_path: str = "token_store.json"
) -> "FileTokenStore | PostgresTokenStore":
    """Return a Postgres store when DATABASE_URL is set, else a local file store."""
    dsn = os.getenv("DATABASE_URL")
    if dsn:
        _log.info("Token store: Postgres (DATABASE_URL set).")
        return PostgresTokenStore(dsn, key=key)
    _log.info("Token store: local file (%s).", file_path)
    return FileTokenStore(file_path, key=key)

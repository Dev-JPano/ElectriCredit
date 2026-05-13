"""
============================================================
ELECTRICREDIT V2 - LOG MANAGER
File: log.py

Purpose:
- Write system logs
- Read logs
- Clear logs
- Enforce optional log limit
- Used by app.py, profile.py, chatbot.py, hardware modules, etc.

Database table:
logs
- id INTEGER PRIMARY KEY AUTOINCREMENT
- datetime TEXT NOT NULL
- action TEXT NOT NULL
- author TEXT NOT NULL
============================================================
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database" / "electricredit.db"


# ==========================================================
# BASIC HELPERS
# ==========================================================

def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None

    return dict(row)


def rows_to_list(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def ok(message: str = "OK", data: Any = None) -> dict[str, Any]:
    return {
        "status": "ok",
        "message": message,
        "data": data,
    }


def fail(message: str, data: Any = None) -> dict[str, Any]:
    return {
        "status": "error",
        "message": message,
        "data": data,
    }


def clean_author(author: Any) -> str:
    value = str(author or "").strip()

    if not value:
        return "UNKNOWN"

    return value


def clean_action(action: Any) -> str:
    return str(action or "").strip()


# ==========================================================
# SETTINGS
# ==========================================================

def get_setting(key: str, default: str = "") -> str:
    try:
        with connect() as db:
            row = db.execute(
                "SELECT value FROM settings WHERE key = ?",
                (key,),
            ).fetchone()

            if not row:
                return default

            return str(row["value"] or default)

    except Exception:
        return default


def get_log_limit() -> int | None:
    """
    Returns:
    - int if log limit is enabled
    - None if unlimited
    """

    value = get_setting("log_limit", "1000").strip().lower()

    if value in {"", "none", "no_limit", "nolimit", "unlimited", "-1", "0"}:
        return None

    try:
        number = int(value)
        if number <= 0:
            return None
        return number
    except ValueError:
        return 1000


def enforce_log_limit(db: sqlite3.Connection) -> None:
    limit = get_log_limit()

    if limit is None:
        return

    row = db.execute("SELECT COUNT(*) AS total FROM logs").fetchone()
    total = int(row["total"] or 0)

    if total <= limit:
        return

    excess = total - limit

    db.execute(
        """
        DELETE FROM logs
        WHERE id IN (
            SELECT id FROM logs
            ORDER BY id ASC
            LIMIT ?
        )
        """,
        (excess,),
    )


# ==========================================================
# WRITE LOGS
# ==========================================================

def write_log(action: str, author: str = "SYSTEM") -> dict[str, Any]:
    action = clean_action(action)
    author = clean_author(author)

    if not action:
        return fail("Log action is required.")

    try:
        with connect() as db:
            cursor = db.execute(
                """
                INSERT INTO logs (datetime, action, author)
                VALUES (?, ?, ?)
                """,
                (now_iso(), action, author),
            )

            enforce_log_limit(db)

            db.commit()

            log_id = cursor.lastrowid

            row = db.execute(
                "SELECT * FROM logs WHERE id = ?",
                (log_id,),
            ).fetchone()

            return ok(
                "Log written.",
                row_to_dict(row),
            )

    except Exception as exc:
        return fail(
            "Unable to write log.",
            {
                "error": str(exc),
            },
        )


def write_system(action: str) -> dict[str, Any]:
    return write_log(action, "SYSTEM")


def write_unknown(action: str) -> dict[str, Any]:
    return write_log(action, "UNKNOWN")


def make_author(role: str, account_id: int | str | None = None) -> str:
    role = str(role or "UNKNOWN").strip().upper()

    if account_id is None or account_id == "":
        return role

    return f"{role}[{account_id}]"


# ==========================================================
# READ LOGS
# ==========================================================

def get_logs(
    limit: int = 100,
    offset: int = 0,
    author: str | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    try:
        limit = int(limit)
        offset = int(offset)

        if limit <= 0:
            limit = 100

        if limit > 1000:
            limit = 1000

        if offset < 0:
            offset = 0

    except Exception:
        limit = 100
        offset = 0

    where = []
    params: list[Any] = []

    if author:
        where.append("author = ?")
        params.append(author)

    if search:
        where.append("(action LIKE ? OR author LIKE ? OR datetime LIKE ?)")
        keyword = f"%{search}%"
        params.extend([keyword, keyword, keyword])

    where_sql = ""
    if where:
        where_sql = "WHERE " + " AND ".join(where)

    try:
        with connect() as db:
            rows = db.execute(
                f"""
                SELECT *
                FROM logs
                {where_sql}
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (*params, limit, offset),
            ).fetchall()

            count_row = db.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM logs
                {where_sql}
                """,
                params,
            ).fetchone()

            return ok(
                "Logs loaded.",
                {
                    "items": rows_to_list(rows),
                    "limit": limit,
                    "offset": offset,
                    "total": int(count_row["total"] or 0),
                },
            )

    except Exception as exc:
        return fail(
            "Unable to load logs.",
            {
                "error": str(exc),
            },
        )


def get_recent_logs(limit: int = 50) -> dict[str, Any]:
    return get_logs(limit=limit, offset=0)


def get_log_by_id(log_id: int | str) -> dict[str, Any]:
    try:
        with connect() as db:
            row = db.execute(
                "SELECT * FROM logs WHERE id = ?",
                (log_id,),
            ).fetchone()

            if not row:
                return fail("Log not found.")

            return ok("Log loaded.", row_to_dict(row))

    except Exception as exc:
        return fail(
            "Unable to load log.",
            {
                "error": str(exc),
            },
        )


# ==========================================================
# DELETE / CLEAR LOGS
# ==========================================================

def clear_logs(author: str = "SYSTEM") -> dict[str, Any]:
    author = clean_author(author)

    try:
        with connect() as db:
            row = db.execute("SELECT COUNT(*) AS total FROM logs").fetchone()
            total = int(row["total"] or 0)

            db.execute("DELETE FROM logs")

            db.execute(
                """
                INSERT INTO logs (datetime, action, author)
                VALUES (?, ?, ?)
                """,
                (
                    now_iso(),
                    f"Logs cleared. Removed {total} log(s).",
                    author,
                ),
            )

            db.commit()

            return ok(
                "Logs cleared.",
                {
                    "removed": total,
                },
            )

    except Exception as exc:
        return fail(
            "Unable to clear logs.",
            {
                "error": str(exc),
            },
        )


def delete_log(log_id: int | str, author: str = "SYSTEM") -> dict[str, Any]:
    author = clean_author(author)

    try:
        with connect() as db:
            row = db.execute(
                "SELECT * FROM logs WHERE id = ?",
                (log_id,),
            ).fetchone()

            if not row:
                return fail("Log not found.")

            db.execute(
                "DELETE FROM logs WHERE id = ?",
                (log_id,),
            )

            db.execute(
                """
                INSERT INTO logs (datetime, action, author)
                VALUES (?, ?, ?)
                """,
                (
                    now_iso(),
                    f"Deleted LOG[{log_id}]",
                    author,
                ),
            )

            db.commit()

            return ok(
                "Log deleted.",
                {
                    "deleted": row_to_dict(row),
                },
            )

    except Exception as exc:
        return fail(
            "Unable to delete log.",
            {
                "error": str(exc),
            },
        )


# ==========================================================
# API HANDLERS FOR APP.PY
# ==========================================================

def handle_get_logs(query: dict[str, Any] | None = None) -> dict[str, Any]:
    query = query or {}

    return get_logs(
        limit=query.get("limit", 100),
        offset=query.get("offset", 0),
        author=query.get("author"),
        search=query.get("search"),
    )


def handle_write_log(body: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}

    return write_log(
        action=body.get("action", ""),
        author=body.get("author", "UNKNOWN"),
    )


def handle_clear_logs(body: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}

    return clear_logs(
        author=body.get("author", "SYSTEM"),
    )


def handle_delete_log(log_id: int | str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}

    return delete_log(
        log_id=log_id,
        author=body.get("author", "SYSTEM"),
    )


# ==========================================================
# ELECTRICREDIT STANDARD LOG LABELS / HELPERS
# Keep log action as plain text only. Frontend can parse
# labels like HUB[3], CARD[1], DEVELOPER[1] for coloring.
# ==========================================================

def label(entity: str, entity_id: Any = None) -> str:
    entity = str(entity or "SYSTEM").strip().upper().replace(" ", "_")

    if entity_id is None or entity_id == "":
        return entity

    return f"{entity}[{entity_id}]"


def superuser_label(role: str, account_id: Any) -> str:
    role = str(role or "SUPERUSER").strip().upper()

    if role not in {"ADMINISTRATOR", "OWNER", "DEVELOPER"}:
        role = "SUPERUSER"

    return label(role, account_id)


def log_login(role: str, account_id: Any, method: str = "password") -> dict[str, Any]:
    actor = superuser_label(role, account_id)
    return write_log(
        action=f"{actor} logged in using {method}",
        author="SYSTEM",
    )


def log_logout(role: str, account_id: Any) -> dict[str, Any]:
    actor = superuser_label(role, account_id)
    return write_log(
        action=f"{actor} logged out",
        author=actor,
    )


def log_otp_sent(role: str, account_id: Any, purpose: str = "otp") -> dict[str, Any]:
    actor = superuser_label(role, account_id)
    readable = str(purpose or "otp").replace("_", " ")
    return write_log(
        action=f"OTP was sent to {actor} for {readable}",
        author="SYSTEM",
    )


def log_password_changed(role: str, account_id: Any, method: str = "otp") -> dict[str, Any]:
    actor = superuser_label(role, account_id)
    return write_log(
        action=f"{actor} changed password using {method}",
        author=actor,
    )


def log_profile_updated(role: str, account_id: Any) -> dict[str, Any]:
    actor = superuser_label(role, account_id)
    return write_log(
        action=f"{actor} updated profile",
        author=actor,
    )


def log_superuser_added(
    actor_role: str,
    actor_id: Any,
    target_role: str,
    target_id: Any,
    target_name: str = "",
) -> dict[str, Any]:
    actor = superuser_label(actor_role, actor_id)
    target = superuser_label(target_role, target_id)
    suffix = f" {target_name}" if target_name else ""
    return write_log(
        action=f"{actor} added {target}{suffix}",
        author=actor,
    )


def log_superuser_updated(
    actor_role: str,
    actor_id: Any,
    target_role: str,
    target_id: Any,
) -> dict[str, Any]:
    actor = superuser_label(actor_role, actor_id)
    target = superuser_label(target_role, target_id)
    return write_log(
        action=f"{actor} updated {target}",
        author=actor,
    )


def log_superuser_removed(
    actor_role: str,
    actor_id: Any,
    target_role: str,
    target_id: Any,
    target_name: str = "",
) -> dict[str, Any]:
    actor = superuser_label(actor_role, actor_id)
    target = superuser_label(target_role, target_id)
    suffix = f" {target_name}" if target_name else ""
    return write_log(
        action=f"{actor} removed {target}{suffix}",
        author=actor,
    )


def log_hub_registered(actor: str, hub_id: Any, mac: str = "") -> dict[str, Any]:
    suffix = f" with MAC {mac}" if mac else ""
    return write_log(
        action=f"{actor} registered {label('HUB', hub_id)}{suffix}",
        author=actor,
    )


def log_hub_status(actor: str, hub_id: Any, status: str) -> dict[str, Any]:
    return write_log(
        action=f"{actor} set {label('HUB', hub_id)} status to {status}",
        author=actor,
    )


def log_registry_registered(actor: str, registry_id: Any, mac: str = "") -> dict[str, Any]:
    suffix = f" with MAC {mac}" if mac else ""
    return write_log(
        action=f"{actor} registered {label('REGISTRY', registry_id)}{suffix}",
        author=actor,
    )


def log_registry_status(actor: str, registry_id: Any, status: str) -> dict[str, Any]:
    return write_log(
        action=f"{actor} set {label('REGISTRY', registry_id)} status to {status}",
        author=actor,
    )


def log_user_created(actor: str, user_id: Any, name: str = "") -> dict[str, Any]:
    suffix = f" {name}" if name else ""
    return write_log(
        action=f"{actor} created {label('USER', user_id)}{suffix}",
        author=actor,
    )


def log_user_updated(actor: str, user_id: Any) -> dict[str, Any]:
    return write_log(
        action=f"{actor} updated {label('USER', user_id)}",
        author=actor,
    )


def log_user_deleted(actor: str, user_id: Any) -> dict[str, Any]:
    return write_log(
        action=f"{actor} deleted {label('USER', user_id)}",
        author=actor,
    )


def log_card_created(actor: str, card_id: Any, user_id: Any) -> dict[str, Any]:
    return write_log(
        action=f"{actor} created {label('CARD', card_id)} for {label('USER', user_id)}",
        author=actor,
    )


def log_card_balance_changed(actor: str, card_id: Any, amount: Any, method: str = "manual") -> dict[str, Any]:
    return write_log(
        action=f"{actor} changed balance of {label('CARD', card_id)} by ₱{amount} via {method}",
        author=actor,
    )


def log_card_banned(actor: str, card_id: Any, reason: str = "") -> dict[str, Any]:
    suffix = f" because {reason}" if reason else ""
    return write_log(
        action=f"{actor} banned {label('CARD', card_id)}{suffix}",
        author=actor,
    )


def log_card_unbanned(actor: str, card_id: Any) -> dict[str, Any]:
    return write_log(
        action=f"{actor} unbanned {label('CARD', card_id)}",
        author=actor,
    )


def log_transaction_created(actor: str, transaction_id: Any, card_id: Any, amount: Any, method: str) -> dict[str, Any]:
    return write_log(
        action=f"{actor} created {label('TRANSACTION', transaction_id)} for {label('CARD', card_id)} amount ₱{amount} via {method}",
        author=actor,
    )


def log_transaction_applied(actor: str, transaction_id: Any, card_id: Any) -> dict[str, Any]:
    return write_log(
        action=f"{actor} applied {label('TRANSACTION', transaction_id)} to {label('CARD', card_id)}",
        author=actor,
    )


def log_session_started(hub_id: Any, card_id: Any, session_id: Any = None) -> dict[str, Any]:
    session = f"{label('SESSION', session_id)} " if session_id else ""
    return write_log(
        action=f"{session}{label('HUB', hub_id)} started serving {label('CARD', card_id)}",
        author="SYSTEM",
    )


def log_session_finished(hub_id: Any, card_id: Any, consumed_kwh: Any = "", revenue: Any = "", session_id: Any = None) -> dict[str, Any]:
    session = f"{label('SESSION', session_id)} " if session_id else ""
    details = []
    if consumed_kwh != "":
        details.append(f"{consumed_kwh} kWh")
    if revenue != "":
        details.append(f"₱{revenue}")
    suffix = f" ({', '.join(details)})" if details else ""
    return write_log(
        action=f"{session}{label('HUB', hub_id)} finished serving {label('CARD', card_id)}{suffix}",
        author="SYSTEM",
    )


def log_theme_changed(actor: str, theme_id: Any, theme_name: str = "") -> dict[str, Any]:
    suffix = f" {theme_name}" if theme_name else ""
    return write_log(
        action=f"{actor} updated {label('THEME', theme_id)}{suffix}",
        author=actor,
    )


def log_setting_changed(actor: str, key: str) -> dict[str, Any]:
    return write_log(
        action=f"{actor} updated SETTING[{key}]",
        author=actor,
    )


def log_database_action(actor: str, action: str, table_name: str = "") -> dict[str, Any]:
    target = f"DATABASE[{table_name}]" if table_name else "DATABASE"
    return write_log(
        action=f"{actor} {action} {target}",
        author=actor,
    )


def log_backup_created(actor: str, backup_id: Any, filename: str = "") -> dict[str, Any]:
    suffix = f" {filename}" if filename else ""
    return write_log(
        action=f"{actor} created {label('BACKUP', backup_id)}{suffix}",
        author=actor,
    )


def log_backup_deleted(actor: str, backup_id: Any) -> dict[str, Any]:
    return write_log(
        action=f"{actor} deleted {label('BACKUP', backup_id)}",
        author=actor,
    )


def log_device_visit(device_id: Any, device_name: str = "") -> dict[str, Any]:
    suffix = f" {device_name}" if device_name else ""
    return write_log(
        action=f"{label('DEVICE', device_id)} visited the portal{suffix}",
        author="SYSTEM",
    )

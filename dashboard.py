from __future__ import annotations

import json
from datetime import datetime
from typing import Any

try:
    from database import database as db
except Exception as import_error:  # pragma: no cover
    db = None
    DB_IMPORT_ERROR = str(import_error)
else:
    DB_IMPORT_ERROR = ""


def ok(message: str = "OK", data: Any = None) -> dict[str, Any]:
    return {"status": "ok", "message": message, "data": data}


def fail(message: str, data: Any = None) -> dict[str, Any]:
    return {"status": "error", "message": message, "data": data}


def require_db() -> dict[str, Any] | None:
    if db is None:
        return fail("database/database.py is not ready.", {"detail": DB_IMPORT_ERROR})
    return None


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def parse_json(value: Any, fallback: Any = None) -> Any:
    if value is None or value == "":
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(str(value))
    except Exception:
        return fallback


def dump_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def number(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value or 0)
    except Exception:
        return fallback


def int_id(value: Any) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def actor_label(body: dict[str, Any] | None = None, fallback: str = "SYSTEM") -> str:
    body = body or {}
    if body.get("author"):
        return str(body["author"])
    role = str(body.get("actor_role") or body.get("role") or fallback).upper()
    account_id = body.get("actor_id") or body.get("account_id") or body.get("current_id")
    return f"{role}[{account_id}]" if account_id else role


def role_of(body: dict[str, Any] | None = None) -> str:
    body = body or {}
    return str(body.get("actor_role") or body.get("role") or "VISITOR").upper()


def actor_id(body: dict[str, Any] | None = None) -> int:
    body = body or {}
    return int_id(body.get("actor_id") or body.get("account_id") or body.get("current_id"))


ROLE_LEVEL = {"VISITOR": 0, "USER": 0, "ADMINISTRATOR": 1, "OWNER": 2, "DEVELOPER": 3}


def has_role(body: dict[str, Any] | None, required: str) -> bool:
    return ROLE_LEVEL.get(role_of(body), 0) >= ROLE_LEVEL.get(str(required).upper(), 0)


def require_role(body: dict[str, Any] | None, required: str) -> dict[str, Any] | None:
    if not has_role(body, required):
        return fail(f"{required.upper()} role or higher is required.", {"actor_role": role_of(body), "required_role": required.upper()})
    return None


def first_developer(body: dict[str, Any] | None) -> bool:
    return role_of(body) == "DEVELOPER" and actor_id(body) == 1


def log(action: str, author: str = "SYSTEM") -> None:
    try:
        db.write_log(action, author)
    except Exception:
        pass


def _rows(table: str, order_by: str = "id", direction: str = "ASC") -> list[dict[str, Any]]:
    return db.get_rows(table, order_by=order_by, direction=direction)


def get_summary() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        status = db.get_system_status()
        sessions = _rows("sessions")
        cards = _rows("cards")
        total_kwh = sum(number(row.get("consumed_kwh")) for row in sessions)
        total_revenue = sum(number(row.get("revenue")) for row in sessions)
        balance = sum(number(row.get("balance")) for row in cards)
        status["totals"] = {
            "consumed_kwh": round(total_kwh, 3),
            "revenue": round(total_revenue, 2),
            "card_balance": round(balance, 2),
        }
        return ok("Dashboard summary loaded.", status)
    except Exception as exc:
        return fail(str(exc))


def get_power() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        with db.connect() as conn:
            rows = db.rows_to_dicts(conn.execute(
                """
                SELECT
                    sessions.id,
                    sessions.hub_id,
                    sessions.card_id,
                    sessions.user_id,
                    sessions.started,
                    sessions.ended,
                    sessions.consumed_kwh,
                    sessions.revenue,
                    sessions.status,
                    sessions.reason,
                    hubs.location AS hub_location,
                    users.name AS user_name,
                    cards.uid AS card_uid
                FROM sessions
                LEFT JOIN hubs ON hubs.id = sessions.hub_id
                LEFT JOIN users ON users.id = sessions.user_id
                LEFT JOIN cards ON cards.id = sessions.card_id
                ORDER BY sessions.started ASC, sessions.id ASC
                """
            ).fetchall())
        return ok("Power dashboard loaded.", {"sessions": rows, "items": rows})
    except Exception as exc:
        return fail(str(exc))


def get_hub() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        with db.connect() as conn:
            rows = db.rows_to_dicts(conn.execute(
                """
                SELECT
                    hubs.id,
                    hubs.id AS hub_id,
                    hubs.mac,
                    hubs.location,
                    hubs.status,
                    COALESCE(hubs.consumed_kwh, 0) AS device_kwh,
                    COALESCE(hubs.revenue, 0) AS device_revenue,
                    COUNT(sessions.id) AS session_count,
                    COALESCE(SUM(sessions.consumed_kwh), 0) AS consumed_kwh,
                    COALESCE(SUM(sessions.revenue), 0) AS revenue
                FROM hubs
                LEFT JOIN sessions ON sessions.hub_id = hubs.id
                GROUP BY hubs.id
                ORDER BY consumed_kwh DESC, hubs.id ASC
                """
            ).fetchall())
        for row in rows:
            parsed = parse_json(row.get("status"), {})
            row["status_object"] = parsed
            row["connection"] = parsed.get("connection")
            row["available"] = parsed.get("available")
            row["name"] = row.get("location") or f"HUB[{row.get('id')}]"
        return ok("Hub dashboard loaded.", {"hubs": rows, "items": rows})
    except Exception as exc:
        return fail(str(exc))


def get_user() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        with db.connect() as conn:
            users = db.rows_to_dicts(conn.execute(
                """
                SELECT
                    users.*,
                    COUNT(DISTINCT cards.id) AS card_count,
                    COALESCE(SUM(cards.balance), 0) AS total_balance,
                    COALESCE(SUM(cards.used_kwh), 0) AS card_used_kwh,
                    COALESCE(SUM(sessions.consumed_kwh), 0) AS total_used_kwh,
                    COALESCE(SUM(sessions.revenue), 0) AS total_revenue
                FROM users
                LEFT JOIN cards ON cards.user_id = users.id
                LEFT JOIN sessions ON sessions.user_id = users.id
                GROUP BY users.id
                ORDER BY total_used_kwh DESC, users.id ASC
                """
            ).fetchall())
            for user in users:
                user["emails"] = parse_json(user.get("emails"), [])
                user["numbers"] = parse_json(user.get("numbers"), [])
                user["cards"] = db.rows_to_dicts(conn.execute(
                    "SELECT * FROM cards WHERE user_id = ? ORDER BY id ASC", (user["id"],)
                ).fetchall())
        return ok("User dashboard loaded.", {"users": users, "items": users})
    except Exception as exc:
        return fail(str(exc))


def get_usage() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        with db.connect() as conn:
            rows = db.rows_to_dicts(conn.execute(
                """
                SELECT
                    sessions.id,
                    sessions.hub_id,
                    hubs.location AS hub_location,
                    sessions.started,
                    strftime('%H', sessions.started) AS hour,
                    sessions.consumed_kwh,
                    sessions.revenue,
                    sessions.status
                FROM sessions
                LEFT JOIN hubs ON hubs.id = sessions.hub_id
                ORDER BY sessions.started ASC, sessions.id ASC
                """
            ).fetchall())
        for row in rows:
            row["hour"] = int_id(row.get("hour"))
        return ok("Usage dashboard loaded.", {"usage": rows, "items": rows})
    except Exception as exc:
        return fail(str(exc))

"""
============================================================
ELECTRICREDIT V2 - DATABASE CRUD LAYER
File: database/database.py

Purpose:
- Central SQLite CRUD operations
- Used by routing.py routes
- Uses database/models.py as table/model blueprint
- Uses log.py for centralized logging
- Keeps SQL logic away from app.py/routing.py

Database:
database/electricredit.db

Important:
- Do NOT create tables here.
- Do NOT seed database here.
- Do NOT store chatbot conversations here.
============================================================
"""

from __future__ import annotations

import json
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from werkzeug.security import check_password_hash, generate_password_hash

try:
    from . import models
except ImportError:
    import models

try:
    import log as log_manager
except ImportError:
    log_manager = None


# ==========================================================
# PATH CONFIG
# ==========================================================

DATABASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = DATABASE_DIR.parent
BACKUP_DIR = PROJECT_DIR / "backups"

DB_PATH = DATABASE_DIR / models.DATABASE_FILENAME

DATABASE_DIR.mkdir(exist_ok=True)
BACKUP_DIR.mkdir(exist_ok=True)


# ==========================================================
# BASIC HELPERS
# ==========================================================

def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def from_json(value: str | None, fallback: Any = None) -> Any:
    if value is None or value == "":
        return fallback

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None

    return dict(row)


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def normalize_uid(uid: str) -> str:
    return models.normalize_uid(uid)


def require_database_exists() -> None:
    if not DB_PATH.exists():
        raise RuntimeError(
            "Database file does not exist. Run: python database/create_database.py"
        )


def ensure_table_allowed(table_name: str) -> None:
    if not models.is_allowed_table(table_name):
        raise ValueError(f"Table is not allowed: {table_name}")


def count_table(table_name: str) -> int:
    ensure_table_allowed(table_name)

    with connect() as db:
        row = db.execute(
            f"SELECT COUNT(*) AS count FROM {table_name}"
        ).fetchone()

        return int(row["count"])


def make_actor_label(role: str, account_id: int | str | None = None) -> str:
    if log_manager is not None:
        return log_manager.make_author(role, account_id)

    role = str(role or "UNKNOWN").strip().upper()

    if account_id is None or account_id == "":
        return role

    return f"{role}[{account_id}]"


def make_body_author(body: dict[str, Any] | None) -> str:
    """
    Preferred author order:
    1. explicit author
    2. actor_role + actor_id
    3. requested_by
    4. SYSTEM
    """

    if not isinstance(body, dict):
        return "SYSTEM"

    if body.get("author"):
        return str(body["author"])

    if body.get("actor_role") and body.get("actor_id"):
        return make_actor_label(body["actor_role"], body["actor_id"])

    if body.get("requested_by"):
        return str(body["requested_by"])

    return "SYSTEM"


def get_request_author_from_body(body: dict[str, Any] | None) -> str:
    return make_body_author(body)


def write_log(action: str, author: str = "SYSTEM") -> dict[str, Any]:
    """
    Write logs through log.py so log limits and standard formatting
    are centralized.

    Backend stores plain messages only.
    Frontend will parse labels like HUB[3], CARD[1], DEVELOPER[1].
    """

    if log_manager is not None:
        return log_manager.write_log(action, author)

    with connect() as db:
        cursor = db.execute(
            """
            INSERT INTO logs (datetime, action, author)
            VALUES (?, ?, ?)
            """,
            (now_iso(), action, author),
        )
        db.commit()

        return {
            "status": "ok",
            "message": "Log written with fallback.",
            "data": {
                "id": cursor.lastrowid,
                "datetime": now_iso(),
                "action": action,
                "author": author,
            },
        }


def validate_required(table_name: str, data: dict[str, Any]) -> None:
    missing = models.validate_required(table_name, data)

    if missing:
        raise ValueError(f"Missing required field: {missing}")


def insert_row(table_name: str, data: dict[str, Any]) -> dict[str, Any]:
    ensure_table_allowed(table_name)

    # IMPORTANT:
    # Model prepare_insert() applies defaults such as:
    # - created = now_iso()
    # - birthdate = "~"
    # - gender = "Others"
    # - JSON conversion for emails/numbers/links
    #
    # Required validation must happen AFTER preparation.
    # Otherwise optional frontend forms fail because "created" is required
    # in the model but is generated by prepare_insert().
    prepared = models.prepare_insert_data(table_name, data)

    if not prepared:
        raise ValueError("No valid insert data provided.")

    missing = models.validate_required(table_name, prepared)
    if missing:
        raise ValueError(f"Missing required field: {missing}")

    columns = list(prepared.keys())
    placeholders = ", ".join(["?"] * len(columns))
    column_sql = ", ".join(columns)
    values = [prepared[column] for column in columns]

    with connect() as db:
        cursor = db.execute(
            f"""
            INSERT INTO {table_name} ({column_sql})
            VALUES ({placeholders})
            """,
            values,
        )
        db.commit()

        row = db.execute(
            f"SELECT * FROM {table_name} WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return row_to_dict(row) or {}


def update_row(table_name: str, row_id: int, data: dict[str, Any]) -> dict[str, Any]:
    ensure_table_allowed(table_name)

    prepared = models.prepare_update_data(table_name, data)

    if not prepared:
        raise ValueError("No valid update data provided.")

    set_sql = ", ".join([f"{column} = ?" for column in prepared.keys()])
    values = list(prepared.values())
    values.append(row_id)

    with connect() as db:
        existing = db.execute(
            f"SELECT id FROM {table_name} WHERE id = ?",
            (row_id,),
        ).fetchone()

        if not existing:
            raise ValueError(f"Row not found in {table_name}: {row_id}")

        db.execute(
            f"""
            UPDATE {table_name}
            SET {set_sql}
            WHERE id = ?
            """,
            values,
        )
        db.commit()

        row = db.execute(
            f"SELECT * FROM {table_name} WHERE id = ?",
            (row_id,),
        ).fetchone()

    return row_to_dict(row) or {}


def delete_row(table_name: str, row_id: int) -> dict[str, Any]:
    ensure_table_allowed(table_name)

    with connect() as db:
        existing = db.execute(
            f"SELECT * FROM {table_name} WHERE id = ?",
            (row_id,),
        ).fetchone()

        if not existing:
            raise ValueError(f"Row not found in {table_name}: {row_id}")

        db.execute(
            f"DELETE FROM {table_name} WHERE id = ?",
            (row_id,),
        )
        db.commit()

    return row_to_dict(existing) or {}


def get_row(table_name: str, row_id: int) -> dict[str, Any] | None:
    ensure_table_allowed(table_name)

    with connect() as db:
        row = db.execute(
            f"SELECT * FROM {table_name} WHERE id = ?",
            (row_id,),
        ).fetchone()

    return row_to_dict(row)


def get_rows(
    table_name: str,
    order_by: str = "id",
    direction: str = "ASC",
    limit: int | None = None,
) -> list[dict[str, Any]]:
    ensure_table_allowed(table_name)

    allowed_columns = models.get_table_columns(table_name)

    if order_by not in allowed_columns:
        order_by = "id"

    direction = "DESC" if str(direction).upper() == "DESC" else "ASC"

    sql = f"SELECT * FROM {table_name} ORDER BY {order_by} {direction}"
    values: list[Any] = []

    if limit is not None:
        sql += " LIMIT ?"
        values.append(int(limit))

    with connect() as db:
        rows = rows_to_dicts(db.execute(sql, values).fetchall())

    return rows


# ==========================================================
# SYSTEM / STATUS
# ==========================================================

def get_system_status() -> dict[str, Any]:
    require_database_exists()

    return {
        "server": "active",
        "mode": "local_first",
        "database_layer": True,
        "database": str(DB_PATH),
        "internet": get_setting_value("internet_status", "unknown"),
        "counts": {
            "users": count_table("users"),
            "cards": count_table("cards"),
            "superusers": count_table("superusers"),
            "hubs": count_table("hubs"),
            "registry_stations": count_table("registry_stations"),
            "sessions": count_table("sessions"),
            "transactions": count_table("transactions"),
            "logs": count_table("logs"),
            "devices": count_table("devices"),
            "themes": count_table("themes"),
            "settings": count_table("settings"),
            "backups": count_table("backups"),
        },
        "time": now_iso(),
    }


# ==========================================================
# DASHBOARD
# ==========================================================

def get_dashboard_summary() -> dict[str, Any]:
    settings = get_settings()

    with connect() as db:
        row = db.execute(
            "SELECT COUNT(*) AS count FROM sessions WHERE status = ?",
            (models.SESSION_STATUS_ACTIVE,),
        ).fetchone()

        active_sessions = int(row["count"])

    return {
        "settings": settings,
        "counts": {
            "users": count_table("users"),
            "cards": count_table("cards"),
            "hubs": count_table("hubs"),
            "registry_stations": count_table("registry_stations"),
            "active_sessions": active_sessions,
            "transactions": count_table("transactions"),
        },
    }


def get_dashboard_power() -> list[dict[str, Any]]:
    with connect() as db:
        rows = rows_to_dicts(
            db.execute(
                """
                SELECT
                    id,
                    hub_id,
                    card_id,
                    user_id,
                    started,
                    ended,
                    consumed_kwh,
                    revenue,
                    status,
                    reason
                FROM sessions
                ORDER BY started ASC
                """
            ).fetchall()
        )

    return rows


def get_dashboard_hub() -> list[dict[str, Any]]:
    return get_hubs()


def get_dashboard_user() -> list[dict[str, Any]]:
    with connect() as db:
        rows = rows_to_dicts(
            db.execute(
                """
                SELECT
                    users.id,
                    users.name,
                    users.birthdate,
                    users.gender,
                    COALESCE(SUM(cards.balance), 0) AS total_balance,
                    COALESCE(SUM(cards.used_kwh), 0) AS total_used_kwh,
                    COUNT(cards.id) AS card_count
                FROM users
                LEFT JOIN cards ON cards.user_id = users.id
                GROUP BY users.id
                ORDER BY users.id ASC
                """
            ).fetchall()
        )

    return rows


def get_dashboard_usage() -> list[dict[str, Any]]:
    return get_dashboard_power()


# ==========================================================
# HARDWARE
# ==========================================================

def parse_hardware_status(row: dict[str, Any]) -> dict[str, Any]:
    output = dict(row)
    output["status"] = from_json(
        output.get("status"),
        {
            "available": False,
            "status": "enabled",
            "connection": "offline",
        },
    )
    return output


def get_hardware_summary() -> dict[str, Any]:
    hubs = get_hubs()
    registry = get_registry_stations()

    return {
        "hubs": {
            "total": len(hubs),
            "online": sum(
                1 for item in hubs
                if item.get("status", {}).get("connection") == "online"
            ),
            "available": sum(
                1 for item in hubs
                if item.get("status", {}).get("available") is True
            ),
        },
        "registry_stations": {
            "total": len(registry),
            "online": sum(
                1 for item in registry
                if item.get("status", {}).get("connection") == "online"
            ),
            "available": sum(
                1 for item in registry
                if item.get("status", {}).get("available") is True
            ),
        },
    }


# ------------------------------
# HUBS
# ------------------------------

def get_hubs() -> list[dict[str, Any]]:
    return [parse_hardware_status(row) for row in get_rows("hubs")]


def register_hub(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = insert_row("hubs", data)

    if log_manager:
        log_manager.log_hub_registered(author, row["id"], row.get("mac", ""))
    else:
        write_log(f"{author} registered HUB[{row['id']}]", author)

    return row


def ping_hub(data: dict[str, Any]) -> dict[str, Any]:
    hub_id = int(data.get("id") or 0)
    author = get_request_author_from_body(data)

    if hub_id <= 0:
        raise ValueError("Missing required field: id")

    row = get_row("hubs", hub_id)

    if not row:
        raise ValueError(f"HUB[{hub_id}] not found")

    status = from_json(row.get("status"), {})
    status["connection"] = "online"

    updated = update_row("hubs", hub_id, {"status": to_json(status)})
    write_log(f"{author} pinged HUB[{hub_id}]", author)

    return parse_hardware_status(updated)


def terminate_hub(data: dict[str, Any]) -> dict[str, Any]:
    hub_id = int(data.get("id") or 0)
    author = get_request_author_from_body(data)

    if hub_id <= 0:
        raise ValueError("Missing required field: id")

    write_log(f"{author} requested termination for HUB[{hub_id}]", author)

    return {
        "id": hub_id,
        "terminated": True,
    }


def disable_hub(data: dict[str, Any]) -> dict[str, Any]:
    return set_hardware_enabled("hubs", "HUB", data, enabled=False)


def enable_hub(data: dict[str, Any]) -> dict[str, Any]:
    return set_hardware_enabled("hubs", "HUB", data, enabled=True)


def delete_hub(hub_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    deleted = delete_row("hubs", hub_id)
    write_log(f"{author} deleted HUB[{hub_id}]", author)
    return deleted


# ------------------------------
# REGISTRY STATIONS
# ------------------------------

def get_registry_stations() -> list[dict[str, Any]]:
    return [parse_hardware_status(row) for row in get_rows("registry_stations")]


def register_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = insert_row("registry_stations", data)

    if log_manager:
        log_manager.log_registry_registered(author, row["id"], row.get("mac", ""))
    else:
        write_log(f"{author} registered REGISTRY[{row['id']}]", author)

    return row


def ping_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    registry_id = int(data.get("id") or 0)
    author = get_request_author_from_body(data)

    if registry_id <= 0:
        raise ValueError("Missing required field: id")

    row = get_row("registry_stations", registry_id)

    if not row:
        raise ValueError(f"REGISTRY[{registry_id}] not found")

    status = from_json(row.get("status"), {})
    status["connection"] = "online"

    updated = update_row("registry_stations", registry_id, {"status": to_json(status)})
    write_log(f"{author} pinged REGISTRY[{registry_id}]", author)

    return parse_hardware_status(updated)


def request_registry_scan(data: dict[str, Any]) -> dict[str, Any]:
    registry_id = int(data.get("id") or 0)
    author = get_request_author_from_body(data)

    if registry_id <= 0:
        raise ValueError("Missing required field: id")

    write_log(f"{author} prepared scan request for REGISTRY[{registry_id}]", author)

    return {
        "registry_station_id": registry_id,
        "uid": "04A1B2C3F0",
        "message": "Sample UID only. Real RC522 integration will replace this.",
    }


def disable_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    return set_hardware_enabled("registry_stations", "REGISTRY", data, enabled=False)


def enable_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    return set_hardware_enabled("registry_stations", "REGISTRY", data, enabled=True)


def delete_registry_station(registry_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    deleted = delete_row("registry_stations", registry_id)
    write_log(f"{author} deleted REGISTRY[{registry_id}]", author)
    return deleted


def set_hardware_enabled(
    table_name: str,
    label: str,
    data: dict[str, Any],
    enabled: bool,
) -> dict[str, Any]:
    item_id = int(data.get("id") or 0)
    author = get_request_author_from_body(data)

    if item_id <= 0:
        raise ValueError("Missing required field: id")

    row = get_row(table_name, item_id)

    if not row:
        raise ValueError(f"{label}[{item_id}] not found")

    status = from_json(row.get("status"), {})
    status["status"] = "enabled" if enabled else "disabled"

    if not enabled:
        status["available"] = False

    updated = update_row(table_name, item_id, {"status": to_json(status)})
    action = "enabled" if enabled else "disabled"

    if label == "HUB" and log_manager:
        log_manager.log_hub_status(author, item_id, action)
    elif label == "REGISTRY" and log_manager:
        log_manager.log_registry_status(author, item_id, action)
    else:
        write_log(f"{author} set {label}[{item_id}] status to {action}", author)

    return parse_hardware_status(updated)


# ==========================================================
# USERS / CARDS
# ==========================================================

def parse_user_row(user: dict[str, Any]) -> dict[str, Any]:
    output = dict(user)
    output["numbers"] = from_json(output.get("numbers"), [])
    output["emails"] = from_json(output.get("emails"), [])
    return output


def get_users() -> list[dict[str, Any]]:
    users = get_rows("users")

    with connect() as db:
        parsed_users: list[dict[str, Any]] = []

        for user in users:
            parsed = parse_user_row(user)
            parsed["cards"] = [
                with_card_aliases(card)
                for card in rows_to_dicts(
                    db.execute(
                        "SELECT * FROM cards WHERE user_id = ? ORDER BY id ASC",
                        (user["id"],),
                    ).fetchall()
                )
            ]
            parsed_users.append(parsed)

    return parsed_users


def create_user(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = insert_row("users", data)

    if log_manager:
        log_manager.log_user_created(author, row["id"], row.get("name", ""))
    else:
        write_log(f"{author} created USER[{row['id']}]", author)

    return parse_user_row(row)


def update_user(user_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    prepared = dict(data)

    if isinstance(prepared.get("numbers"), list):
        prepared["numbers"] = to_json(prepared["numbers"])

    if isinstance(prepared.get("emails"), list):
        prepared["emails"] = to_json(prepared["emails"])

    row = update_row("users", user_id, prepared)

    if log_manager:
        log_manager.log_user_updated(author, user_id)
    else:
        write_log(f"{author} updated USER[{user_id}]", author)

    return parse_user_row(row)


def delete_user(user_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    deleted = delete_row("users", user_id)

    if log_manager:
        log_manager.log_user_deleted(author, user_id)
    else:
        write_log(f"{author} deleted USER[{user_id}]", author)

    return deleted


def delete_all_users(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    create_backup({
        "author": author,
        "reason": "Before deleting all users",
    })

    with connect() as db:
        db.execute("DELETE FROM cards")
        db.execute("DELETE FROM users")
        db.commit()

    write_log(f"{author} deleted all USER and CARD records", author)

    return {
        "deleted": True,
    }


def bulk_update_balance(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    amount = float(data.get("amount", 0))
    operation = str(data.get("operation", "add")).lower()

    if operation not in {"add", "subtract"}:
        raise ValueError("operation must be add or subtract")

    delta = amount if operation == "add" else -amount

    with connect() as db:
        db.execute("UPDATE cards SET balance = balance + ?", (delta,))
        affected = db.total_changes
        db.commit()

    write_log(
        f"{author} applied bulk balance operation {operation} ₱{amount} to all CARD records",
        author,
    )

    return {
        "operation": operation,
        "amount": amount,
        "delta": delta,
        "affected": affected,
    }


# ------------------------------
# CARDS
# ------------------------------

def normalize_card_payload(data: dict[str, Any], user_id: int | None = None) -> dict[str, Any]:
    """
    Keep card CRUD friendly to the frontend.

    Frontend may send uid/rfid_uid/card_uid and limit/credit_limit/debt_limit.
    The database stores only uid and debt_limit.
    """

    prepared = dict(data or {})

    if user_id is not None:
        prepared["user_id"] = user_id

    uid = prepared.get("uid") or prepared.get("rfid_uid") or prepared.get("card_uid")
    if uid is not None:
        prepared["uid"] = normalize_uid(uid)

    if "debt_limit" not in prepared:
        if "credit_limit" in prepared:
            prepared["debt_limit"] = prepared.get("credit_limit")
        elif "limit" in prepared:
            prepared["debt_limit"] = prepared.get("limit")

    for numeric_key in ("balance", "used_kwh", "debt_limit"):
        if numeric_key in prepared and prepared[numeric_key] not in (None, ""):
            prepared[numeric_key] = float(prepared[numeric_key])

    # Drop frontend aliases that are not actual SQLite columns.
    prepared.pop("rfid_uid", None)
    prepared.pop("card_uid", None)
    prepared.pop("credit_limit", None)
    prepared.pop("limit", None)
    prepared.pop("owner_id", None)
    prepared.pop("tenant_id", None)
    prepared.pop("assigned_user_id", None)
    prepared.pop("actor_id", None)
    prepared.pop("actor_role", None)
    prepared.pop("account_id", None)
    prepared.pop("author", None)

    return prepared


def with_card_aliases(row: dict[str, Any]) -> dict[str, Any]:
    output = dict(row or {})
    debt_limit = float(output.get("debt_limit") or 100)
    balance = float(output.get("balance") or 0)

    output["debt_limit"] = debt_limit
    output["credit_limit"] = debt_limit
    output["limit"] = debt_limit
    output["debt"] = min(balance, 0)
    output["is_debt"] = balance < 0
    output["is_cutoff"] = debt_limit > 0 and balance <= -abs(debt_limit)

    return output


def create_card(user_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    prepared = normalize_card_payload(data, user_id=user_id)
    row = insert_row("cards", prepared)

    if log_manager:
        log_manager.log_card_created(author, row["id"], user_id)
    else:
        write_log(f"{author} created CARD[{row['id']}] for USER[{user_id}]", author)

    return with_card_aliases(row)


def update_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    prepared = normalize_card_payload(data)
    row = update_row("cards", card_id, prepared)
    write_log(f"{author} updated CARD[{card_id}]", author)

    return with_card_aliases(row)


def delete_card(card_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    deleted = delete_row("cards", card_id)
    write_log(f"{author} deleted CARD[{card_id}]", author)
    return deleted


def topup_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    amount = float(data.get("amount", 0))
    method = str(data.get("method") or "manual")
    registry_station_id = data.get("registry_station_id")
    gateway_reference = str(data.get("gateway_reference") or "")

    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")

    with connect() as db:
        card = db.execute(
            "SELECT * FROM cards WHERE id = ?",
            (card_id,),
        ).fetchone()

        if not card:
            raise ValueError(f"CARD[{card_id}] not found")

        new_balance = float(card["balance"] or 0) + amount

        db.execute(
            "UPDATE cards SET balance = ? WHERE id = ?",
            (new_balance, card_id),
        )

        cursor = db.execute(
            """
            INSERT INTO transactions (
                type,
                method,
                amount,
                card_id,
                registry_station_id,
                gateway_reference,
                status,
                created,
                applied
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "topup",
                method,
                amount,
                card_id,
                registry_station_id,
                gateway_reference,
                "applied",
                now_iso(),
                now_iso(),
            ),
        )

        db.commit()

        transaction_id = cursor.lastrowid

    if log_manager:
        log_manager.log_transaction_created(
            actor=author,
            transaction_id=transaction_id,
            card_id=card_id,
            amount=amount,
            method=method,
        )
        log_manager.log_card_balance_changed(
            actor=author,
            card_id=card_id,
            amount=amount,
            method=method,
        )
    else:
        source = f"via {method}"
        if registry_station_id:
            source += f" REGISTRY[{registry_station_id}]"
        write_log(f"{author} topped up CARD[{card_id}] by ₱{amount} {source}", author)

    return {
        "card_id": card_id,
        "transaction_id": transaction_id,
        "amount": amount,
        "balance": new_balance,
        "method": method,
    }


def ban_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = update_row(
        "cards",
        card_id,
        {
            "status": "banned",
            "reason": data.get("reason", "No reason provided"),
            "until": data.get("until", "forever"),
        },
    )

    if log_manager:
        log_manager.log_card_banned(author, card_id, data.get("reason", ""))
    else:
        write_log(f"{author} banned CARD[{card_id}]", author)

    return row


def unban_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = update_row(
        "cards",
        card_id,
        {
            "status": "active",
            "reason": "",
            "until": "~",
        },
    )

    if log_manager:
        log_manager.log_card_unbanned(author, card_id)
    else:
        write_log(f"{author} unbanned CARD[{card_id}]", author)

    return row


# ==========================================================
# SUPERUSERS / AUTH FALLBACK
# Real profile/auth logic should use profile.py
# ==========================================================

def parse_superuser_row(row: dict[str, Any]) -> dict[str, Any]:
    output = dict(row)
    output.pop("password", None)
    output["emails"] = from_json(output.get("emails"), [])
    output["numbers"] = from_json(output.get("numbers"), [])
    output["links"] = from_json(output.get("links"), [])
    return output


def get_superusers(role: str | None = None) -> list[dict[str, Any]]:
    with connect() as db:
        if role:
            rows = rows_to_dicts(
                db.execute(
                    "SELECT * FROM superusers WHERE role = ? ORDER BY id ASC",
                    (role.upper(),),
                ).fetchall()
            )
        else:
            rows = get_rows("superusers")

    return [parse_superuser_row(row) for row in rows]


def create_superuser(data: dict[str, Any]) -> dict[str, Any]:
    """
    Fallback database-level superuser creation.
    Main secured creation should use profile.py.
    """

    author = get_request_author_from_body(data)

    prepared = dict(data)
    raw_password = str(prepared.get("password") or "").strip()

    if not raw_password:
        raise ValueError("password is required")

    prepared["password"] = generate_password_hash(raw_password)

    if isinstance(prepared.get("emails"), list):
        prepared["emails"] = to_json(prepared["emails"])

    if isinstance(prepared.get("numbers"), list):
        prepared["numbers"] = to_json(prepared["numbers"])

    if isinstance(prepared.get("links"), list):
        prepared["links"] = to_json(prepared["links"])

    row = insert_row("superusers", prepared)

    if log_manager:
        log_manager.log_superuser_added(
            actor_role="SYSTEM",
            actor_id="",
            target_role=row["role"],
            target_id=row["id"],
            target_name=row.get("name", ""),
        )
    else:
        write_log(f"{author} created {row['role']}[{row['id']}]", author)

    return parse_superuser_row(row)


def update_superuser(superuser_id: int, data: dict[str, Any]) -> dict[str, Any]:
    """
    Fallback database-level superuser update.
    Main secured update should use profile.py.
    """

    author = get_request_author_from_body(data)

    prepared = dict(data)

    if "password" in prepared:
        prepared["password"] = generate_password_hash(str(prepared["password"]))

    if isinstance(prepared.get("emails"), list):
        prepared["emails"] = to_json(prepared["emails"])

    if isinstance(prepared.get("numbers"), list):
        prepared["numbers"] = to_json(prepared["numbers"])

    if isinstance(prepared.get("links"), list):
        prepared["links"] = to_json(prepared["links"])

    row = update_row("superusers", superuser_id, prepared)

    write_log(
        f"{author} updated {row.get('role', 'SUPERUSER')}[{superuser_id}]",
        author,
    )

    return parse_superuser_row(row)


def delete_superuser(superuser_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    """
    Fallback database-level superuser delete.
    Main secured delete should use profile.py.
    """

    deleted = delete_row("superusers", superuser_id)

    write_log(
        f"{author} deleted {deleted.get('role', 'SUPERUSER')}[{superuser_id}]",
        author,
    )

    return parse_superuser_row(deleted)


def get_current_user(flask_request: Any = None) -> dict[str, Any]:
    """
    Placeholder auth.
    Real current user should be handled by profile.py/session later.
    """

    return {"user": None}


def login(data: dict[str, Any], flask_request: Any = None) -> dict[str, Any]:
    """
    Fallback password login.
    Real password/OTP login should use profile.py.
    """

    username = str(data.get("username") or "").strip()
    raw_password = str(data.get("password") or "")

    if not username or not raw_password:
        raise ValueError("Username and password are required.")

    with connect() as db:
        row = db.execute(
            "SELECT * FROM superusers WHERE username = ?",
            (username,),
        ).fetchone()

    if not row:
        raise ValueError("Invalid username or password.")

    user = dict(row)
    stored_hash = str(user.get("password") or "")

    valid = check_password_hash(stored_hash, raw_password)

    if not valid:
        raise ValueError("Invalid username or password.")

    actor = make_actor_label(user.get("role"), user.get("id"))

    if log_manager:
        log_manager.log_login(user["role"], user["id"], "password")
    else:
        write_log(f"{actor} logged in using password", "SYSTEM")

    return {
        "user": parse_superuser_row(user),
        "note": "Session persistence will be implemented later.",
    }


def logout(flask_request: Any = None) -> dict[str, Any]:
    return {"logged_out": True}


def request_otp(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "sent": False,
        "message": "OTP is handled by profile.py.",
    }


def verify_otp(data: dict[str, Any], flask_request: Any = None) -> dict[str, Any]:
    return {
        "verified": False,
        "message": "OTP is handled by profile.py.",
    }


# ==========================================================
# SETTINGS / NETWORK
# ==========================================================

def get_settings() -> list[dict[str, Any]]:
    return get_rows("settings", order_by="key")


def get_setting_value(key: str, fallback: Any = None) -> Any:
    with connect() as db:
        row = db.execute(
            "SELECT value FROM settings WHERE key = ?",
            (key,),
        ).fetchone()

    if not row:
        return fallback

    return row["value"]


def update_setting(key: str, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    value = data.get("value")

    if value is None:
        raise ValueError("Missing required field: value")

    with connect() as db:
        db.execute(
            """
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (key, str(value)),
        )
        db.commit()

    if log_manager:
        log_manager.log_setting_changed(author, key)
    else:
        write_log(f"{author} updated SETTING[{key}]", author)

    return {
        "key": key,
        "value": value,
    }


def get_network_status() -> dict[str, Any]:
    return {
        "network_mode": get_setting_value("network_mode", "local_only"),
        "hotspot_name": get_setting_value("hotspot_name", "ElectriCredit"),
        "internet_status": get_setting_value("internet_status", "unknown"),
        "payment_bridge_url": get_setting_value("payment_bridge_url", ""),
    }


# ==========================================================
# THEMES
# ==========================================================

def get_themes() -> list[dict[str, Any]]:
    return get_rows("themes", order_by="priority")


def get_theme(theme_id: int) -> dict[str, Any]:
    row = get_row("themes", theme_id)

    if not row:
        raise ValueError(f"Theme not found: {theme_id}")

    return models.Theme.to_frontend_theme(row)


def create_theme(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = insert_row("themes", data)

    write_log(f"{author} created THEME[{row['id']}] {row['name']}", author)

    return row


def update_theme(theme_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = update_row("themes", theme_id, data)

    if log_manager:
        log_manager.log_theme_changed(author, theme_id, row.get("name", ""))
    else:
        write_log(f"{author} updated THEME[{theme_id}] {row.get('name', '')}", author)

    return row


def delete_theme(theme_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    deleted = delete_row("themes", theme_id)

    write_log(f"{author} deleted THEME[{theme_id}] {deleted.get('name')}", author)

    return deleted


def set_theme_priority(data: dict[str, Any]) -> dict[str, Any]:
    """
    Accepts:
    {
      "order": [3, 1, 2]
    }

    The first ID gets priority 1.
    """

    author = get_request_author_from_body(data)
    order = data.get("order")

    if not isinstance(order, list) or not order:
        raise ValueError("order must be a non-empty list of theme IDs")

    with connect() as db:
        for index, theme_id in enumerate(order, start=1):
            db.execute(
                "UPDATE themes SET priority = ? WHERE id = ?",
                (index, int(theme_id)),
            )

        db.commit()

    write_log(f"{author} updated THEME priority order", author)

    return {
        "order": order,
    }


# ==========================================================
# LOGS
# Prefer log.py for direct log routes
# ==========================================================

def get_logs(limit: int | str = 100) -> list[dict[str, Any]]:
    if log_manager:
        result = log_manager.get_logs(limit=limit)

        if result.get("status") == "ok":
            return result.get("data", {}).get("items", [])

    try:
        safe_limit = max(1, min(int(limit), 1000))
    except (TypeError, ValueError):
        safe_limit = 100

    return get_rows("logs", order_by="id", direction="DESC", limit=safe_limit)


def clear_logs(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    if log_manager:
        return log_manager.clear_logs(author)

    with connect() as db:
        db.execute("DELETE FROM logs")
        db.commit()

    write_log(f"{author} cleared LOGS", author)

    return {"cleared": True}


# ==========================================================
# DATABASE EDITOR
# ==========================================================

def get_database_tables() -> list[dict[str, Any]]:
    metadata = models.database_table_metadata()

    with connect() as db:
        for table in metadata:
            name = table["table"]
            row = db.execute(
                f"SELECT COUNT(*) AS count FROM {name}"
            ).fetchone()
            table["count"] = int(row["count"])

    return metadata


def get_database_table(table_name: str) -> dict[str, Any]:
    ensure_table_allowed(table_name)

    with connect() as db:
        rows = rows_to_dicts(
            db.execute(
                f"SELECT * FROM {table_name} ORDER BY id DESC LIMIT 300"
            ).fetchall()
        )

        columns = rows_to_dicts(
            db.execute(f"PRAGMA table_info({table_name})").fetchall()
        )

    return {
        "table": table_name,
        "columns": columns,
        "rows": rows,
    }


def create_database_row(table_name: str, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row_data = dict(data)
    row_data.pop("author", None)

    row = insert_row(table_name, row_data)

    if log_manager:
        log_manager.log_database_action(author, "created row in", table_name)
    else:
        write_log(f"{author} created row in DATABASE[{table_name}]", author)

    return row


def update_database_row(table_name: str, row_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row_data = dict(data)
    row_data.pop("author", None)

    row = update_row(table_name, row_id, row_data)

    if log_manager:
        log_manager.log_database_action(author, f"updated row {row_id} in", table_name)
    else:
        write_log(f"{author} updated row {row_id} in DATABASE[{table_name}]", author)

    return row


def delete_database_row(table_name: str, row_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    create_backup({
        "author": author,
        "reason": f"Before deleting row {row_id} from {table_name}",
    })

    row = delete_row(table_name, row_id)

    if log_manager:
        log_manager.log_database_action(author, f"deleted row {row_id} from", table_name)
    else:
        write_log(f"{author} deleted row {row_id} from DATABASE[{table_name}]", author)

    return row


def clear_database_table(table_name: str, data: dict[str, Any]) -> dict[str, Any]:
    ensure_table_allowed(table_name)

    author = get_request_author_from_body(data)

    if table_name == "backups":
        raise ValueError("Backups table cannot be cleared here.")

    create_backup({
        "author": author,
        "reason": f"Before clearing table {table_name}",
    })

    with connect() as db:
        db.execute(f"DELETE FROM {table_name}")
        db.commit()

    if log_manager:
        log_manager.log_database_action(author, "cleared", table_name)
    else:
        write_log(f"{author} cleared DATABASE[{table_name}]", author)

    return {
        "table": table_name,
        "cleared": True,
    }


# ==========================================================
# BACKUPS
# ==========================================================

def get_backups() -> list[dict[str, Any]]:
    return get_rows("backups", order_by="id", direction="DESC")


def create_backup(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    reason = str(data.get("reason") or "Manual backup")

    if not DB_PATH.exists():
        raise RuntimeError("Database file does not exist. Cannot create backup.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"electricredit_backup_{timestamp}.db"
    target = BACKUP_DIR / filename

    shutil.copy2(DB_PATH, target)

    row = insert_row(
        "backups",
        {
            "filename": filename,
            "created": now_iso(),
            "author": author,
            "reason": reason,
        },
    )

    if log_manager:
        log_manager.log_backup_created(author, row["id"], filename)
    else:
        write_log(f"{author} created BACKUP[{row['id']}] {filename}", author)

    return row


def restore_backup(backup_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    with connect() as db:
        row = db.execute(
            "SELECT * FROM backups WHERE id = ?",
            (backup_id,),
        ).fetchone()

    if not row:
        raise ValueError("Backup not found.")

    backup = dict(row)
    backup_file = BACKUP_DIR / backup["filename"]

    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_file}")

    create_backup({
        "author": author,
        "reason": "Automatic backup before restore",
    })

    shutil.copy2(backup_file, DB_PATH)

    write_log(f"{author} restored BACKUP[{backup_id}] {backup['filename']}", author)

    return {
        "restored": True,
        "backup": backup,
    }


def delete_backup(backup_id: int, author: str = "SYSTEM") -> dict[str, Any]:
    with connect() as db:
        row = db.execute(
            "SELECT * FROM backups WHERE id = ?",
            (backup_id,),
        ).fetchone()

        if not row:
            raise ValueError("Backup not found.")

        backup = dict(row)
        backup_file = BACKUP_DIR / backup["filename"]

        if backup_file.exists():
            backup_file.unlink()

        db.execute(
            "DELETE FROM backups WHERE id = ?",
            (backup_id,),
        )
        db.commit()

    if log_manager:
        log_manager.log_backup_deleted(author, backup_id)
    else:
        write_log(f"{author} deleted BACKUP[{backup_id}]", author)

    return backup


# ==========================================================
# TRANSACTIONS
# ==========================================================

def get_transactions() -> list[dict[str, Any]]:
    return get_rows("transactions", order_by="id", direction="DESC")


def get_transaction(transaction_id: int) -> dict[str, Any]:
    row = get_row("transactions", transaction_id)

    if not row:
        raise ValueError("Transaction not found.")

    return row


def create_transaction(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = insert_row("transactions", data)

    if log_manager:
        log_manager.log_transaction_created(
            actor=author,
            transaction_id=row["id"],
            card_id=row.get("card_id", "?"),
            amount=row.get("amount", 0),
            method=row.get("method", "unknown"),
        )
    else:
        write_log(f"{author} created TRANSACTION[{row['id']}]", author)

    return row


def apply_transaction(transaction_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    row = get_transaction(transaction_id)

    if row["status"] == "applied":
        return row

    card_id = row.get("card_id")
    amount = float(row.get("amount") or 0)

    if not card_id:
        raise ValueError("Transaction has no card_id.")

    with connect() as db:
        card = db.execute(
            "SELECT * FROM cards WHERE id = ?",
            (card_id,),
        ).fetchone()

        if not card:
            raise ValueError("Card not found.")

        if row.get("type") in {"topup", "refund", "adjustment"}:
            new_balance = float(card["balance"] or 0) + amount
        else:
            new_balance = float(card["balance"] or 0) - amount

        db.execute(
            "UPDATE cards SET balance = ? WHERE id = ?",
            (new_balance, card_id),
        )

        db.execute(
            "UPDATE transactions SET status = ?, applied = ? WHERE id = ?",
            ("applied", now_iso(), transaction_id),
        )

        db.commit()

    if log_manager:
        log_manager.log_transaction_applied(author, transaction_id, card_id)
    else:
        write_log(f"{author} applied TRANSACTION[{transaction_id}] to CARD[{card_id}]", author)

    return get_transaction(transaction_id)


def cancel_transaction(transaction_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)

    row = update_row(
        "transactions",
        transaction_id,
        {
            "status": "cancelled",
        },
    )

    write_log(f"{author} cancelled TRANSACTION[{transaction_id}]", author)

    return row


# ==========================================================
# PAYMENT BRIDGE PLACEHOLDER
# ==========================================================

def create_online_payment(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "configured": False,
        "message": "Payment bridge is planned but not configured yet.",
    }


def get_payment_bridge_status() -> dict[str, Any]:
    url = get_setting_value("payment_bridge_url", "")

    return {
        "configured": bool(url),
        "url": url,
        "online": False,
        "message": "Payment bridge placeholder.",
    }


def get_pending_online_payments() -> list[dict[str, Any]]:
    with connect() as db:
        rows = rows_to_dicts(
            db.execute(
                """
                SELECT *
                FROM transactions
                WHERE method = 'online'
                  AND status IN ('pending', 'hold')
                ORDER BY id DESC
                """
            ).fetchall()
        )

    return rows


def sync_payment_bridge(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "synced": False,
        "message": "Payment bridge sync is not implemented yet.",
    }


# ==========================================================
# DEVICES
# ==========================================================

def get_devices() -> list[dict[str, Any]]:
    rows = get_rows("devices")

    for row in rows:
        row["visited"] = from_json(row.get("visited"), [])

    return rows


def get_device(device_id: int) -> dict[str, Any]:
    row = get_row("devices", device_id)

    if not row:
        raise ValueError("Device not found.")

    row["visited"] = from_json(row.get("visited"), [])

    return row


def record_device_visit(data: dict[str, Any], flask_request: Any = None) -> dict[str, Any]:
    mac = str(data.get("mac") or "").strip()
    device = str(data.get("device") or "").strip()

    if not mac:
        mac = "UNKNOWN"

    with connect() as db:
        existing = db.execute(
            "SELECT * FROM devices WHERE mac = ?",
            (mac,),
        ).fetchone()

        if existing:
            row = dict(existing)
            visited = from_json(row.get("visited"), [])

            if not isinstance(visited, list):
                visited = []

            visited.append(now_iso())

            db.execute(
                "UPDATE devices SET device = ?, visited = ? WHERE id = ?",
                (
                    device or row.get("device") or "",
                    to_json(visited),
                    row["id"],
                ),
            )
            db.commit()

            device_id = row["id"]
            is_new = False
        else:
            cursor = db.execute(
                """
                INSERT INTO devices (mac, device, visited)
                VALUES (?, ?, ?)
                """,
                (mac, device, to_json([now_iso()])),
            )
            db.commit()

            device_id = cursor.lastrowid
            is_new = True

    if log_manager:
        log_manager.log_device_visit(device_id, device)
    else:
        if is_new:
            write_log(f"DEVICE[{device_id}] visited the portal", "SYSTEM")
        else:
            write_log(f"DEVICE[{device_id}] revisited the portal", "SYSTEM")

    return get_device(device_id)

# ==========================================================
# DATABASE SYNC V1 ADDITIONS
# Added for Peopleware/Hardware backend sync.
# ==========================================================

def parse_card_row(card: dict[str, Any]) -> dict[str, Any]:
    output = dict(card)
    output["balance"] = float(output.get("balance") or 0)
    output["used_kwh"] = float(output.get("used_kwh") or 0)
    return output


def get_user_cards(user_id: int) -> list[dict[str, Any]]:
    with connect() as db:
        rows = rows_to_dicts(
            db.execute(
                "SELECT * FROM cards WHERE user_id = ? ORDER BY id ASC",
                (int(user_id),),
            ).fetchall()
        )

    return [parse_card_row(row) for row in rows]


def get_cards() -> list[dict[str, Any]]:
    return [parse_card_row(row) for row in get_rows("cards")]


def delete_all_administrators(data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    with connect() as db:
        rows = db.execute("SELECT id FROM superusers WHERE role = 'ADMINISTRATOR' ORDER BY id ASC").fetchall()
        ids = [int(row["id"]) for row in rows]
        db.execute("DELETE FROM superusers WHERE role = 'ADMINISTRATOR'")
        db.commit()
    write_log(f"{author} deleted all ADMINISTRATOR records: {ids}", author)
    return {"deleted": True, "ids": ids, "count": len(ids)}


def update_hub(hub_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    row = update_row("hubs", int(hub_id), data)
    write_log(f"{author} updated HUB[{hub_id}]", author)
    return parse_hardware_status(row)


def update_registry_station(registry_id: int, data: dict[str, Any]) -> dict[str, Any]:
    author = get_request_author_from_body(data)
    row = update_row("registry_stations", int(registry_id), data)
    write_log(f"{author} updated REGISTRY[{registry_id}]", author)
    return parse_hardware_status(row)

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


# ==========================================================
# RESPONSE HELPERS
# ==========================================================

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


# ==========================================================
# BASIC NORMALIZERS
# ==========================================================

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


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_role(value: Any) -> str:
    role = str(value or "VISITOR").strip().upper()
    return role if role in ROLE_LEVEL else "VISITOR"


def normalize_uid(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        return db.normalize_uid(raw)
    except Exception:
        return "".join(ch for ch in raw if ch.isalnum()).upper()


def normalize_array(value: Any) -> list[Any]:
    parsed = parse_json(value, value)
    if parsed is None or parsed == "":
        return []
    if isinstance(parsed, list):
        return [item for item in parsed if item not in (None, "")]
    return [parsed]


def normalize_links(value: Any) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    for item in normalize_array(value):
        if isinstance(item, dict):
            label = normalize_text(item.get("label") or item.get("title") or "Link")
            url = normalize_text(item.get("url") or item.get("href") or item.get("value"))
        else:
            text = normalize_text(item)
            if "|" in text:
                label, url = [part.strip() for part in text.split("|", 1)]
            else:
                label, url = "Link", text
        if url:
            output.append({"label": label or "Link", "url": url})
    return output


# ==========================================================
# ROLE / AUTH HELPERS
# ==========================================================

ROLE_LEVEL = {"VISITOR": 0, "USER": 0, "ADMINISTRATOR": 1, "OWNER": 2, "DEVELOPER": 3}


def actor_label(body: dict[str, Any] | None = None, fallback: str = "SYSTEM") -> str:
    body = body or {}
    if body.get("author"):
        return str(body["author"])
    role = normalize_role(body.get("actor_role") or body.get("role") or fallback)
    account_id = body.get("actor_id") or body.get("account_id") or body.get("current_id")
    return f"{role}[{account_id}]" if account_id else role


def role_of(body: dict[str, Any] | None = None) -> str:
    body = body or {}
    return normalize_role(body.get("actor_role") or body.get("role") or "VISITOR")


def actor_id(body: dict[str, Any] | None = None) -> int:
    body = body or {}
    return int_id(body.get("actor_id") or body.get("account_id") or body.get("current_id"))


def has_role(body: dict[str, Any] | None, required: str) -> bool:
    return ROLE_LEVEL.get(role_of(body), 0) >= ROLE_LEVEL.get(str(required).upper(), 0)


def require_role(body: dict[str, Any] | None, required: str) -> dict[str, Any] | None:
    if not has_role(body, required):
        return fail(
            f"{required.upper()} role or higher is required.",
            {"actor_role": role_of(body), "required_role": required.upper()},
        )
    return None


def first_developer(body: dict[str, Any] | None) -> bool:
    return role_of(body) == "DEVELOPER" and actor_id(body) == 1


def log(action: str, author: str = "SYSTEM") -> None:
    try:
        db.write_log(action, author)
    except Exception:
        pass


# ==========================================================
# DATABASE COLUMN SAFETY
# ==========================================================

def _table_columns(table_name: str) -> set[str]:
    """
    Reads the real SQLite table columns.

    This lets peopleware.py accept newer frontend fields such as debt_limit,
    credit_limit, image, and links without crashing on an older DB schema.
    Unsupported fields are ignored until models/create_database are updated.
    """
    if db is None:
        return set()
    try:
        with db.connect() as conn:
            rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        return {str(row[1]) for row in rows}
    except Exception:
        return set()


def _filter_table_payload(table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    columns = _table_columns(table_name)
    if not columns:
        return dict(payload)
    return {key: value for key, value in payload.items() if key in columns}


def _remove_actor_fields(payload: dict[str, Any]) -> dict[str, Any]:
    output = dict(payload or {})
    for private in [
        "actor_id", "actor_role", "account_id", "author", "current_id", "current_role",
        "owner_id", "tenant_id", "assigned_user_id", "card_id",
    ]:
        output.pop(private, None)
    return output


def _prepare_json_arrays(data: dict[str, Any], keys=("emails", "numbers", "links")) -> dict[str, Any]:
    payload = _remove_actor_fields(data)
    for key in keys:
        if key not in payload:
            continue
        if key == "links":
            payload[key] = dump_json(normalize_links(payload[key]))
        elif isinstance(payload[key], list):
            payload[key] = dump_json(payload[key])
        elif isinstance(payload[key], tuple):
            payload[key] = dump_json(list(payload[key]))
    return payload


def _safe_optional_profile_fields(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Frontend Peopleware forms treat birthdate/contact/email/image/links as optional.
    Older model/database validation may still require birthdate/gender, so normalize
    blank optional values into safe stored values before insert.
    """
    payload = dict(payload or {})

    # Empty date input becomes "" in FormData. Keep it non-empty for older validation,
    # while the frontend still displays it as Not recorded / no computed age.
    if not normalize_text(payload.get("birthdate")):
        payload["birthdate"] = "~"

    if not normalize_text(payload.get("gender")):
        payload["gender"] = "Others"

    payload.setdefault("image", "")

    return payload


def _remove_empty_password_on_update(payload: dict[str, Any]) -> dict[str, Any]:
    payload = dict(payload or {})
    if not normalize_text(payload.get("password")):
        payload.pop("password", None)
    return payload


# ==========================================================
# PARSERS FOR FRONTEND
# ==========================================================

def _parse_card(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None

    item = dict(row)
    uid = item.get("uid") or item.get("rfid_uid") or item.get("card_uid") or ""
    item["uid"] = uid
    item["rfid_uid"] = uid
    item["card_uid"] = uid

    balance = number(item.get("balance"))
    item["balance"] = balance
    item["used_kwh"] = number(item.get("used_kwh"))

    # Keep frontend ready for the future DB column.
    debt_limit = None
    for key in ("debt_limit", "credit_limit", "limit"):
        if key in item and item.get(key) not in (None, ""):
            debt_limit = number(item.get(key), 100)
            break
    if debt_limit is None:
        debt_limit = 100.0

    item["debt_limit"] = debt_limit
    item["credit_limit"] = debt_limit
    item["limit"] = debt_limit
    item["debt"] = min(balance, 0)
    item["has_debt"] = balance < 0
    item["is_cutoff"] = bool(debt_limit > 0 and balance <= -abs(debt_limit))
    return item


def _parse_user(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    item = dict(row)
    item["emails"] = normalize_array(item.get("emails"))
    item["numbers"] = normalize_array(item.get("numbers"))
    item["email"] = item["emails"][0] if item["emails"] else ""
    item["phone"] = item["numbers"][0] if item["numbers"] else ""
    item.setdefault("gender", "Others")
    item.setdefault("image", "")
    return item


def _parse_superuser(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    item = dict(row)
    item.pop("password", None)
    item["emails"] = normalize_array(item.get("emails"))
    item["numbers"] = normalize_array(item.get("numbers"))
    item["links"] = normalize_links(item.get("links"))
    item["email"] = item["emails"][0] if item["emails"] else ""
    item["phone"] = item["numbers"][0] if item["numbers"] else ""
    item.setdefault("gender", "Others")
    item.setdefault("image", "")
    item["role"] = normalize_role(item.get("role"))
    return item


def _user_with_cards(conn: Any, row: dict[str, Any]) -> dict[str, Any]:
    user = _parse_user(row) or {}
    raw_cards = db.rows_to_dicts(
        conn.execute("SELECT * FROM cards WHERE user_id = ? ORDER BY id ASC", (row["id"],)).fetchall()
    )
    cards = [_parse_card(card) for card in raw_cards]
    cards = [card for card in cards if card]
    user["cards"] = cards
    user["card_details"] = cards
    user["card_count"] = len(cards)
    user["cards_count"] = len(cards)
    user["balance"] = round(sum(number(card.get("balance")) for card in cards), 2)
    user["used_kwh"] = round(sum(number(card.get("used_kwh")) for card in cards), 3)
    user["has_debt"] = any(number(card.get("balance")) < 0 for card in cards)
    user["is_cutoff"] = any(bool(card.get("is_cutoff")) for card in cards)
    user["is_using"] = any(str(card.get("status") or "").lower() in {"using", "active_session"} for card in cards)
    return user


# ==========================================================
# SUMMARY
# ==========================================================

def summary() -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        status = db.get_system_status()
        superusers = db.get_rows("superusers")
        status.setdefault("counts", {})["administrators"] = sum(1 for x in superusers if str(x.get("role")).upper() == "ADMINISTRATOR")
        status["counts"]["owners"] = sum(1 for x in superusers if str(x.get("role")).upper() == "OWNER")
        status["counts"]["developers"] = sum(1 for x in superusers if str(x.get("role")).upper() == "DEVELOPER")
        status["counts"]["operators"] = status["counts"]["administrators"] + status["counts"]["owners"]
        return ok("Peopleware summary loaded.", status)
    except Exception as exc:
        return fail(str(exc))


# ==========================================================
# USERS
# ==========================================================

def get_users() -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        with db.connect() as conn:
            rows = db.rows_to_dicts(conn.execute("SELECT * FROM users ORDER BY id ASC").fetchall())
            users = [_user_with_cards(conn, row) for row in rows]
        return ok("Users loaded.", {"users": users, "items": users})
    except Exception as exc:
        return fail(str(exc))


def get_user(user_id: int) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        with db.connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not row:
                return fail(f"USER[{user_id}] not found.")
            user = _user_with_cards(conn, dict(row))
        return ok("User loaded.", user)
    except Exception as exc:
        return fail(str(exc))


def get_user_cards(user_id: int) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        with db.connect() as conn:
            raw_cards = db.rows_to_dicts(conn.execute("SELECT * FROM cards WHERE user_id = ? ORDER BY id ASC", (user_id,)).fetchall())
        cards = [_parse_card(card) for card in raw_cards]
        cards = [card for card in cards if card]
        return ok("User cards loaded.", {"cards": cards, "items": cards})
    except Exception as exc:
        return fail(str(exc))


def create_user(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        payload = _prepare_json_arrays(data, ("emails", "numbers"))
        payload = _safe_optional_profile_fields(payload)
        payload = _filter_table_payload("users", payload)
        author = actor_label(data)
        row = db.insert_row("users", payload)
        log(f"{author} created USER[{row['id']}]", author)
        return ok("User created.", _parse_user(row))
    except Exception as exc:
        return fail(str(exc))


def update_user(user_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        payload = _prepare_json_arrays(data, ("emails", "numbers"))
        payload = _safe_optional_profile_fields(payload)
        payload = _filter_table_payload("users", payload)
        author = actor_label(data)
        row = db.update_row("users", user_id, payload)
        log(f"{author} updated USER[{user_id}]", author)
        return ok("User updated.", _parse_user(row))
    except Exception as exc:
        return fail(str(exc))


def delete_user(user_id: int, body: dict[str, Any] | None = None, author: str = "SYSTEM") -> dict[str, Any]:
    denied = require_role(body or {"actor_role": "ADMINISTRATOR"}, "ADMINISTRATOR") if body else None
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        author = actor_label(body, author) if body else author
        row = db.delete_row("users", user_id)
        log(f"{author} deleted USER[{user_id}]", author)
        return ok("User deleted.", row)
    except Exception as exc:
        return fail(str(exc))


def delete_all_users(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        author = actor_label(data)
        with db.connect() as conn:
            conn.execute("DELETE FROM cards")
            conn.execute("DELETE FROM users")
            affected = conn.total_changes
            conn.commit()
        log(f"{author} deleted all USER and CARD records", author)
        return ok("All users deleted.", {"deleted": affected})
    except Exception as exc:
        return fail(str(exc))


def bulk_update_balance(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        amount = number(data.get("amount"))
        operation = str(data.get("operation") or "add").lower()
        delta = amount if operation == "add" else -amount
        with db.connect() as conn:
            conn.execute("UPDATE cards SET balance = balance + ?", (delta,))
            affected = conn.total_changes
            conn.commit()
        author = actor_label(data)
        log(f"{author} bulk updated card balance by {delta}", author)
        return ok("Bulk balance updated.", {"affected": affected, "delta": delta})
    except Exception as exc:
        return fail(str(exc))


# ==========================================================
# CARDS
# ==========================================================

def _prepare_card_payload(data: dict[str, Any], user_id: int | None = None, update: bool = False) -> dict[str, Any]:
    payload = _remove_actor_fields(data)
    payload.pop("id", None)

    if user_id is not None:
        payload["user_id"] = int(user_id)

    uid = payload.get("uid") or payload.get("rfid_uid") or payload.get("card_uid")
    if uid:
        payload["uid"] = normalize_uid(uid)

    for alias in ["rfid_uid", "card_uid"]:
        payload.pop(alias, None)

    limit_value = payload.get("debt_limit", payload.get("credit_limit", payload.get("limit")))
    if limit_value not in (None, ""):
        limit_value = number(limit_value, 100)
        payload["debt_limit"] = limit_value
        payload["credit_limit"] = limit_value
        payload["limit"] = limit_value

    if "balance" in payload:
        payload["balance"] = number(payload.get("balance"))
    if "used_kwh" in payload:
        payload["used_kwh"] = number(payload.get("used_kwh"))

    if not update:
        payload.setdefault("balance", 0)
        payload.setdefault("used_kwh", 0)
        payload.setdefault("status", "active")
        payload.setdefault("reason", "")
        payload.setdefault("until", "~")

    payload = _filter_table_payload("cards", payload)
    return payload


def get_cards() -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        cards = [_parse_card(card) for card in db.get_rows("cards")]
        cards = [card for card in cards if card]
        return ok("Cards loaded.", {"cards": cards, "items": cards})
    except Exception as exc:
        return fail(str(exc))


def get_card(card_id: int) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        card = _parse_card(db.get_row("cards", card_id))
        return ok("Card loaded.", card) if card else fail(f"CARD[{card_id}] not found.")
    except Exception as exc:
        return fail(str(exc))


def create_card(user_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        if not db.get_row("users", user_id):
            return fail(f"USER[{user_id}] not found.")

        payload = _prepare_card_payload(data, user_id=user_id, update=False)
        if not payload.get("uid"):
            return fail("RFID UID is required.")

        row = db.insert_row("cards", payload)
        parsed = _parse_card(row)
        author = actor_label(data)
        log(f"{author} created CARD[{row['id']}] for USER[{user_id}]", author)
        return ok("Card created.", parsed)
    except Exception as exc:
        return fail(str(exc))


def update_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        payload = _prepare_card_payload(data, update=True)
        if not payload:
            return fail("No valid card fields to update. If you changed Debt Limit, update database/models.py and create_database.py to add a debt_limit column first.")

        row = db.update_row("cards", card_id, payload)
        parsed = _parse_card(row)
        author = actor_label(data)
        log(f"{author} updated CARD[{card_id}]", author)
        return ok("Card updated.", parsed)
    except Exception as exc:
        return fail(str(exc))


def delete_card(card_id: int, body: dict[str, Any] | None = None, author: str = "SYSTEM") -> dict[str, Any]:
    denied = require_role(body or {"actor_role": "ADMINISTRATOR"}, "ADMINISTRATOR") if body else None
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        author = actor_label(body, author) if body else author
        row = db.delete_row("cards", card_id)
        log(f"{author} deleted CARD[{card_id}]", author)
        return ok("Card deleted.", _parse_card(row))
    except Exception as exc:
        return fail(str(exc))


def topup_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        amount = number(data.get("amount"))
        if amount <= 0:
            return fail("Amount must be greater than zero.")
        method = str(data.get("method") or "coin_slot")
        author = actor_label(data)
        with db.connect() as conn:
            card = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
            if not card:
                return fail(f"CARD[{card_id}] not found.")
            new_balance = number(card["balance"]) + amount
            conn.execute("UPDATE cards SET balance = ? WHERE id = ?", (new_balance, card_id))
            cur = conn.execute(
                """
                INSERT INTO transactions (type, method, amount, card_id, registry_station_id, gateway_reference, status, created, applied)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "topup", method, amount, card_id, data.get("registry_station_id"),
                    data.get("gateway_reference") or "coin-slot-manual", "applied", now_iso(), now_iso(),
                ),
            )
            conn.commit()
            transaction_id = cur.lastrowid
            updated = db.rows_to_dicts(conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchall())[0]
        log(f"{author} topped up CARD[{card_id}] by ₱{amount}", author)
        return ok(
            "Card topped up.",
            {"card_id": card_id, "amount": amount, "balance": new_balance, "transaction_id": transaction_id, "card": _parse_card(updated)},
        )
    except Exception as exc:
        return fail(str(exc))


def ban_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    return update_card(
        card_id,
        {**data, "status": "banned", "reason": data.get("reason") or "No reason provided", "until": data.get("until") or "forever"},
    )


def unban_card(card_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied:
        return denied
    return update_card(card_id, {**data, "status": "active", "reason": "", "until": "~"})


# ==========================================================
# SUPERUSERS / OPERATORS / DEVELOPERS
# ==========================================================

def get_superusers(role: str | None = None) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing
    try:
        if role:
            with db.connect() as conn:
                rows = db.rows_to_dicts(
                    conn.execute("SELECT * FROM superusers WHERE role = ? ORDER BY id ASC", (str(role).upper(),)).fetchall()
                )
        else:
            rows = db.get_rows("superusers")
        items = [_parse_superuser(row) for row in rows]
        items = [item for item in items if item]
        return ok("Superusers loaded.", {"superusers": items, "items": items})
    except Exception as exc:
        return fail(str(exc))


def get_administrators() -> dict[str, Any]:
    result = get_superusers(None)
    if result.get("status") != "ok":
        return result
    items = result.get("data", {}).get("items", [])
    items = [item for item in items if str(item.get("role")).upper() in {"ADMINISTRATOR", "OWNER"}]
    return ok("Operators loaded.", {"administrators": items, "items": items})


def get_developers() -> dict[str, Any]:
    return get_superusers("DEVELOPER")


def _prepare_superuser_payload(data: dict[str, Any], update: bool = False) -> dict[str, Any]:
    payload = _prepare_json_arrays(data, ("emails", "numbers", "links"))
    payload = _safe_optional_profile_fields(payload)
    if update:
        payload = _remove_empty_password_on_update(payload)
    if "role" in payload:
        payload["role"] = normalize_role(payload["role"])
    if not update and not payload.get("role"):
        payload["role"] = "ADMINISTRATOR"
    return _filter_table_payload("superusers", payload)


def create_superuser(data: dict[str, Any]) -> dict[str, Any]:
    target_role = normalize_role(data.get("role") or "ADMINISTRATOR")
    if target_role == "DEVELOPER":
        if not first_developer(data):
            return fail("Only DEVELOPER[1] can create Developer accounts.")
    elif target_role == "OWNER":
        denied = require_role(data, "DEVELOPER")
        if denied:
            return denied
    else:
        denied = require_role(data, "OWNER")
        if denied:
            return denied

    missing = require_db()
    if missing:
        return missing
    try:
        from werkzeug.security import generate_password_hash

        payload = _prepare_superuser_payload(data, update=False)
        raw_password = str(payload.get("password") or "").strip()
        if not raw_password:
            return fail("password is required")
        payload["password"] = generate_password_hash(raw_password)
        row = db.insert_row("superusers", payload)
        author = actor_label(data)
        log(f"{author} created {row['role']}[{row['id']}]", author)
        return ok("Superuser created.", _parse_superuser(row))
    except Exception as exc:
        return fail(str(exc))


def update_superuser(superuser_id: int, data: dict[str, Any]) -> dict[str, Any]:
    existing = db.get_row("superusers", superuser_id) if db else None
    target_role = normalize_role((data or {}).get("role") or (existing or {}).get("role") or "ADMINISTRATOR")
    if target_role == "DEVELOPER":
        if not first_developer(data):
            return fail("Only DEVELOPER[1] can update Developer accounts.")
    elif target_role == "OWNER":
        denied = require_role(data, "DEVELOPER")
        if denied:
            return denied
    else:
        denied = require_role(data, "OWNER")
        if denied:
            return denied

    missing = require_db()
    if missing:
        return missing
    try:
        from werkzeug.security import generate_password_hash

        payload = _prepare_superuser_payload(data, update=True)
        if payload.get("password"):
            payload["password"] = generate_password_hash(str(payload["password"]))
        else:
            payload.pop("password", None)
        row = db.update_row("superusers", superuser_id, payload)
        author = actor_label(data)
        log(f"{author} updated {row.get('role')}[{superuser_id}]", author)
        return ok("Superuser updated.", _parse_superuser(row))
    except Exception as exc:
        return fail(str(exc))


def delete_superuser(superuser_id: int, data: dict[str, Any] | None = None, author: str = "SYSTEM") -> dict[str, Any]:
    existing = db.get_row("superusers", superuser_id) if db else None
    target_role = normalize_role((data or {}).get("role") or (existing or {}).get("role") or "ADMINISTRATOR")
    if target_role == "DEVELOPER":
        if not first_developer(data):
            return fail("Only DEVELOPER[1] can delete Developer accounts.")
    elif target_role == "OWNER":
        denied = require_role(data, "DEVELOPER")
        if denied:
            return denied
    else:
        denied = require_role(data, "OWNER")
        if denied:
            return denied

    missing = require_db()
    if missing:
        return missing
    try:
        author = actor_label(data, author) if data else author
        row = db.delete_row("superusers", superuser_id)
        log(f"{author} deleted {target_role}[{superuser_id}]", author)
        return ok("Superuser deleted.", _parse_superuser(row))
    except Exception as exc:
        return fail(str(exc))


def delete_all_administrators(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "DEVELOPER")
    if denied:
        return denied
    missing = require_db()
    if missing:
        return missing
    try:
        with db.connect() as conn:
            conn.execute("DELETE FROM superusers WHERE role = 'ADMINISTRATOR'")
            affected = conn.total_changes
            conn.commit()
        author = actor_label(data)
        log(f"{author} deleted all ADMINISTRATOR accounts", author)
        return ok("All administrators deleted.", {"deleted": affected})
    except Exception as exc:
        return fail(str(exc))

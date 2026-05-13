"""
============================================================
ELECTRICREDIT V2 - SOFTWARE BACKEND
File: software.py

Purpose:
- Backend logic for Software section
- Enforce RBAC waterfall:
  DEVELOPER > OWNER > ADMINISTRATOR > VISITOR/USER
- Configuration tools: rates, themes, logs, announcement, bonus
- Maintenance tools: device ID, database tables, backups, balance reset
- Keep risky database/table tools Developer-only
============================================================
"""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from database import database as db
except Exception as import_error:  # pragma: no cover
    db = None
    DB_IMPORT_ERROR = str(import_error)
else:
    DB_IMPORT_ERROR = ""

try:
    import api_manager
except Exception as import_error:  # pragma: no cover
    api_manager = None
    API_MANAGER_IMPORT_ERROR = str(import_error)
else:
    API_MANAGER_IMPORT_ERROR = ""

try:
    import log as log_manager
except Exception:
    log_manager = None

try:
    import wifi_manager
except Exception as import_error:  # pragma: no cover
    wifi_manager = None
    WIFI_MANAGER_IMPORT_ERROR = str(import_error)
else:
    WIFI_MANAGER_IMPORT_ERROR = ""


BASE_DIR = Path(__file__).resolve().parent
BACKUP_DIR = BASE_DIR / "backups"

ROLE_LEVEL = {
    "VISITOR": 0,
    "USER": 0,
    "ADMINISTRATOR": 1,
    "OWNER": 2,
    "DEVELOPER": 3,
}

PRIVATE_BODY_KEYS = {
    "actor_id", "actor_role", "account_id", "author", "current_id", "current_role",
    "confirmation_code", "confirmation_text", "confirm", "confirmation",
}


# ==========================================================
# RESPONSE HELPERS
# ==========================================================

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
        return float(value)
    except Exception:
        return fallback


def int_id(value: Any) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def role_of(body: dict[str, Any] | None = None) -> str:
    body = body or {}
    role = clean_text(body.get("actor_role") or body.get("role") or "VISITOR").upper()
    return role if role in ROLE_LEVEL else "VISITOR"


def actor_id(body: dict[str, Any] | None = None) -> int:
    body = body or {}
    return int_id(body.get("actor_id") or body.get("account_id") or body.get("current_id"))


def actor_label(body: dict[str, Any] | None = None, fallback: str = "SYSTEM") -> str:
    body = body or {}
    if body.get("author"):
        return clean_text(body["author"])
    role = role_of(body) or fallback
    aid = actor_id(body)
    return f"{role}[{aid}]" if aid else role


def has_role(body: dict[str, Any] | None, required: str) -> bool:
    return ROLE_LEVEL.get(role_of(body), 0) >= ROLE_LEVEL.get(str(required).upper(), 0)


def require_role(body: dict[str, Any] | None, required: str) -> dict[str, Any] | None:
    if not has_role(body, required):
        return fail(
            f"{required.upper()} role or higher is required.",
            {"actor_role": role_of(body), "required_role": required.upper()},
        )
    return None


def require_confirmation(body: dict[str, Any] | None, min_length: int = 16) -> dict[str, Any] | None:
    body = body or {}
    code = clean_text(body.get("confirmation_code") or body.get("confirm") or body.get("confirmation"))
    typed = clean_text(body.get("confirmation_text") or body.get("typed_confirmation") or body.get("confirmation_input"))

    if len(code) < min_length:
        return fail(f"Confirmation code must be at least {min_length} characters.")

    if code != typed:
        return fail("Confirmation code does not match.")

    if not any(ch.isalpha() for ch in code) or not any(ch.isdigit() for ch in code):
        return fail("Confirmation code must include letters and numbers.")

    return None


def log(action: str, author: str = "SYSTEM") -> None:
    try:
        if db is not None:
            db.write_log(action, author)
    except Exception:
        pass


def table_columns(table: str) -> set[str]:
    with db.connect() as conn:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return {str(row[1]) for row in rows}


def filter_payload_for_table(table: str, payload: dict[str, Any]) -> dict[str, Any]:
    columns = table_columns(table)
    output = {}
    for key, value in dict(payload or {}).items():
        if key in PRIVATE_BODY_KEYS:
            continue
        if key in columns:
            output[key] = value
    return output


def normalize_array(value: Any) -> list[Any]:
    parsed = parse_json(value, value)
    if parsed is None or parsed == "":
        return []
    if isinstance(parsed, list):
        return [item for item in parsed if item not in (None, "")]
    return [parsed]


def plain_from_html(value: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", str(value or ""), flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def is_email(value: Any) -> bool:
    text = clean_text(value)
    return "@" in text and "." in text


def normalize_phone(value: Any) -> str:
    return clean_text(value)

def prepare_database_editor_payload(table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize values coming from the Software database table editor.

    SQLite cannot bind Python list/dict values directly, so JSON-like fields
    must be stored as JSON strings before calling generic database.py CRUD.
    """
    prepared: dict[str, Any] = {}

    json_like_columns = {
        "emails",
        "numbers",
        "links",
        "roles",
        "visited",
        "meta",
        "metadata",
        "settings",
        "config",
    }

    for key, value in dict(payload or {}).items():
        if key in PRIVATE_BODY_KEYS:
            continue

        # Never update primary key through editable cell payload.
        if key == "id":
            continue

        # Avoid accidental password destruction from database grid.
        # Password changes should go through profile/superuser tools.
        if table_name == "superusers" and key in {"password", "password_hash"}:
            continue

        if key in json_like_columns and isinstance(value, (list, dict)):
            prepared[key] = dump_json(value)
            continue

        if isinstance(value, (list, dict)):
            prepared[key] = dump_json(value)
            continue

        prepared[key] = value

    return prepared

# ==========================================================
# SUMMARY / CONFIG
# ==========================================================

def summary(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    body = body or {}
    role = role_of(body)

    counts = db.get_system_status().get("counts", {})
    settings = settings_map()
    api_status = {}

    if api_manager is not None:
        try:
            api_status = api_manager.get_api_status()
        except Exception as exc:
            api_status = {"error": str(exc)}

    data = {
        "role": role,
        "access": {
            "configuration": has_role(body, "ADMINISTRATOR"),
            "rates": has_role(body, "ADMINISTRATOR"),
            "themes_add": has_role(body, "ADMINISTRATOR"),
            "themes_delete": has_role(body, "OWNER"),
            "themes_reorder": has_role(body, "OWNER"),
            "logs_view": has_role(body, "ADMINISTRATOR"),
            "logs_delete": has_role(body, "OWNER"),
            "logs_download": has_role(body, "OWNER"),
            "announcement": has_role(body, "ADMINISTRATOR"),
            "bonus": has_role(body, "OWNER"),
            "maintenance": has_role(body, "DEVELOPER"),
            "database": has_role(body, "DEVELOPER"),
            "backups": has_role(body, "DEVELOPER"),
            "device": has_role(body, "DEVELOPER"),
            "connection": has_role(body, "ADMINISTRATOR"),
            "payment_bridge": has_role(body, "DEVELOPER"),
        },
        "counts": counts,
        "rates": get_rates_data(),
        "device": get_device_data(),
        "connection": get_connection_data(),
        "payment_bridge": get_payment_bridge_data(mask_secret=True),
        "providers": api_status,
        "settings": settings,
    }

    return ok("Software summary loaded.", data)


def settings_map() -> dict[str, Any]:
    output: dict[str, Any] = {}
    for row in db.get_settings():
        output[str(row.get("key"))] = row.get("value")
    return output


def get_rates_data() -> dict[str, float]:
    settings = settings_map()
    base_rate = number(settings.get("base_rate", settings.get("baseRate", 15)), 15)
    tenant_rate = number(settings.get("tenant_rate", settings.get("tenantRate", 20)), 20)
    return {
        "base_rate": base_rate,
        "tenant_rate": tenant_rate,
        "income_per_kwh": tenant_rate - base_rate,
    }


def update_rates(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    base_rate = number(body.get("base_rate", body.get("baseRate")), -1)
    tenant_rate = number(body.get("tenant_rate", body.get("tenantRate")), -1)

    if base_rate < 0:
        return fail("Base rate must be 0 or higher.")

    if tenant_rate < 0:
        return fail("Tenant rate must be 0 or higher.")

    author = actor_label(body)
    db.update_setting("base_rate", {"value": base_rate, "author": author})
    db.update_setting("tenant_rate", {"value": tenant_rate, "author": author})

    data = get_rates_data()
    log(f"{author} updated SOFTWARE rates: base ₱{base_rate}, tenant ₱{tenant_rate}", author)

    return ok("Rates updated.", data)


# ==========================================================
# THEMES
# ==========================================================

def create_theme(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    payload = filter_payload_for_table("themes", body)
    if not payload.get("name"):
        return fail("Theme name is required.")

    if "priority" not in payload:
        try:
            payload["priority"] = len(db.get_themes()) + 1
        except Exception:
            payload["priority"] = 1

    row = db.create_theme({**payload, "author": actor_label(body)})
    return ok("Theme created.", row)


def delete_theme(theme_id: int, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "OWNER")
    if missing:
        return missing

    row = db.delete_theme(theme_id, actor_label(body))
    return ok("Theme deleted.", row)


def reorder_themes(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "OWNER")
    if missing:
        return missing

    result = db.set_theme_priority({**body, "author": actor_label(body)})
    return ok("Theme priority updated.", result)


# ==========================================================
# RECIPIENTS / ANNOUNCEMENTS
# ==========================================================

def recipients(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "ADMINISTRATOR")
    if missing:
        return missing

    users = []
    operators = []
    developers = []

    for user in db.get_users():
        users.append({
            "type": "USER",
            "id": user.get("id"),
            "name": user.get("name"),
            "emails": [item for item in normalize_array(user.get("emails")) if is_email(item)],
            "numbers": [normalize_phone(item) for item in normalize_array(user.get("numbers")) if normalize_phone(item)],
        })

    for account in db.get_superusers():
        item = {
            "type": account.get("role"),
            "id": account.get("id"),
            "name": account.get("name"),
            "username": account.get("username"),
            "emails": [item for item in normalize_array(account.get("emails")) if is_email(item)],
            "numbers": [normalize_phone(item) for item in normalize_array(account.get("numbers")) if normalize_phone(item)],
        }

        if account.get("role") == "DEVELOPER":
            developers.append(item)
        else:
            operators.append(item)

    return ok("Recipients loaded.", {
        "users": users,
        "operators": operators,
        "developers": developers,
        "all": users + operators + developers,
    })


def _normalize_receiver_list(value: Any) -> list[str]:
    output: list[str] = []
    for item in normalize_array(value):
        if isinstance(item, dict):
            raw = item.get("value") or item.get("email") or item.get("number") or item.get("to")
        else:
            raw = item
        text = clean_text(raw)
        if text and text not in output:
            output.append(text)
    return output


def send_email_announcement(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    if api_manager is None:
        return fail("api_manager.py is not ready.", {"detail": API_MANAGER_IMPORT_ERROR})

    receivers = _normalize_receiver_list(body.get("receivers") or body.get("emails") or body.get("to"))
    subject = clean_text(body.get("title") or body.get("subject"))
    html = clean_text(body.get("html") or body.get("email") or body.get("message"))

    if not receivers:
        return fail("At least one email receiver is required.")
    if not subject:
        return fail("Email title is required.")
    if not html:
        return fail("Email body is required.")

    author = actor_label(body)
    results = []

    for receiver in receivers:
        if not is_email(receiver):
            results.append({"to": receiver, "ok": False, "message": "Invalid email."})
            continue

        result = api_manager.send_email(
            to_email=receiver,
            subject=subject,
            html_body=html,
            text_body=plain_from_html(html),
        )
        results.append(result)

    sent = sum(1 for item in results if item.get("ok"))
    failed = len(results) - sent
    log(f"{author} sent EMAIL announcement to {sent} receiver(s), {failed} failed", author)

    return ok("Email announcement processed.", {
        "sent": sent,
        "failed": failed,
        "results": results,
    })


def send_sms_announcement(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    if api_manager is None:
        return fail("api_manager.py is not ready.", {"detail": API_MANAGER_IMPORT_ERROR})

    receivers = _normalize_receiver_list(body.get("receivers") or body.get("numbers") or body.get("to"))
    message = clean_text(body.get("sms") or body.get("message") or body.get("text"))

    if not receivers:
        return fail("At least one SMS receiver is required.")
    if not message:
        return fail("SMS message is required.")

    author = actor_label(body)
    results = []

    for receiver in receivers:
        result = api_manager.send_sms(receiver, message)
        results.append(result)

    sent = sum(1 for item in results if item.get("ok"))
    failed = len(results) - sent
    log(f"{author} sent SMS announcement to {sent} receiver(s), {failed} failed", author)

    return ok("SMS announcement processed.", {
        "sent": sent,
        "failed": failed,
        "results": results,
    })


# ==========================================================
# BONUS / BALANCE TOOLS
# ==========================================================

def _selected_card_ids(body: dict[str, Any]) -> list[int]:
    raw = body.get("card_ids") or body.get("cards") or body.get("selected_cards") or []
    output = []
    for item in normalize_array(raw):
        if isinstance(item, dict):
            cid = int_id(item.get("id") or item.get("card_id"))
        else:
            cid = int_id(item)
        if cid > 0 and cid not in output:
            output.append(cid)
    return output


def apply_bonus(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "OWNER") or require_confirmation(body)
    if missing:
        return missing

    amount = number(body.get("amount"), 0)
    if amount == 0:
        return fail("Balance amount must not be 0.")

    card_ids = _selected_card_ids(body)
    apply_all = bool(body.get("all") or body.get("select_all"))

    if not apply_all and not card_ids:
        return fail("Select at least one card or choose all.")

    author = actor_label(body)
    notify = bool(body.get("notify"))
    notify_email = bool(body.get("notify_email"))
    notify_sms = bool(body.get("notify_sms"))
    notify_message = clean_text(body.get("notify_message") or body.get("message") or "")
    title = "ElectriCredit Bonus" if amount > 0 else "ElectriCredit Balance Adjustment"

    sql = "SELECT * FROM cards"
    params: list[Any] = []

    if not apply_all:
        placeholders = ",".join(["?"] * len(card_ids))
        sql += f" WHERE id IN ({placeholders})"
        params = card_ids

    with db.connect() as conn:
        cards = [dict(row) for row in conn.execute(sql, params).fetchall()]
        applied = []
        notify_results = []

        for card in cards:
            new_balance = number(card.get("balance"), 0) + amount
            conn.execute(
                "UPDATE cards SET balance = ? WHERE id = ?",
                (new_balance, int(card["id"])),
            )
            applied.append({
                "card_id": card["id"],
                "user_id": card.get("user_id"),
                "old_balance": number(card.get("balance"), 0),
                "new_balance": new_balance,
                "amount": amount,
            })

        conn.commit()

    if notify and (notify_email or notify_sms) and api_manager is not None:
        for item in applied:
            user = db.get_row("users", int(item["user_id"])) if item.get("user_id") else None
            if not user:
                continue

            message = notify_message or f"Your ElectriCredit card CARD[{item['card_id']}] balance was adjusted by ₱{amount:.2f}."
            if notify_email:
                for email in normalize_array(user.get("emails")):
                    if is_email(email):
                        notify_results.append(api_manager.send_email(
                            to_email=email,
                            subject=title,
                            html_body=f"<p>{message}</p>",
                            text_body=message,
                        ))
            if notify_sms:
                for number_value in normalize_array(user.get("numbers")):
                    phone = normalize_phone(number_value)
                    if phone:
                        notify_results.append(api_manager.send_sms(phone, message))

    log(f"{author} applied balance adjustment ₱{amount:.2f} to {len(applied)} CARD record(s)", author)

    return ok("Balance adjustment applied.", {
        "amount": amount,
        "applied": applied,
        "notify_results": notify_results,
    })


def set_all_balance(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    amount = number(body.get("amount"), None)
    if amount is None:
        return fail("Amount is required.")

    author = actor_label(body)

    with db.connect() as conn:
        conn.execute("UPDATE cards SET balance = ?", (amount,))
        affected = conn.total_changes
        conn.commit()

    log(f"{author} set all CARD balances to ₱{amount:.2f}", author)

    return ok("All balances updated.", {
        "amount": amount,
        "affected": affected,
    })


# ==========================================================
# LOG TOOLS
# ==========================================================

def get_logs(body: dict[str, Any] | None = None, query: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    limit = int_id((query or {}).get("limit") or body.get("limit") or 200)
    logs = db.get_logs(limit=max(1, min(limit, 1000)))

    return ok("Logs loaded.", {
        "items": logs,
        "total": len(logs),
    })


def download_logs(body: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}
    missing = require_db() or require_role(body, "OWNER")
    if missing:
        return missing

    logs = db.get_logs(limit=1000)
    lines = ["id,datetime,author,action"]

    for row in logs:
        lines.append(",".join([
            str(row.get("id", "")),
            '"' + str(row.get("datetime", "")).replace('"', '""') + '"',
            '"' + str(row.get("author", "")).replace('"', '""') + '"',
            '"' + str(row.get("action", "")).replace('"', '""') + '"',
        ]))

    return ok("Logs prepared for download.", {
        "filename": f"electricredit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        "content_type": "text/csv",
        "content": "\n".join(lines),
    })


def backup_and_clear_logs(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "OWNER") or require_confirmation(body)
    if missing:
        return missing

    author = actor_label(body)
    backup = db.create_backup({
        "author": author,
        "reason": "Before clearing logs from Software",
    })

    if log_manager is not None:
        result = log_manager.clear_logs(author)
    else:
        result = db.clear_logs({"author": author})

    log(f"{author} cleared LOGS after creating BACKUP[{backup.get('id')}]", author)

    return ok("Logs backed up and cleared.", {
        "backup": backup,
        "clear_result": result,
    })


# ==========================================================
# DEVICE / SERVER MAINTENANCE
# ==========================================================


DEVICE_SETTING_KEYS = [
    # Device identity
    "device_id",
    "electricredit_device_id",

    # Bridge identity
    "bridge_id",
    "payment_bridge_id",
    "payment_bridge_owner_id",
    "payment_bridge_system_id",

    # Payment bridge API
    "payment_bridge_url",
    "payment_bridge_api_key",
    "payment_bridge_secret",
    "payment_bridge_status",
    "payment_bridge_mode",

    # Connection / local network
    "internet_status",
    "hotspot_name",
    "hotspot_password",
    "local_server_url",
    "network_mode",
    "wifi_status",
    "wifi_ssid",
    "wifi_ip",
]

CONNECTION_SETTING_KEYS = [
    "hotspot_name",
    "hotspot_password",
    "local_server_url",
    "payment_bridge_url",
    "network_mode",
    "internet_status",
    "wifi_status",
    "wifi_ssid",
    "wifi_ip",
]

PAYMENT_BRIDGE_SETTING_KEYS = [
    "payment_bridge_url",
    "payment_bridge_owner_id",
    "payment_bridge_system_id",
    "payment_bridge_api_key",
    "payment_bridge_secret",
    "payment_bridge_status",
    "payment_bridge_mode",
    "bridge_id",
    "payment_bridge_id",
]

VALID_NETWORK_MODES = {
    "local_only",
    "payment_only",
    "live_online",

    # Keep old values accepted so old database rows do not break.
    "lan_bridge_ready",
    "payment_bridge_ready",
}

VALID_PAYMENT_BRIDGE_MODES = {
    "disabled",
    "sandbox",
    "production",
}

VALID_PAYMENT_BRIDGE_STATUS = {
    "not_configured",
    "testing",
    "connected",
    "disabled",
}

SENSITIVE_DEVICE_KEYS = {
    "payment_bridge_api_key",
    "payment_bridge_secret",
    "hotspot_password",
}


def mask_secret(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    if len(text) <= 4:
        return "••••"
    return "•" * max(4, len(text) - 4) + text[-4:]


def get_payment_bridge_data(mask_secret: bool = True) -> dict[str, Any]:
    settings = settings_map()
    api_key = settings.get("payment_bridge_api_key", "")
    secret = settings.get("payment_bridge_secret", "")

    return {
        "configured": bool(settings.get("payment_bridge_url") and settings.get("payment_bridge_system_id")),
        "url": settings.get("payment_bridge_url", ""),
        "owner_id": settings.get("payment_bridge_owner_id", ""),
        "system_id": settings.get("payment_bridge_system_id", settings.get("payment_bridge_id", "")),
        "bridge_id": settings.get("bridge_id", settings.get("payment_bridge_id", "")),
        "payment_bridge_id": settings.get("payment_bridge_id", settings.get("bridge_id", "")),
        "mode": settings.get("payment_bridge_mode", "disabled"),
        "status": settings.get("payment_bridge_status", "not_configured"),
        "api_key": mask_secret_value(api_key) if mask_secret else api_key,
        "secret": mask_secret_value(secret) if mask_secret else secret,
    }


def mask_secret_value(value: Any) -> str:
    return mask_secret(value)


def get_connection_data() -> dict[str, Any]:
    settings = settings_map()

    base = {
        "internet_status": settings.get("internet_status", "unknown"),
        "hotspot_name": settings.get("hotspot_name", "ElectriCredit"),
        "hotspot_password": mask_secret(settings.get("hotspot_password", "")),
        "local_server_url": settings.get("local_server_url", "http://192.168.4.1:5000"),
        "payment_bridge_url": settings.get("payment_bridge_url", ""),
        "network_mode": settings.get("network_mode", "local_only"),
        "wifi_status": settings.get("wifi_status", "unknown"),
        "wifi_ssid": settings.get("wifi_ssid", ""),
        "wifi_ip": settings.get("wifi_ip", ""),
    }

    if wifi_manager is not None:
        try:
            detected = wifi_manager.get_connection_status(settings)

            # Do not let detected status erase saved settings such as
            # hotspot_password, local_server_url, or payment_bridge_url.
            base.update(detected)
            base["hotspot_password"] = mask_secret(settings.get("hotspot_password", ""))
            base["local_server_url"] = settings.get("local_server_url", "http://192.168.4.1:5000")
            base["payment_bridge_url"] = settings.get("payment_bridge_url", "")
            base["network_mode"] = settings.get("network_mode", base.get("network_mode", "local_only"))
            base["hotspot_name"] = settings.get("hotspot_name", base.get("hotspot_name", "ElectriCredit"))
        except Exception as exc:
            base["message"] = f"wifi_manager status failed: {exc}"
    else:
        base["message"] = f"wifi_manager.py is not ready. {WIFI_MANAGER_IMPORT_ERROR}"

    return base


def get_device_data() -> dict[str, Any]:
    settings = settings_map()
    bridge = get_payment_bridge_data(mask_secret=True)
    connection = get_connection_data()

    return {
        "device_id": settings.get("device_id", settings.get("electricredit_device_id", "ELECTRICREDIT-LOCAL-001")),
        "electricredit_device_id": settings.get("electricredit_device_id", settings.get("device_id", "ELECTRICREDIT-LOCAL-001")),

        "bridge_id": settings.get("bridge_id", settings.get("payment_bridge_id", "")),
        "payment_bridge_id": settings.get("payment_bridge_id", settings.get("bridge_id", "")),

        "payment_bridge_url": settings.get("payment_bridge_url", ""),
        "payment_bridge_owner_id": settings.get("payment_bridge_owner_id", ""),
        "payment_bridge_system_id": settings.get("payment_bridge_system_id", ""),
        "payment_bridge_api_key": bridge.get("api_key", ""),
        "payment_bridge_secret": bridge.get("secret", ""),
        "payment_bridge_status": settings.get("payment_bridge_status", bridge.get("status", "not_configured")),
        "payment_bridge_mode": settings.get("payment_bridge_mode", bridge.get("mode", "disabled")),

        "internet_status": connection.get("internet_status", "unknown"),
        "hotspot_name": connection.get("hotspot_name", "ElectriCredit"),
        "hotspot_password": connection.get("hotspot_password", ""),
        "local_server_url": connection.get("local_server_url", "http://192.168.4.1:5000"),
        "network_mode": connection.get("network_mode", "local_only"),
        "wifi_status": connection.get("wifi_status", "unknown"),
        "wifi_ssid": connection.get("wifi_ssid", ""),
        "wifi_ip": connection.get("wifi_ip", ""),
    }


def get_device(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "DEVELOPER")
    if missing:
        return missing
    return ok("Device settings loaded.", {
        "device": get_device_data(),
        "connection": get_connection_data(),
        "payment_bridge": get_payment_bridge_data(mask_secret=True),
    })


def update_device(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER")
    if missing:
        return missing

    # OTP is handled by profile.py/frontend flow.
    # Backend accepts either otp_verified=true or a confirmation code for dev testing.
    if not body.get("otp_verified"):
        confirm_error = require_confirmation(body)
        if confirm_error:
            return fail("OTP verification or confirmation code is required.", confirm_error.get("data"))

    requested_mode = clean_text(body.get("network_mode"))
    if requested_mode and requested_mode not in VALID_NETWORK_MODES:
        return fail(
            "Invalid network mode.",
            {
                "received": requested_mode,
                "allowed": sorted(VALID_NETWORK_MODES),
            },
        )

    requested_bridge_mode = clean_text(body.get("payment_bridge_mode"))
    if requested_bridge_mode and requested_bridge_mode not in VALID_PAYMENT_BRIDGE_MODES:
        return fail(
            "Invalid payment bridge mode.",
            {
                "received": requested_bridge_mode,
                "allowed": sorted(VALID_PAYMENT_BRIDGE_MODES),
            },
        )

    requested_bridge_status = clean_text(body.get("payment_bridge_status"))
    if requested_bridge_status and requested_bridge_status not in VALID_PAYMENT_BRIDGE_STATUS:
        return fail(
            "Invalid payment bridge status.",
            {
                "received": requested_bridge_status,
                "allowed": sorted(VALID_PAYMENT_BRIDGE_STATUS),
            },
        )

    author = actor_label(body)
    updated: dict[str, Any] = {}

    for key in DEVICE_SETTING_KEYS:
        if key not in body:
            continue

        value = clean_text(body.get(key))

        # Do not overwrite stored secrets/passwords with masked frontend values.
        if key in SENSITIVE_DEVICE_KEYS and (value.startswith("•") or value.startswith("*")):
            continue

        db.update_setting(key, {"value": value, "author": author})
        updated[key] = mask_secret(value) if key in SENSITIVE_DEVICE_KEYS else value

    log(f"{author} updated Software device/bridge/connection settings", author)

    return ok("Device settings updated.", {
        "updated": updated,
        "device": get_device_data(),
        "connection": get_connection_data(),
        "payment_bridge": get_payment_bridge_data(mask_secret=True),
    })


# ==========================================================
# CONNECTION / WIFI
# ==========================================================

def get_connection(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "ADMINISTRATOR")
    if missing:
        return missing
    return ok("Connection status loaded.", get_connection_data())


def scan_wifi(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "ADMINISTRATOR")
    if missing:
        return missing

    if wifi_manager is None:
        return fail("wifi_manager.py is not ready.", {"detail": WIFI_MANAGER_IMPORT_ERROR})

    result = wifi_manager.scan_networks()
    return ok("Wi-Fi scan completed.", result)


def connect_wifi(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    if wifi_manager is None:
        return fail("wifi_manager.py is not ready.", {"detail": WIFI_MANAGER_IMPORT_ERROR})

    ssid = clean_text(body.get("ssid") or body.get("wifi_ssid"))
    password = clean_text(body.get("password") or body.get("wifi_password"))

    if not ssid:
        return fail("SSID is required.")

    result = wifi_manager.connect_wifi(ssid, password)
    author = actor_label(body)

    db.update_setting("wifi_ssid", {"value": ssid, "author": author})
    db.update_setting("wifi_status", {"value": "connected" if result.get("connected") else "failed", "author": author})
    db.update_setting("internet_status", {"value": "unknown", "author": author})

    log(f"{author} requested Wi-Fi connection to {ssid}", author)

    return ok("Wi-Fi connection processed.", {
        "result": result,
        "connection": get_connection_data(),
    })


def forget_wifi(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    if wifi_manager is None:
        return fail("wifi_manager.py is not ready.", {"detail": WIFI_MANAGER_IMPORT_ERROR})

    ssid = clean_text(body.get("ssid") or body.get("wifi_ssid") or settings_map().get("wifi_ssid", ""))

    if not ssid:
        return fail("SSID is required.")

    result = wifi_manager.forget_wifi(ssid)
    author = actor_label(body)

    db.update_setting("wifi_ssid", {"value": "", "author": author})
    db.update_setting("wifi_status", {"value": "forgotten" if result.get("forgot") else "failed", "author": author})

    log(f"{author} requested Wi-Fi forget for {ssid}", author)

    return ok("Wi-Fi forget processed.", {
        "result": result,
        "connection": get_connection_data(),
    })


def update_connection(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "ADMINISTRATOR")
    if missing:
        return missing

    author = actor_label(body)
    updated: dict[str, Any] = {}

    requested_mode = clean_text(body.get("network_mode"))
    if requested_mode and requested_mode not in VALID_NETWORK_MODES:
        return fail(
            "Invalid network mode.",
            {
                "received": requested_mode,
                "allowed": sorted(VALID_NETWORK_MODES),
            },
        )

    if "hotspot_name" in body and wifi_manager is not None:
        try:
            result = wifi_manager.update_hotspot_name(clean_text(body.get("hotspot_name")))
            updated["hotspot_result"] = result
        except Exception as exc:
            updated["hotspot_error"] = str(exc)

    for key in CONNECTION_SETTING_KEYS:
        if key not in body:
            continue

        value = clean_text(body.get(key))

        # Do not overwrite saved password with an already-masked value.
        if key == "hotspot_password" and (value.startswith("•") or value.startswith("*")):
            continue

        db.update_setting(key, {"value": value, "author": author})
        updated[key] = mask_secret(value) if key in SENSITIVE_DEVICE_KEYS else value

    log(f"{author} updated Software connection settings", author)

    return ok("Connection settings updated.", {
        "updated": updated,
        "connection": get_connection_data(),
        "device": get_device_data(),
        "payment_bridge": get_payment_bridge_data(mask_secret=True),
    })


def get_payment_bridge(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "ADMINISTRATOR")
    if missing:
        return missing

    status = {}
    try:
        status = db.get_payment_bridge_status()
    except Exception as exc:
        status = {"error": str(exc)}

    return ok("Payment bridge status loaded.", {
        "settings": get_payment_bridge_data(mask_secret=True),
        "status": status,
    })


def update_payment_bridge(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER")
    if missing:
        return missing

    if not body.get("otp_verified"):
        confirm_error = require_confirmation(body)
        if confirm_error:
            return fail("OTP verification or confirmation code is required.", confirm_error.get("data"))

    requested_mode = clean_text(body.get("payment_bridge_mode"))
    if requested_mode and requested_mode not in VALID_PAYMENT_BRIDGE_MODES:
        return fail(
            "Invalid payment bridge mode.",
            {
                "received": requested_mode,
                "allowed": sorted(VALID_PAYMENT_BRIDGE_MODES),
            },
        )

    requested_status = clean_text(body.get("payment_bridge_status"))
    if requested_status and requested_status not in VALID_PAYMENT_BRIDGE_STATUS:
        return fail(
            "Invalid payment bridge status.",
            {
                "received": requested_status,
                "allowed": sorted(VALID_PAYMENT_BRIDGE_STATUS),
            },
        )

    author = actor_label(body)
    updated: dict[str, Any] = {}

    for key in PAYMENT_BRIDGE_SETTING_KEYS:
        if key not in body:
            continue

        value = clean_text(body.get(key))

        # Do not overwrite saved secrets with masked frontend values.
        if key in SENSITIVE_DEVICE_KEYS and (value.startswith("•") or value.startswith("*")):
            continue

        db.update_setting(key, {"value": value, "author": author})
        updated[key] = mask_secret(value) if key in SENSITIVE_DEVICE_KEYS else value

    log(f"{author} updated payment bridge settings", author)

    return ok("Payment bridge settings updated.", {
        "updated": updated,
        "device": get_device_data(),
        "payment_bridge": get_payment_bridge_data(mask_secret=True),
    })


# ==========================================================
# DATABASE MAINTENANCE
# ==========================================================

def get_database_tables(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "DEVELOPER")
    if missing:
        return missing

    return ok("Database tables loaded.", db.get_database_tables())


def get_database_table(table_name: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "DEVELOPER")
    if missing:
        return missing

    return ok("Database table loaded.", db.get_database_table(table_name))


def create_database_row(table_name: str, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER")
    if missing:
        return missing

    payload = prepare_database_editor_payload(table_name, body)
    row = db.create_database_row(table_name, {**payload, "author": actor_label(body)})
    return ok("Database row created.", row)


def update_database_row(table_name: str, row_id: int, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER")
    if missing:
        return missing

    payload = prepare_database_editor_payload(table_name, body)
    row = db.update_database_row(table_name, row_id, {**payload, "author": actor_label(body)})
    return ok("Database row updated.", row)


def delete_database_row(table_name: str, row_id: int, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    row = db.delete_database_row(table_name, row_id, actor_label(body))
    return ok("Database row deleted.", row)


def apply_database_batch(table_name: str, body: dict[str, Any]) -> dict[str, Any]:
    """
    Frontend database editor can stage edits and send one batch:
    {
      "create": [{...}],
      "update": [{"id": 1, "data": {...}}],
      "delete": [3, 4],
      "confirmation_code": "...",
      "confirmation_text": "..."
    }
    """
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    author = actor_label(body)
    db.create_backup({
        "author": author,
        "reason": f"Before database batch update on {table_name}",
    })

    created = []
    updated = []
    deleted = []

    for item in normalize_array(body.get("create")):
        if isinstance(item, dict):
            payload = prepare_database_editor_payload(table_name, item)
            created.append(db.create_database_row(table_name, {**payload, "author": author}))

    for item in normalize_array(body.get("update")):
        if not isinstance(item, dict):
            continue
        row_id = int_id(item.get("id") or item.get("row_id"))
        raw_payload = item.get("data") if isinstance(item.get("data"), dict) else {
            k: v for k, v in item.items() if k not in {"id", "row_id", *PRIVATE_BODY_KEYS}
        }

        payload = prepare_database_editor_payload(table_name, raw_payload)

        if row_id > 0:
            updated.append(db.update_database_row(table_name, row_id, {**payload, "author": author}))

    for item in normalize_array(body.get("delete")):
        row_id = int_id(item.get("id") if isinstance(item, dict) else item)
        if row_id > 0:
            deleted.append(db.delete_database_row(table_name, row_id, author))

    log(f"{author} applied database batch on {table_name}", author)

    return ok("Database batch applied.", {
        "table": table_name,
        "created": created,
        "updated": updated,
        "deleted": deleted,
    })


def clear_database_table(table_name: str, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    protected_table = clean_text(table_name).lower()

    if protected_table == "backups":
        return fail(
            "Backups cannot be cleared from the Database table editor. Use the Backup section instead so backup files and backup rows stay synced.",
            {
                "table": table_name,
                "safe_section": "Software > Maintenance > Backup",
            },
        )

    author = actor_label(body)
    result = db.clear_database_table(table_name, author)
    log(f"{author} cleared database table {table_name}", author)

    return ok("Database table cleared.", result)


def clear_database_tables(body: dict[str, Any]) -> dict[str, Any]:
    """
    Clear multiple database tables from the Software > Maintenance > Database tool.

    Frontend flow:
    1. Developer selects one or more tables.
    2. Frontend verifies OTP through /api/auth/verify-otp.
    3. Frontend opens the shared 16-character validator.
    4. This endpoint receives the selected tables + confirmation payload.

    Safety notes:
    - Developer-only.
    - Confirmation code is still enforced here.
    - Backups table is protected here; use Backup section for backup rows/files.
    - One database backup is created before clearing the selected tables.
    """
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    raw_tables = body.get("tables") or body.get("selected_tables") or []
    if isinstance(raw_tables, str):
        raw_tables = [raw_tables]

    requested: list[str] = []
    for table in raw_tables:
        name = clean_text(table)
        if name and name not in requested:
            requested.append(name)

    if not requested:
        return fail("Select at least one table to clear.")

    protected = {"backups"}
    blocked = [table for table in requested if table.lower() in protected]
    if blocked:
        return fail(
            "Some tables cannot be cleared from the Database editor.",
            {
                "blocked": blocked,
                "safe_section": "Software > Maintenance > Backup",
            },
        )

    # Validate allowed table names before doing anything destructive.
    for table in requested:
        try:
            db.ensure_table_allowed(table)
        except Exception as exc:
            return fail(f"Table is not allowed: {table}", {"error": str(exc)})

    author = actor_label(body)
    db.create_backup({
        "author": author,
        "reason": f"Before clearing database tables: {', '.join(requested)}",
    })

    cleared: list[dict[str, Any]] = []

    try:
        with db.connect() as conn:
            conn.execute("PRAGMA foreign_keys = OFF")
            for table in requested:
                before_row = conn.execute(f"SELECT COUNT(*) AS total FROM {table}").fetchone()
                before = int(before_row["total"] or 0)
                conn.execute(f"DELETE FROM {table}")
                # Reset AUTOINCREMENT counter when present.
                try:
                    conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
                except Exception:
                    pass
                cleared.append({"table": table, "removed": before})
            conn.commit()
            conn.execute("PRAGMA foreign_keys = ON")
    except Exception as exc:
        return fail("Unable to clear selected tables.", {"error": str(exc), "tables": requested})

    log(f"{author} cleared database tables: {', '.join(requested)}", author)

    return ok("Selected database tables cleared.", {
        "tables": requested,
        "cleared": cleared,
        "backup_created": True,
    })


# ==========================================================
# BACKUPS
# ==========================================================

def get_backups(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db() or require_role(body or {}, "DEVELOPER")
    if missing:
        return missing

    rows = db.get_backups()
    items = []

    for row in rows:
        item = dict(row)
        path = BACKUP_DIR / str(item.get("filename", ""))
        item["exists"] = path.exists()
        item["size_bytes"] = path.stat().st_size if path.exists() else 0
        items.append(item)

    return ok("Backups loaded.", {
        "items": items,
        "total": len(items),
    })


def create_backup(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER")
    if missing:
        return missing

    row = db.create_backup({
        "author": actor_label(body),
        "reason": clean_text(body.get("reason") or "Software manual backup"),
    })

    return ok("Backup created.", row)


def restore_backup(backup_id: int, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    row = db.restore_backup(backup_id, {
        "author": actor_label(body),
        "reason": clean_text(body.get("reason") or "Software backup restore"),
    })

    return ok("Backup restored.", row)


def delete_backup(backup_id: int, body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    row = db.delete_backup(backup_id, actor_label(body))
    return ok("Backup deleted.", row)


def bulk_delete_backups(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db() or require_role(body, "DEVELOPER") or require_confirmation(body)
    if missing:
        return missing

    ids = [int_id(item.get("id") if isinstance(item, dict) else item) for item in normalize_array(body.get("ids") or body.get("backup_ids"))]
    ids = [backup_id for backup_id in ids if backup_id > 0]

    if not ids:
        return fail("Select at least one backup.")

    deleted = []
    author = actor_label(body)
    for backup_id in ids:
        deleted.append(db.delete_backup(backup_id, author))

    return ok("Selected backups deleted.", {
        "deleted": deleted,
    })


def download_backup(backup_id: int, body: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}
    missing = require_db() or require_role(body, "DEVELOPER")
    if missing:
        return missing

    row = db.get_row("backups", backup_id)
    if not row:
        return fail("Backup not found.")

    filename = str(row.get("filename") or "")
    path = BACKUP_DIR / filename
    if not path.exists():
        return fail("Backup file does not exist.", {"filename": filename})

    # Return path metadata. routing.py can later be upgraded to send_file.
    return ok("Backup prepared for download.", {
        "filename": filename,
        "path": str(path),
        "size_bytes": path.stat().st_size,
    })

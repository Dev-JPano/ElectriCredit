"""
============================================================
ELECTRICREDIT V2 - ESP32 MODULE COMMUNICATION BACKEND
File: module.py

Purpose:
- Lightweight HTTP backend for direct ESP32 Hub and Registry requests.
- Keep ESP32 modules simple: they send MAC/UID/progress, Raspberry Pi handles DB logic.
- Hub flow:
  1) Hub sends card UID to server.
  2) Server returns full card/user/balance/debt-limit details.
  3) Hub starts a session only if card is registered and allowed.
  4) Hub checkpoints usage every 0.25 kWh minimum.
  5) Hub stops/finalizes session when terminated/card removed/out of balance/debt limit.
- Registry flow:
  1) Registry sends card UID to server.
  2) Server returns full card/user details.
  3) Registry activates coin-slot top-up only when card is registered and allowed.
  4) Registry sends final top-up amount when card is removed/unplugged.
  5) Server updates card balance and records a transaction.

UI device recorder note:
- Browsers cannot normally expose the real client MAC address.
- On Raspberry Pi/Linux, this file tries ARP/IP-neighbor lookup using the request IP.
- On Windows/dev machines, or when MAC cannot be resolved, it stores a stable
  UNKNOWN:<hash> fallback based on IP + User-Agent.
- If later your frontend/device can send X-Device-Mac, that value is preferred.
- The devices table format is expected as:
  id | mac | device | visited
============================================================
"""

from __future__ import annotations

import hashlib
import json
import platform
import re
import subprocess
from datetime import datetime
from typing import Any

try:
    from database import database as db
except Exception as import_error:  # pragma: no cover
    db = None
    DB_IMPORT_ERROR = str(import_error)
else:
    DB_IMPORT_ERROR = ""


MIN_HUB_CHECKPOINT_KWH = 0.25
ROLE_LEVEL = {"VISITOR": 0, "USER": 0, "ADMINISTRATOR": 1, "OWNER": 2, "DEVELOPER": 3}


# ==========================================================
# RESPONSE / BASIC HELPERS
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


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_uid(value: Any) -> str:
    raw = clean_text(value)
    if not raw:
        return ""
    try:
        return db.normalize_uid(raw)
    except Exception:
        return "".join(ch for ch in raw if ch.isalnum()).upper()


def normalize_mac(value: Any) -> str:
    raw = "".join(ch for ch in str(value or "") if ch.isalnum()).upper()
    if len(raw) == 12:
        return ":".join(raw[index:index + 2] for index in range(0, 12, 2))
    return clean_text(value).upper()


def is_valid_mac(value: Any) -> bool:
    raw = "".join(ch for ch in str(value or "") if ch.isalnum()).upper()
    return len(raw) == 12 and all(ch in "0123456789ABCDEF" for ch in raw)


def actor_label(body: dict[str, Any] | None = None, fallback: str = "MODULE") -> str:
    body = body or {}
    if body.get("author"):
        return clean_text(body["author"])
    role = clean_text(body.get("actor_role") or body.get("role") or fallback).upper()
    actor_id = body.get("actor_id") or body.get("account_id") or body.get("current_id")
    return f"{role}[{actor_id}]" if actor_id else role


def role_of(body: dict[str, Any] | None = None) -> str:
    body = body or {}
    role = clean_text(body.get("actor_role") or body.get("role") or "VISITOR").upper()
    return role if role in ROLE_LEVEL else "VISITOR"


def has_role(body: dict[str, Any] | None, required: str) -> bool:
    return ROLE_LEVEL.get(role_of(body), 0) >= ROLE_LEVEL.get(str(required).upper(), 0)


def log(action: str, author: str = "MODULE") -> None:
    try:
        if db is not None:
            db.write_log(action, author)
    except Exception:
        pass


# ==========================================================
# DB LOW-LEVEL HELPERS
# ==========================================================

def _row_to_dict(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def _rows_to_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def _setting(key: str, fallback: Any = None) -> Any:
    try:
        with db.connect() as conn:
            row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else fallback
    except Exception:
        return fallback


def tenant_rate() -> float:
    return number(_setting("tenant_rate", _setting("tenantRate", 20)), 20)


def _table_columns(table_name: str) -> set[str]:
    try:
        with db.connect() as conn:
            rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        return {str(row[1]) for row in rows}
    except Exception:
        return set()


def _filter_payload(table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    columns = _table_columns(table_name)
    if not columns:
        return dict(payload)
    return {key: value for key, value in payload.items() if key in columns}


def ensure_devices_table() -> None:
    """
    Creates devices table if older local DB copies do not have it yet.
    Your current DB already has:
      id | mac | device | visited
    """
    with db.connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mac TEXT,
                device TEXT,
                visited TEXT DEFAULT '[]'
            )
            """
        )
        conn.commit()


def _find_hardware_by_mac(table: str, mac: str) -> dict[str, Any] | None:
    normalized = normalize_mac(mac)
    with db.connect() as conn:
        row = conn.execute(f"SELECT * FROM {table} WHERE UPPER(mac) = ?", (normalized.upper(),)).fetchone()
    return _row_to_dict(row)


def _find_hardware_by_id(table: str, row_id: Any) -> dict[str, Any] | None:
    hid = int_id(row_id)
    if hid <= 0:
        return None
    with db.connect() as conn:
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (hid,)).fetchone()
    return _row_to_dict(row)


def _resolve_hub(body: dict[str, Any]) -> dict[str, Any] | None:
    return _find_hardware_by_id("hubs", body.get("hub_id") or body.get("id")) or _find_hardware_by_mac("hubs", body.get("mac"))


def _resolve_registry(body: dict[str, Any]) -> dict[str, Any] | None:
    return (
        _find_hardware_by_id("registry_stations", body.get("registry_station_id") or body.get("registry_id") or body.get("id"))
        or _find_hardware_by_mac("registry_stations", body.get("mac"))
    )


def _find_card_by_uid(uid: str) -> dict[str, Any] | None:
    normalized = normalize_uid(uid)
    if not normalized:
        return None
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM cards WHERE UPPER(uid) = ?", (normalized.upper(),)).fetchone()
    return _row_to_dict(row)


def _find_card_by_id(card_id: Any) -> dict[str, Any] | None:
    cid = int_id(card_id)
    if cid <= 0:
        return None
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM cards WHERE id = ?", (cid,)).fetchone()
    return _row_to_dict(row)


def _find_user(user_id: Any) -> dict[str, Any] | None:
    uid = int_id(user_id)
    if uid <= 0:
        return None
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    return _row_to_dict(row)


def _public_user(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if not user:
        return None
    emails = parse_json(user.get("emails"), [])
    numbers = parse_json(user.get("numbers"), [])
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "gender": user.get("gender"),
        "image": user.get("image", ""),
        "emails": emails if isinstance(emails, list) else [],
        "numbers": numbers if isinstance(numbers, list) else [],
    }


def _card_allowed(card: dict[str, Any]) -> tuple[bool, str]:
    status = clean_text(card.get("status") or "active").lower()
    if status in {"banned", "disabled", "blocked"}:
        return False, f"Card is {status}."

    balance = number(card.get("balance"))
    debt_limit = abs(number(card.get("debt_limit"), 100))

    if debt_limit > 0 and balance <= -debt_limit:
        return False, "Debt limit reached. Power must be cut off."

    return True, "Card is allowed."


def _public_card(card: dict[str, Any] | None) -> dict[str, Any] | None:
    if not card:
        return None

    user = _find_user(card.get("user_id"))
    balance = number(card.get("balance"))
    debt_limit = abs(number(card.get("debt_limit"), 100))
    allowed, reason = _card_allowed(card)

    return {
        "id": card.get("id"),
        "uid": card.get("uid"),
        "user_id": card.get("user_id"),
        "balance": balance,
        "debt_limit": debt_limit,
        "used_kwh": number(card.get("used_kwh")),
        "status": card.get("status") or "active",
        "allowed": allowed,
        "reason": reason,
        "has_debt": balance < 0,
        "cutoff": debt_limit > 0 and balance <= -debt_limit,
        "remaining_until_cutoff": round(max(0, balance + debt_limit), 2),
        "user": _public_user(user),
    }


def _public_hub(hub: dict[str, Any] | None) -> dict[str, Any] | None:
    if not hub:
        return None
    status = parse_json(hub.get("status"), {})
    return {
        "id": hub.get("id"),
        "mac": hub.get("mac"),
        "location": hub.get("location"),
        "status": status if isinstance(status, dict) else {},
        "consumed_kwh": number(hub.get("consumed_kwh")),
        "revenue": number(hub.get("revenue")),
        "created": hub.get("created"),
    }


def _public_registry(registry: dict[str, Any] | None) -> dict[str, Any] | None:
    if not registry:
        return None
    status = parse_json(registry.get("status"), {})
    return {
        "id": registry.get("id"),
        "mac": registry.get("mac"),
        "location": registry.get("location"),
        "status": status if isinstance(status, dict) else {},
        "created": registry.get("created"),
    }


def _active_session_for(card_id: int, hub_id: int | None = None) -> dict[str, Any] | None:
    sql = "SELECT * FROM sessions WHERE card_id = ? AND status = 'active'"
    values: list[Any] = [card_id]
    if hub_id:
        sql += " AND hub_id = ?"
        values.append(hub_id)
    sql += " ORDER BY id DESC LIMIT 1"
    with db.connect() as conn:
        row = conn.execute(sql, values).fetchone()
    return _row_to_dict(row)


def _public_session(session: dict[str, Any] | None) -> dict[str, Any] | None:
    if not session:
        return None
    return {
        "id": session.get("id"),
        "hub_id": session.get("hub_id"),
        "card_id": session.get("card_id"),
        "user_id": session.get("user_id"),
        "started": session.get("started"),
        "ended": session.get("ended"),
        "consumed_kwh": number(session.get("consumed_kwh")),
        "revenue": number(session.get("revenue")),
        "status": session.get("status"),
        "reason": session.get("reason"),
    }


# ==========================================================
# UI DEVICE VISIT RECORDER
# ==========================================================

def _request_ip(flask_request: Any) -> str:
    forwarded = clean_text(flask_request.headers.get("X-Forwarded-For") if flask_request else "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return clean_text(getattr(flask_request, "remote_addr", ""))


def _lookup_mac_from_ip(ip: str) -> str:
    """
    Best-effort LAN MAC resolver.
    Works only when the server OS has ARP/neigh table access.
    Raspberry Pi/Linux: ip neigh / arp -n
    Windows dev fallback: arp -a
    """
    ip = clean_text(ip)
    if not ip or ip in {"127.0.0.1", "::1", "localhost"}:
        return ""

    commands: list[list[str]]
    if platform.system().lower().startswith("win"):
        commands = [["arp", "-a", ip], ["arp", "-a"]]
    else:
        commands = [["ip", "neigh", "show", ip], ["arp", "-n", ip], ["ip", "neigh"]]

    mac_pattern = re.compile(r"([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})")

    for command in commands:
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=1.5)
            text = f"{result.stdout}\n{result.stderr}"
            match = mac_pattern.search(text)
            if match:
                return normalize_mac(match.group(0))
        except Exception:
            continue

    return ""


def _fallback_device_mac(ip: str, user_agent: str) -> str:
    digest = hashlib.sha1(f"{ip}|{user_agent}".encode("utf-8", errors="ignore")).hexdigest()[:12].upper()
    return f"UNKNOWN:{digest}"


def record_ui_visit_from_request(flask_request: Any) -> dict[str, Any]:
    """
    Called by routing.py when the main UI is requested.
    This should not break page loading; failures return error but are safe to ignore.
    """
    headers = getattr(flask_request, "headers", {}) if flask_request else {}
    ip = _request_ip(flask_request)
    user_agent = clean_text(headers.get("User-Agent", "Unknown device"))
    explicit_mac = clean_text(headers.get("X-Device-Mac") or headers.get("X-Client-Mac"))
    mac = normalize_mac(explicit_mac) if explicit_mac else _lookup_mac_from_ip(ip)
    if not mac:
        mac = _fallback_device_mac(ip, user_agent)

    return record_ui_visit({
        "mac": mac,
        "device": user_agent,
        "path": getattr(flask_request, "path", "/") if flask_request else "/",
        "ip": ip,
        "source": "ui_request",
    })


def record_ui_visit(body: dict[str, Any] | None = None) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    body = body or {}

    try:
        ensure_devices_table()

        mac = normalize_mac(body.get("mac"))
        if not mac:
            mac = _fallback_device_mac(clean_text(body.get("ip")), clean_text(body.get("device")))

        device = clean_text(body.get("device") or body.get("user_agent") or "Unknown device")
        visit = {
            "time": now_iso(),
            "path": clean_text(body.get("path") or "/"),
            "ip": clean_text(body.get("ip")),
            "source": clean_text(body.get("source") or "manual"),
        }

        with db.connect() as conn:
            row = conn.execute("SELECT * FROM devices WHERE mac = ? ORDER BY id DESC LIMIT 1", (mac,)).fetchone()
            if row:
                current = dict(row)
                visited = parse_json(current.get("visited"), [])
                if not isinstance(visited, list):
                    visited = []
                visited.append(visit)
                # Keep this small for Raspberry Pi storage.
                visited = visited[-50:]
                conn.execute(
                    "UPDATE devices SET device = ?, visited = ? WHERE id = ?",
                    (device, dump_json(visited), current["id"]),
                )
                device_id = current["id"]
            else:
                conn.execute(
                    "INSERT INTO devices (mac, device, visited) VALUES (?, ?, ?)",
                    (mac, device, dump_json([visit])),
                )
                device_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
            conn.commit()

        return ok("UI device visit recorded.", {"id": device_id, "mac": mac, "device": device, "visit": visit})
    except Exception as exc:
        return fail("Unable to record UI device visit.", {"error": str(exc)})


# ==========================================================
# HUB MODULE FLOW
# ==========================================================

def hub_card_lookup(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    hub = _resolve_hub(body)
    if not hub:
        return fail("Hub module is not registered.", {"code": "HUB_NOT_REGISTERED"})

    uid = normalize_uid(body.get("uid") or body.get("card_uid") or body.get("rfid_uid"))
    if not uid:
        return fail("Card UID is required.", {"field": "uid"})

    card = _find_card_by_uid(uid)
    if not card:
        return ok("Card is not registered. Contact an admin.", {
            "registered": False,
            "allowed": False,
            "code": "CARD_NOT_REGISTERED",
            "hub": _public_hub(hub),
            "uid": uid,
            "instruction": "Contact an admin to register this RFID card.",
        })

    public = _public_card(card)
    log(f"HUB[{hub['id']}] scanned CARD[{card['id']}]", "HUB")
    return ok("Card details loaded.", {
        "registered": True,
        "allowed": public["allowed"],
        "hub": _public_hub(hub),
        "card": public,
    })


def hub_session_start(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    hub = _resolve_hub(body)
    if not hub:
        return fail("Hub module is not registered.", {"code": "HUB_NOT_REGISTERED"})

    card = _find_card_by_id(body.get("card_id")) or _find_card_by_uid(body.get("uid") or body.get("card_uid") or body.get("rfid_uid"))
    if not card:
        return fail("Card is not registered. Contact an admin.", {"code": "CARD_NOT_REGISTERED"})

    allowed, reason = _card_allowed(card)
    if not allowed:
        return fail(reason, {"code": "CARD_NOT_ALLOWED", "card": _public_card(card), "should_cutoff": True})

    active = _active_session_for(int(card["id"]), int(hub["id"]))
    if active:
        return ok("Existing active session returned.", {
            "mode": "existing",
            "hub": _public_hub(hub),
            "card": _public_card(card),
            "session": _public_session(active),
            "checkpoint_kwh": MIN_HUB_CHECKPOINT_KWH,
        })

    now = now_iso()
    payload = {
        "hub_id": hub["id"],
        "card_id": card["id"],
        "user_id": card["user_id"],
        "started": now,
        "ended": "",
        "consumed_kwh": 0,
        "revenue": 0,
        "status": "active",
        "reason": "ESP32 Hub session started",
    }

    with db.connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO sessions (hub_id, card_id, user_id, started, ended, consumed_kwh, revenue, status, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["hub_id"], payload["card_id"], payload["user_id"], payload["started"], payload["ended"],
                payload["consumed_kwh"], payload["revenue"], payload["status"], payload["reason"],
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (cursor.lastrowid,)).fetchone()

    log(f"HUB[{hub['id']}] started SESSION[{row['id']}] for CARD[{card['id']}]", "HUB")
    return ok("Hub session started.", {
        "mode": "created",
        "hub": _public_hub(hub),
        "card": _public_card(card),
        "session": _public_session(dict(row)),
        "checkpoint_kwh": MIN_HUB_CHECKPOINT_KWH,
    })


def hub_session_update(body: dict[str, Any]) -> dict[str, Any]:
    return _apply_hub_session_progress(body, finalize=False)


def hub_session_stop(body: dict[str, Any]) -> dict[str, Any]:
    return _apply_hub_session_progress(body, finalize=True)


def _resolve_session(body: dict[str, Any]) -> dict[str, Any] | None:
    session_id = int_id(body.get("session_id") or body.get("id"))
    if session_id > 0:
        with db.connect() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _row_to_dict(row)

    card = _find_card_by_id(body.get("card_id")) or _find_card_by_uid(body.get("uid") or body.get("card_uid") or body.get("rfid_uid"))
    hub = _resolve_hub(body)
    if not card:
        return None
    return _active_session_for(int(card["id"]), int(hub["id"]) if hub else None)


def _apply_hub_session_progress(body: dict[str, Any], finalize: bool = False) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    session = _resolve_session(body)
    if not session:
        return fail("Active session not found.", {"code": "SESSION_NOT_FOUND"})

    card = _find_card_by_id(session.get("card_id"))
    hub = _find_hardware_by_id("hubs", session.get("hub_id"))

    if not card or not hub:
        return fail("Session card or hub is missing.", {"code": "SESSION_BROKEN"})

    old_kwh = number(session.get("consumed_kwh"))
    new_total_kwh = number(
        body.get("total_kwh", body.get("consumed_kwh", body.get("kwh", old_kwh))),
        old_kwh,
    )

    if new_total_kwh < old_kwh:
        new_total_kwh = old_kwh

    delta_kwh = round(new_total_kwh - old_kwh, 6)
    force = finalize or str(body.get("force") or "").lower() in {"1", "true", "yes"}

    if delta_kwh < MIN_HUB_CHECKPOINT_KWH and not force:
        return ok("Checkpoint ignored until 0.25 kWh delta is reached.", {
            "applied": False,
            "minimum_delta_kwh": MIN_HUB_CHECKPOINT_KWH,
            "current_session_kwh": old_kwh,
            "received_total_kwh": new_total_kwh,
            "remaining_delta_kwh": round(MIN_HUB_CHECKPOINT_KWH - delta_kwh, 6),
            "session": _public_session(session),
            "card": _public_card(card),
        })

    rate = tenant_rate()
    delta_revenue = round(delta_kwh * rate, 2)
    new_session_revenue = round(number(session.get("revenue")) + delta_revenue, 2)
    new_balance = round(number(card.get("balance")) - delta_revenue, 2)
    new_card_used = round(number(card.get("used_kwh")) + delta_kwh, 6)
    new_hub_kwh = round(number(hub.get("consumed_kwh")) + delta_kwh, 6)
    new_hub_revenue = round(number(hub.get("revenue")) + delta_revenue, 2)

    reason = clean_text(body.get("reason") or ("finalized by ESP32 Hub" if finalize else "ESP32 Hub checkpoint"))
    ended = now_iso() if finalize else (session.get("ended") or "")
    status = "finished" if finalize else "active"

    with db.connect() as conn:
        conn.execute(
            """
            UPDATE sessions
            SET consumed_kwh = ?, revenue = ?, ended = ?, status = ?, reason = ?
            WHERE id = ?
            """,
            (new_total_kwh, new_session_revenue, ended, status, reason, session["id"]),
        )
        conn.execute(
            "UPDATE cards SET balance = ?, used_kwh = ? WHERE id = ?",
            (new_balance, new_card_used, card["id"]),
        )
        conn.execute(
            "UPDATE hubs SET consumed_kwh = ?, revenue = ? WHERE id = ?",
            (new_hub_kwh, new_hub_revenue, hub["id"]),
        )
        conn.commit()
        updated_session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session["id"],)).fetchone()
        updated_card = conn.execute("SELECT * FROM cards WHERE id = ?", (card["id"],)).fetchone()
        updated_hub = conn.execute("SELECT * FROM hubs WHERE id = ?", (hub["id"],)).fetchone()

    public_card = _public_card(dict(updated_card))
    should_stop = bool(public_card and public_card.get("cutoff"))

    log(
        f"HUB[{hub['id']}] {'stopped' if finalize else 'updated'} SESSION[{session['id']}]: "
        f"+{delta_kwh:.3f} kWh, ₱{delta_revenue:.2f}",
        "HUB",
    )

    return ok("Hub session updated." if not finalize else "Hub session stopped.", {
        "applied": True,
        "delta_kwh": delta_kwh,
        "delta_revenue": delta_revenue,
        "rate": rate,
        "should_stop": should_stop,
        "stop_reason": "Debt limit reached." if should_stop else "",
        "hub": _public_hub(dict(updated_hub)),
        "card": public_card,
        "session": _public_session(dict(updated_session)),
    })


# ==========================================================
# REGISTRY MODULE FLOW
# ==========================================================

def registry_card_lookup(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    registry = _resolve_registry(body)
    if not registry:
        return fail("Registry station is not registered.", {"code": "REGISTRY_NOT_REGISTERED"})

    uid = normalize_uid(body.get("uid") or body.get("card_uid") or body.get("rfid_uid"))
    if not uid:
        return fail("Card UID is required.", {"field": "uid"})

    card = _find_card_by_uid(uid)
    if not card:
        return ok("Card is not registered. Contact an admin.", {
            "registered": False,
            "allowed": False,
            "code": "CARD_NOT_REGISTERED",
            "registry": _public_registry(registry),
            "uid": uid,
            "instruction": "Contact an admin to register this RFID card.",
        })

    public = _public_card(card)
    allowed = public["status"] not in {"banned", "disabled", "blocked"}
    log(f"REGISTRY[{registry['id']}] scanned CARD[{card['id']}]", "REGISTRY")
    return ok("Card details loaded for top-up.", {
        "registered": True,
        "allowed": allowed,
        "topup_mode": allowed,
        "registry": _public_registry(registry),
        "card": public,
    })


def registry_topup_start(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    registry = _resolve_registry(body)
    if not registry:
        return fail("Registry station is not registered.", {"code": "REGISTRY_NOT_REGISTERED"})

    card = _find_card_by_id(body.get("card_id")) or _find_card_by_uid(body.get("uid") or body.get("card_uid") or body.get("rfid_uid"))
    if not card:
        return fail("Card is not registered. Contact an admin.", {"code": "CARD_NOT_REGISTERED"})

    if clean_text(card.get("status") or "active").lower() in {"banned", "disabled", "blocked"}:
        return fail("Card is not allowed for top-up.", {"code": "CARD_NOT_ALLOWED", "card": _public_card(card)})

    created = now_iso()
    with db.connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (type, method, amount, card_id, registry_station_id, gateway_reference, status, created, applied)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("topup", "coinslot", 0, card["id"], registry["id"], clean_text(body.get("gateway_reference") or "REGISTRY-HOLD"), "hold", created, ""),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM transactions WHERE id = ?", (cursor.lastrowid,)).fetchone()

    log(f"REGISTRY[{registry['id']}] started top-up hold TRANSACTION[{row['id']}] for CARD[{card['id']}]", "REGISTRY")
    return ok("Registry top-up mode started.", {
        "transaction": dict(row),
        "registry": _public_registry(registry),
        "card": _public_card(card),
        "coinslot_enabled": True,
    })


def registry_topup_finish(body: dict[str, Any]) -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    registry = _resolve_registry(body)
    if not registry:
        return fail("Registry station is not registered.", {"code": "REGISTRY_NOT_REGISTERED"})

    amount = number(body.get("amount", body.get("total_amount", body.get("coins", 0))))
    if amount <= 0:
        return fail("Top-up amount must be greater than zero.", {"field": "amount"})

    card = _find_card_by_id(body.get("card_id")) or _find_card_by_uid(body.get("uid") or body.get("card_uid") or body.get("rfid_uid"))
    if not card:
        return fail("Card is not registered. Contact an admin.", {"code": "CARD_NOT_REGISTERED"})

    old_balance = number(card.get("balance"))
    new_balance = round(old_balance + amount, 2)
    applied = now_iso()
    transaction_id = int_id(body.get("transaction_id"))

    with db.connect() as conn:
        if transaction_id > 0:
            existing = conn.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
        else:
            existing = None

        if existing:
            conn.execute(
                """
                UPDATE transactions
                SET amount = ?, card_id = ?, registry_station_id = ?, gateway_reference = ?, status = ?, applied = ?
                WHERE id = ?
                """,
                (
                    amount, card["id"], registry["id"], clean_text(body.get("gateway_reference") or f"REGISTRY[{registry['id']}]-COINSLOT"),
                    "applied", applied, transaction_id,
                ),
            )
            final_id = transaction_id
        else:
            cursor = conn.execute(
                """
                INSERT INTO transactions (type, method, amount, card_id, registry_station_id, gateway_reference, status, created, applied)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "topup", "coinslot", amount, card["id"], registry["id"],
                    clean_text(body.get("gateway_reference") or f"REGISTRY[{registry['id']}]-COINSLOT"),
                    "applied", applied, applied,
                ),
            )
            final_id = cursor.lastrowid

        conn.execute("UPDATE cards SET balance = ? WHERE id = ?", (new_balance, card["id"]))
        conn.commit()
        updated_card = conn.execute("SELECT * FROM cards WHERE id = ?", (card["id"],)).fetchone()
        transaction = conn.execute("SELECT * FROM transactions WHERE id = ?", (final_id,)).fetchone()

    log(f"REGISTRY[{registry['id']}] applied ₱{amount:.2f} top-up to CARD[{card['id']}]", "REGISTRY")
    return ok("Registry top-up applied.", {
        "amount": amount,
        "old_balance": old_balance,
        "new_balance": new_balance,
        "transaction": dict(transaction),
        "registry": _public_registry(registry),
        "card": _public_card(dict(updated_card)),
    })


# ==========================================================
# STATUS / HEALTH
# ==========================================================

def module_health() -> dict[str, Any]:
    missing = require_db()
    if missing:
        return missing

    return ok("Module backend is ready.", {
        "database": True,
        "checkpoint_kwh": MIN_HUB_CHECKPOINT_KWH,
        "flows": {
            "hub": [
                "/api/module/hub/card",
                "/api/module/hub/session/start",
                "/api/module/hub/session/update",
                "/api/module/hub/session/stop",
            ],
            "registry": [
                "/api/module/registry/card",
                "/api/module/registry/topup/start",
                "/api/module/registry/topup/finish",
            ],
            "ui_devices": [
                "/api/module/device-visit",
            ],
        },
        "notes": [
            "MAC is permanent hardware identity.",
            "IP is runtime-only and should be detected later if needed.",
            "UI device MAC lookup is best-effort and Raspberry Pi/Linux friendly.",
        ],
    })

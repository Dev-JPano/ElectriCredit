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


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_mac(value: Any) -> str:
    """
    Keep MAC as the stable hardware identity.
    Accepts AA:BB:CC:DD:EE:FF, aa-bb-..., or AABBCCDDEEFF.
    Returns AA:BB:CC:DD:EE:FF when it can.
    """
    raw = "".join(ch for ch in str(value or "") if ch.isalnum()).upper()

    if len(raw) != 12:
        return str(value or "").strip().upper()

    return ":".join(raw[index:index + 2] for index in range(0, 12, 2))


def is_valid_mac(value: Any) -> bool:
    raw = "".join(ch for ch in str(value or "") if ch.isalnum()).upper()
    return len(raw) == 12 and all(ch in "0123456789ABCDEF" for ch in raw)


def device_label(table: str) -> str:
    return "HUB" if table == "hubs" else "REGISTRY"


def table_for_device_type(value: Any) -> str:
    text = clean_text(value).lower()
    if text in {"hub", "hubs", "esp32_hub", "hub_module"}:
        return "hubs"
    if text in {"registry", "registries", "registry_station", "registry_stations", "station"}:
        return "registry_stations"
    raise ValueError("Invalid hardware type. Use 'hub' or 'registry'.")


def next_device_id(device_type: str) -> dict[str, Any]:
    missing = require_db()
    if missing: return missing

    try:
        table = table_for_device_type(device_type)
        rows = db.get_rows(table)
        next_id = (max([int_id(row.get("id")) for row in rows] or [0]) + 1)
        label = device_label(table)
        return ok("Next hardware ID loaded.", {
            "type": "hub" if table == "hubs" else "registry",
            "table": table,
            "next_id": next_id,
            "display": f"{label}[{next_id}]",
            "editable": False,
        })
    except Exception as exc:
        return fail(str(exc))


def _public_duplicate(row: dict[str, Any], table: str, matched_by: str = "mac") -> dict[str, Any]:
    parsed = _parse_device(row) or {}
    label = device_label(table)
    return {
        "table": table,
        "type": "hub" if table == "hubs" else "registry",
        "label": label,
        "id": parsed.get("id"),
        "display": f"{label}[{parsed.get('id')}]",
        "location": parsed.get("location", ""),
        "mac": parsed.get("mac", ""),
        "created": parsed.get("created", ""),
        "status": parsed.get("status", {}),
        "matched_by": matched_by,
        "details": parsed,
    }


def find_registered_mac(mac: str) -> dict[str, Any] | None:
    normalized = normalize_mac(mac)

    for table in ("hubs", "registry_stations"):
        for row in db.get_rows(table):
            if normalize_mac(row.get("mac")) == normalized:
                return _public_duplicate(row, table, "mac")

    return None


def _validate_registration_payload(data: dict[str, Any]) -> tuple[str, str] | dict[str, Any]:
    location = clean_text(data.get("location"))
    mac = normalize_mac(data.get("mac"))

    if not location:
        return fail("Location is required.", {"field": "location"})

    if not mac:
        return fail("MAC Address is required.", {"field": "mac"})

    if not is_valid_mac(mac):
        return fail("Invalid MAC Address format.", {
            "field": "mac",
            "received": data.get("mac"),
            "expected": "AA:BB:CC:DD:EE:FF",
        })

    return location, mac


def _fresh_device_payload(table: str, data: dict[str, Any], location: str, mac: str) -> dict[str, Any]:
    payload = {
        "location": location,
        "mac": mac,
        "status": {
            "available": True,
            "status": "enabled",
            "connection": "offline",
            "portal_open": False,
            "portal_updated": now_iso(),
        },
        "created": now_iso(),
    }

    if table == "hubs":
        payload["revenue"] = 0
        payload["consumed_kwh"] = 0

    # Important:
    # IP is intentionally not part of hardware identity.
    # Runtime IP can be detected later by module.py when the ESP32 is connected.
    return _prepare_device_payload(payload)


def _register_device(table: str, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "DEVELOPER")
    if denied: return denied

    missing = require_db()
    if missing: return missing

    validated = _validate_registration_payload(data)
    if isinstance(validated, dict):
        return validated

    location, mac = validated
    author = actor_label(data)
    override = bool(data.get("override") is True or str(data.get("override")).lower() in {"1", "true", "yes", "override"})
    label = device_label(table)

    try:
        duplicate = find_registered_mac(mac)

        if duplicate and not override:
            return fail("Hardware MAC is already registered.", {
                "code": "HARDWARE_DUPLICATE_MAC",
                "duplicate": duplicate,
                "requested": {
                    "type": "hub" if table == "hubs" else "registry",
                    "label": label,
                    "location": location,
                    "mac": mac,
                },
                "requires_override": True,
                "warning": "Overriding will replace the hardware registration details and reset device progress/status.",
            })

        payload = _fresh_device_payload(table, data, location, mac)

        if duplicate:
            duplicate_table = duplicate["table"]
            duplicate_id = int_id(duplicate["id"])

            if duplicate_table == table:
                row = db.update_row(table, duplicate_id, payload)
                log(f"{author} overrode {label}[{duplicate_id}] registration by MAC {mac}", author)
                return ok(f"{label} registration overridden.", {
                    "mode": "override",
                    "overridden": duplicate,
                    "device": _parse_device(row),
                    "receipt": build_registration_receipt(label, row, author, "manual_override"),
                })

            # Cross-type override: remove the old hardware record and create the requested type.
            # This is intentionally destructive because a MAC cannot represent two modules.
            db.delete_row(duplicate_table, duplicate_id)
            row = db.insert_row(table, payload)
            log(f"{author} moved MAC {mac} from {duplicate['display']} to {label}[{row['id']}]", author)
            return ok(f"{label} registered after replacing duplicate MAC.", {
                "mode": "cross_type_override",
                "overridden": duplicate,
                "device": _parse_device(row),
                "receipt": build_registration_receipt(label, row, author, "manual_cross_type_override"),
            })

        row = db.insert_row(table, payload)
        log(f"{author} registered {label}[{row['id']}] by MAC {mac}", author)
        return ok(f"{label} registered.", {
            "mode": "created",
            "device": _parse_device(row),
            "receipt": build_registration_receipt(label, row, author, "manual"),
        })
    except Exception as exc:
        return fail(str(exc))


def build_registration_receipt(label: str, row: dict[str, Any], author: str, method: str) -> dict[str, Any]:
    parsed = _parse_device(row) or {}
    return {
        "id": parsed.get("id"),
        "display": f"{label}[{parsed.get('id')}]",
        "type": label,
        "location": parsed.get("location", ""),
        "mac": parsed.get("mac", ""),
        "created": parsed.get("created", now_iso()),
        "registered_by": author,
        "method": method,
        "ip_note": "IP address is not stored as identity. Runtime IP will be handled later by module.py when the ESP32 connects to the Raspberry Pi.",
    }



def _parse_device(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None: return None
    item = dict(row)
    status = parse_json(item.get("status"), {"available": False, "status": "enabled", "connection": "offline"})
    item["status"] = status
    item["status_object"] = status
    item["connection"] = status.get("connection", "offline")
    item["enabled"] = status.get("status", "enabled") == "enabled"
    item["available"] = bool(status.get("available", False))
    item["portal_open"] = bool(status.get("portal_open", False))
    item["portal_mode"] = status.get("portal_mode", "closed")
    item["portal_updated"] = status.get("portal_updated", "")
    return item


def _prepare_device_payload(data: dict[str, Any]) -> dict[str, Any]:
    payload = dict(data or {})
    for key in ["actor_id", "actor_role", "account_id", "author", "current_id", "current_role"]:
        payload.pop(key, None)
    if isinstance(payload.get("status"), dict):
        payload["status"] = dump_json(payload["status"])
    elif not payload.get("status"):
        payload["status"] = dump_json({"available": True, "status": "enabled", "connection": "offline"})
    return payload


def get_summary() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        hubs = get_hubs().get("data", [])
        registries = get_registry_stations().get("data", [])
        return ok("Hardware summary loaded.", {
            "hubs": {
                "total": len(hubs),
                "online": sum(1 for x in hubs if x.get("connection") == "online"),
                "available": sum(1 for x in hubs if x.get("available")),
                "disabled": sum(1 for x in hubs if not x.get("enabled")),
            },
            "registry_stations": {
                "total": len(registries),
                "online": sum(1 for x in registries if x.get("connection") == "online"),
                "available": sum(1 for x in registries if x.get("available")),
                "disabled": sum(1 for x in registries if not x.get("enabled")),
            }
        })
    except Exception as exc:
        return fail(str(exc))


def get_hubs() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        return ok("Hubs loaded.", [_parse_device(x) for x in db.get_rows("hubs")])
    except Exception as exc:
        return fail(str(exc))


def get_hub(hub_id: int) -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        row = _parse_device(db.get_row("hubs", hub_id))
        return ok("Hub loaded.", row) if row else fail(f"HUB[{hub_id}] not found.")
    except Exception as exc:
        return fail(str(exc))


def register_hub(data: dict[str, Any]) -> dict[str, Any]:
    return _register_device("hubs", data)


def update_hub(hub_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied: return denied
    missing = require_db()
    if missing: return missing
    try:
        author = actor_label(data)
        row = db.update_row("hubs", hub_id, _prepare_device_payload(data))
        log(f"{author} updated HUB[{hub_id}]", author)
        return ok("Hub updated.", _parse_device(row))
    except Exception as exc:
        return fail(str(exc))


def ping_hub(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied: return denied
    return _set_connection("hubs", "HUB", data, "online", "Hub ping accepted.")


def terminate_hub(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied: return denied
    return _set_connection("hubs", "HUB", data, "offline", "Hub termination requested.")


def enable_hub(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied: return denied
    return _set_enabled("hubs", "HUB", data, True)


def disable_hub(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied: return denied
    return _set_enabled("hubs", "HUB", data, False)


def delete_hub(hub_id: int, body: dict[str, Any] | None = None, author: str = "SYSTEM") -> dict[str, Any]:
    denied = require_role(body or {"actor_role": "OWNER"}, "OWNER") if body else None
    if denied: return denied
    missing = require_db()
    if missing: return missing
    try:
        author = actor_label(body, author) if body else author
        row = db.delete_row("hubs", hub_id)
        log(f"{author} deleted HUB[{hub_id}]", author)
        return ok("Hub deleted.", row)
    except Exception as exc:
        return fail(str(exc))


def get_registry_stations() -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        return ok("Registry stations loaded.", [_parse_device(x) for x in db.get_rows("registry_stations")])
    except Exception as exc:
        return fail(str(exc))


def get_registry_station(registry_id: int) -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    try:
        row = _parse_device(db.get_row("registry_stations", registry_id))
        return ok("Registry loaded.", row) if row else fail(f"REGISTRY[{registry_id}] not found.")
    except Exception as exc:
        return fail(str(exc))


def register_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    return _register_device("registry_stations", data)


def update_registry_station(registry_id: int, data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied: return denied
    missing = require_db()
    if missing: return missing
    try:
        author = actor_label(data)
        row = db.update_row("registry_stations", registry_id, _prepare_device_payload(data))
        log(f"{author} updated REGISTRY[{registry_id}]", author)
        return ok("Registry station updated.", _parse_device(row))
    except Exception as exc:
        return fail(str(exc))


def ping_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied: return denied
    return _set_connection("registry_stations", "REGISTRY", data, "online", "Registry ping accepted.")


def request_registry_scan(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "ADMINISTRATOR")
    if denied: return denied
    registry_id = int_id(data.get("id"))
    author = actor_label(data)
    log(f"{author} requested RFID scan at REGISTRY[{registry_id}]", author)
    return ok("Registry scan request queued.", {"registry_station_id": registry_id, "uid": "WAITING_FOR_SCAN", "status": "queued"})


def enable_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied: return denied
    return _set_enabled("registry_stations", "REGISTRY", data, True)


def disable_registry_station(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "OWNER")
    if denied: return denied
    return _set_enabled("registry_stations", "REGISTRY", data, False)


def delete_registry_station(registry_id: int, body: dict[str, Any] | None = None, author: str = "SYSTEM") -> dict[str, Any]:
    denied = require_role(body or {"actor_role": "OWNER"}, "OWNER") if body else None
    if denied: return denied
    missing = require_db()
    if missing: return missing
    try:
        author = actor_label(body, author) if body else author
        row = db.delete_row("registry_stations", registry_id)
        log(f"{author} deleted REGISTRY[{registry_id}]", author)
        return ok("Registry station deleted.", row)
    except Exception as exc:
        return fail(str(exc))



def open_hub_portal(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "DEVELOPER")
    if denied: return denied
    return _set_portal("hubs", "HUB", data, True)


def close_hub_portal(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "DEVELOPER")
    if denied: return denied
    return _set_portal("hubs", "HUB", data, False)


def open_registry_portal(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "DEVELOPER")
    if denied: return denied
    return _set_portal("registry_stations", "REGISTRY", data, True)


def close_registry_portal(data: dict[str, Any]) -> dict[str, Any]:
    denied = require_role(data, "DEVELOPER")
    if denied: return denied
    return _set_portal("registry_stations", "REGISTRY", data, False)


def _set_portal(table: str, label: str, data: dict[str, Any], is_open: bool) -> dict[str, Any]:
    missing = require_db()
    if missing: return missing

    item_id = int_id(data.get("id"))
    if item_id <= 0:
        return fail("Missing required field: id")

    try:
        row = db.get_row(table, item_id)
        if not row:
            return fail(f"{label}[{item_id}] not found.")

        status = parse_json(row.get("status"), {})
        status["portal_open"] = bool(is_open)
        status["portal_updated"] = now_iso()
        status["portal_mode"] = "setup_portal" if is_open else "closed"

        # Portal mode is a setup state, not proof that the ESP32 is online.
        # module.py will later set actual online/offline communication state.
        updated = db.update_row(table, item_id, {"status": dump_json(status)})
        author = actor_label(data)
        log(f"{author} {'opened' if is_open else 'closed'} setup portal for {label}[{item_id}]", author)

        return ok(f"{label} setup portal {'opened' if is_open else 'closed'}.", _parse_device(updated))
    except Exception as exc:
        return fail(str(exc))

def _set_enabled(table: str, label: str, data: dict[str, Any], enabled: bool) -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    item_id = int_id(data.get("id"))
    if item_id <= 0: return fail("Missing required field: id")
    try:
        row = db.get_row(table, item_id)
        if not row: return fail(f"{label}[{item_id}] not found.")
        status = parse_json(row.get("status"), {})
        status["status"] = "enabled" if enabled else "disabled"
        if not enabled: status["available"] = False
        updated = db.update_row(table, item_id, {"status": dump_json(status)})
        author = actor_label(data)
        log(f"{author} {'enabled' if enabled else 'disabled'} {label}[{item_id}]", author)
        return ok(f"{label} {'enabled' if enabled else 'disabled'}.", _parse_device(updated))
    except Exception as exc:
        return fail(str(exc))


def _set_connection(table: str, label: str, data: dict[str, Any], connection: str, message: str) -> dict[str, Any]:
    missing = require_db()
    if missing: return missing
    item_id = int_id(data.get("id"))
    if item_id <= 0: return fail("Missing required field: id")
    try:
        row = db.get_row(table, item_id)
        if not row: return fail(f"{label}[{item_id}] not found.")
        status = parse_json(row.get("status"), {})
        status["connection"] = connection
        if connection == "online" and status.get("status") != "disabled":
            status["available"] = True
        updated = db.update_row(table, item_id, {"status": dump_json(status)})
        author = actor_label(data)
        log(f"{author} pinged {label}[{item_id}]", author)
        return ok(message, _parse_device(updated))
    except Exception as exc:
        return fail(str(exc))

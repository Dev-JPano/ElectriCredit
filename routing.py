"""
============================================================
ELECTRICREDIT V2 - FLASK ROUTING
File: routing.py

Purpose:
- Register all API routes
- Keep app.py clean
- Call real backend modules:
  - database/database.py
  - profile.py
  - chatbot.py
  - log.py
  - api_manager.py

Rule:
- Do not put business logic here.
- Routing only receives request, calls backend, returns JSON.
============================================================
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request


# ==========================================================
# OPTIONAL MODULE IMPORTS
# ==========================================================

try:
    from database import database as db
except Exception as import_error:
    db = None
    DATABASE_IMPORT_ERROR = str(import_error)
else:
    DATABASE_IMPORT_ERROR = ""


try:
    import dashboard as dashboard_manager
except Exception as import_error:
    dashboard_manager = None
    DASHBOARD_IMPORT_ERROR = str(import_error)
else:
    DASHBOARD_IMPORT_ERROR = ""


try:
    import hardware as hardware_manager
except Exception as import_error:
    hardware_manager = None
    HARDWARE_IMPORT_ERROR = str(import_error)
else:
    HARDWARE_IMPORT_ERROR = ""


try:
    import module as module_manager
except Exception as import_error:
    module_manager = None
    MODULE_IMPORT_ERROR = str(import_error)
else:
    MODULE_IMPORT_ERROR = ""


try:
    import profile as profile_manager
except Exception as import_error:
    profile_manager = None
    PROFILE_IMPORT_ERROR = str(import_error)
else:
    PROFILE_IMPORT_ERROR = ""


try:
    import peopleware as peopleware_manager
except Exception as import_error:
    peopleware_manager = None
    PEOPLEWARE_IMPORT_ERROR = str(import_error)
else:
    PEOPLEWARE_IMPORT_ERROR = ""


try:
    import software as software_manager
except Exception as import_error:
    software_manager = None
    SOFTWARE_IMPORT_ERROR = str(import_error)
else:
    SOFTWARE_IMPORT_ERROR = ""


try:
    import chatbot as chatbot_manager
except Exception as import_error:
    chatbot_manager = None
    CHATBOT_IMPORT_ERROR = str(import_error)
else:
    CHATBOT_IMPORT_ERROR = ""


try:
    import log as log_manager
except Exception as import_error:
    log_manager = None
    LOG_IMPORT_ERROR = str(import_error)
else:
    LOG_IMPORT_ERROR = ""


try:
    import api_manager
except Exception as import_error:
    api_manager = None
    API_MANAGER_IMPORT_ERROR = str(import_error)
else:
    API_MANAGER_IMPORT_ERROR = ""


BASE_DIR = Path(__file__).resolve().parent
CHATBOT_RULES_PATH = BASE_DIR / "static" / "components" / "header" / "chatbot" / "chatbot_rules.json"


# ==========================================================
# RESPONSE HELPERS
# ==========================================================

def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def get_body() -> dict[str, Any]:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def ok(data: Any = None, message: str = "OK", **extra: Any):
    payload: dict[str, Any] = {
        "status": "ok",
        "message": message,
    }

    if data is not None:
        payload["data"] = data

    payload.update(extra)
    return jsonify(payload)


def error(message: str, status_code: int = 400, **extra: Any):
    payload: dict[str, Any] = {
        "status": "error",
        "message": message,
    }

    payload.update(extra)
    return jsonify(payload), status_code


def result_response(result: dict[str, Any], success_code: int = 200):
    status_code = success_code if result.get("status") == "ok" else 400
    return jsonify(result), status_code


def module_required(module: Any, module_name: str, detail: str = ""):
    if module is None:
        return error(
            f"{module_name} is not ready.",
            503,
            detail=detail,
        )

    return None


def database_required():
    return module_required(
        db,
        "database/database.py",
        DATABASE_IMPORT_ERROR,
    )


def dashboard_required():
    return module_required(
        dashboard_manager,
        "dashboard.py",
        DASHBOARD_IMPORT_ERROR,
    )


def hardware_required():
    return module_required(
        hardware_manager,
        "hardware.py",
        HARDWARE_IMPORT_ERROR,
    )


def esp_module_required():
    return module_required(
        module_manager,
        "module.py",
        MODULE_IMPORT_ERROR,
    )


def profile_required():
    return module_required(
        profile_manager,
        "profile.py",
        PROFILE_IMPORT_ERROR,
    )


def peopleware_required():
    return module_required(
        peopleware_manager,
        "peopleware.py",
        PEOPLEWARE_IMPORT_ERROR,
    )


def software_required():
    return module_required(
        software_manager,
        "software.py",
        SOFTWARE_IMPORT_ERROR,
    )


def chatbot_required():
    return module_required(
        chatbot_manager,
        "chatbot.py",
        CHATBOT_IMPORT_ERROR,
    )


def log_required():
    return module_required(
        log_manager,
        "log.py",
        LOG_IMPORT_ERROR,
    )


def safe_call(function_name: str, *args, **kwargs):
    """
    Calls a function from database/database.py safely.

    Example:
    safe_call("get_users")
    safe_call("create_user", body)
    """

    missing = database_required()
    if missing:
        return missing

    function = getattr(db, function_name, None)

    if not callable(function):
        return error(
            f"Database function '{function_name}' is not implemented yet.",
            501,
        )

    try:
        result = function(*args, **kwargs)
        return ok(result, f"{function_name} completed.")
    except Exception as exc:
        return error(str(exc), 500)


def get_request_author() -> str:
    return request.headers.get("X-Author") or request.args.get("author") or "SYSTEM"


def get_actor_id() -> Any:
    """
    Temporary early-dev actor resolver.
    Later replace with real session/token auth.
    """

    body = get_body()

    return (
        body.get("actor_id")
        or body.get("account_id")
        or request.headers.get("X-Account-ID")
        or request.args.get("actor_id")
    )


def read_json_file(path: Path) -> dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Unable to read JSON file: {exc}",
        }


# ==========================================================
# ROUTE REGISTRATION
# ==========================================================

def register_routes(app: Flask) -> None:
    @app.before_request
    def record_main_ui_device_visit():
        """
        Best-effort UI device recorder.

        This records only the main UI page request, not static assets and not API calls.
        Real MAC detection only works when the OS can resolve the browser IP through
        ARP/IP-neighbor tables, which is expected on Raspberry Pi hotspot/LAN setups.
        """
        if module_manager is None:
            return None

        if request.method != "GET":
            return None

        if request.path not in {"/", "/index.html"}:
            return None

        try:
            module_manager.record_ui_visit_from_request(request)
        except Exception:
            pass

        return None

    # ======================================================
    # API - GENERAL / SYSTEM
    # ======================================================

    @app.get("/api/health")
    def api_health():
        return ok(
            {
                "app": "ElectriCredit",
                "version": "2.0.0",
                "time": now_iso(),
                "database_layer": db is not None,
                "database_error": DATABASE_IMPORT_ERROR,
                "dashboard_layer": dashboard_manager is not None,
                "dashboard_error": DASHBOARD_IMPORT_ERROR,
                "hardware_layer": hardware_manager is not None,
                "hardware_error": HARDWARE_IMPORT_ERROR,
                "module_layer": module_manager is not None,
                "module_error": MODULE_IMPORT_ERROR,
                "profile_layer": profile_manager is not None,
                "profile_error": PROFILE_IMPORT_ERROR,
                "peopleware_layer": peopleware_manager is not None,
                "peopleware_error": PEOPLEWARE_IMPORT_ERROR,
                "software_layer": software_manager is not None,
                "software_error": SOFTWARE_IMPORT_ERROR,
                "chatbot_layer": chatbot_manager is not None,
                "chatbot_error": CHATBOT_IMPORT_ERROR,
                "log_layer": log_manager is not None,
                "log_error": LOG_IMPORT_ERROR,
                "api_manager_layer": api_manager is not None,
                "api_manager_error": API_MANAGER_IMPORT_ERROR,
            },
            "ElectriCredit backend is running.",
        )


    @app.get("/api/status")
    def api_status():
        if db is None:
            return ok(
                {
                    "server": "active",
                    "mode": "local_first",
                    "database_layer": False,
                    "database_error": DATABASE_IMPORT_ERROR,
                    "internet": "unknown",
                    "counts": {
                        "users": 0,
                        "cards": 0,
                        "hubs": 0,
                        "registry_stations": 0,
                        "sessions": 0,
                        "transactions": 0,
                        "logs": 0,
                        "themes": 0,
                    },
                },
                "System status loaded with database fallback.",
            )

        return safe_call("get_system_status")


    @app.get("/api/providers/status")
    def api_providers_status():
        if api_manager is None:
            return error(
                "api_manager.py is not ready.",
                503,
                detail=API_MANAGER_IMPORT_ERROR,
            )

        return ok(api_manager.get_api_status(), "API provider status loaded.")



    # ======================================================
    # API - DASHBOARD
    # ======================================================

    @app.get("/api/dashboard/summary")
    def api_dashboard_summary():
        missing = dashboard_required()
        if missing:
            return missing
        return result_response(dashboard_manager.get_summary())


    @app.get("/api/dashboard/power")
    def api_dashboard_power():
        missing = dashboard_required()
        if missing:
            return missing
        return result_response(dashboard_manager.get_power())


    @app.get("/api/dashboard/hub")
    def api_dashboard_hub():
        missing = dashboard_required()
        if missing:
            return missing
        return result_response(dashboard_manager.get_hub())


    @app.get("/api/dashboard/user")
    def api_dashboard_user():
        missing = dashboard_required()
        if missing:
            return missing
        return result_response(dashboard_manager.get_user())


    @app.get("/api/dashboard/usage")
    def api_dashboard_usage():
        missing = dashboard_required()
        if missing:
            return missing
        return result_response(dashboard_manager.get_usage())


    # ======================================================
    # API - HARDWARE
    # ======================================================

    @app.get("/api/hardware/summary")
    def api_hardware_summary():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.get_summary())


    @app.get("/api/hardware/next-id")
    def api_hardware_next_id():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.next_device_id(request.args.get("type") or request.args.get("device_type") or "hub"))


    @app.get("/api/hubs")
    def api_hubs_get():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.get_hubs())


    @app.get("/api/hubs/<int:hub_id>")
    def api_hubs_detail(hub_id: int):
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.get_hub(hub_id))


    @app.post("/api/hubs/register")
    def api_hubs_register():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.register_hub(get_body()))


    @app.put("/api/hubs/<int:hub_id>")
    def api_hubs_update(hub_id: int):
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.update_hub(hub_id, get_body()))


    @app.post("/api/hubs/ping")
    def api_hubs_ping():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.ping_hub(get_body()))


    @app.post("/api/hubs/terminate")
    def api_hubs_terminate():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.terminate_hub(get_body()))


    @app.post("/api/hubs/portal/open")
    def api_hubs_portal_open():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.open_hub_portal(get_body()))


    @app.post("/api/hubs/portal/close")
    def api_hubs_portal_close():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.close_hub_portal(get_body()))


    @app.post("/api/hubs/disable")
    def api_hubs_disable():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.disable_hub(get_body()))


    @app.post("/api/hubs/enable")
    def api_hubs_enable():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.enable_hub(get_body()))


    @app.delete("/api/hubs/<int:hub_id>")
    def api_hubs_delete(hub_id: int):
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.delete_hub(hub_id, get_body(), get_request_author()))


    @app.get("/api/registry")
    def api_registry_get():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.get_registry_stations())


    @app.get("/api/registry/<int:registry_id>")
    def api_registry_detail(registry_id: int):
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.get_registry_station(registry_id))


    @app.post("/api/registry/register")
    def api_registry_register():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.register_registry_station(get_body()))


    @app.put("/api/registry/<int:registry_id>")
    def api_registry_update(registry_id: int):
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.update_registry_station(registry_id, get_body()))


    @app.post("/api/registry/ping")
    def api_registry_ping():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.ping_registry_station(get_body()))


    @app.post("/api/registry/scan-request")
    def api_registry_scan_request():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.request_registry_scan(get_body()))


    @app.post("/api/registry/portal/open")
    def api_registry_portal_open():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.open_registry_portal(get_body()))


    @app.post("/api/registry/portal/close")
    def api_registry_portal_close():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.close_registry_portal(get_body()))


    @app.post("/api/registry/disable")
    def api_registry_disable():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.disable_registry_station(get_body()))


    @app.post("/api/registry/enable")
    def api_registry_enable():
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.enable_registry_station(get_body()))


    @app.delete("/api/registry/<int:registry_id>")
    def api_registry_delete(registry_id: int):
        missing = hardware_required()
        if missing:
            return missing
        return result_response(hardware_manager.delete_registry_station(registry_id, get_body(), get_request_author()))


    # ======================================================
    # API - ESP32 MODULE COMMUNICATION
    # ======================================================

    @app.get("/api/module/health")
    def api_module_health():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.module_health())


    @app.post("/api/module/device-visit")
    def api_module_device_visit():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.record_ui_visit(get_body()))


    @app.post("/api/module/hub/card")
    def api_module_hub_card():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.hub_card_lookup(get_body()))


    @app.post("/api/module/hub/session/start")
    def api_module_hub_session_start():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.hub_session_start(get_body()))


    @app.post("/api/module/hub/session/update")
    def api_module_hub_session_update():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.hub_session_update(get_body()))


    @app.post("/api/module/hub/session/stop")
    def api_module_hub_session_stop():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.hub_session_stop(get_body()))


    @app.post("/api/module/registry/card")
    def api_module_registry_card():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.registry_card_lookup(get_body()))


    @app.post("/api/module/registry/topup/start")
    def api_module_registry_topup_start():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.registry_topup_start(get_body()))


    @app.post("/api/module/registry/topup/finish")
    def api_module_registry_topup_finish():
        missing = esp_module_required()
        if missing:
            return missing
        return result_response(module_manager.registry_topup_finish(get_body()))


    # ======================================================
    # API - PEOPLEWARE / USERS / CARDS
    # ======================================================

    @app.get("/api/peopleware/summary")
    def api_peopleware_summary():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.summary())


    @app.get("/api/users")
    def api_users_get():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_users())


    @app.get("/api/users/<int:user_id>")
    def api_users_detail(user_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_user(user_id))


    @app.get("/api/users/<int:user_id>/cards")
    def api_user_cards_get(user_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_user_cards(user_id))


    @app.post("/api/users")
    def api_users_create():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.create_user(get_body()))


    @app.put("/api/users/<int:user_id>")
    def api_users_update(user_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.update_user(user_id, get_body()))


    @app.delete("/api/users/<int:user_id>")
    def api_users_delete(user_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.delete_user(user_id, get_body(), get_request_author()))


    @app.post("/api/users/delete-all")
    def api_users_delete_all():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.delete_all_users(get_body()))


    @app.post("/api/users/bulk-balance")
    def api_users_bulk_balance():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.bulk_update_balance(get_body()))


    @app.get("/api/cards")
    def api_cards_get():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_cards())


    @app.get("/api/cards/<int:card_id>")
    def api_cards_detail(card_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_card(card_id))


    @app.post("/api/users/<int:user_id>/cards")
    def api_cards_create(user_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.create_card(user_id, get_body()))


    @app.put("/api/cards/<int:card_id>")
    def api_cards_update(card_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.update_card(card_id, get_body()))


    @app.delete("/api/cards/<int:card_id>")
    def api_cards_delete(card_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.delete_card(card_id, get_body(), get_request_author()))


    @app.post("/api/cards/<int:card_id>/topup")
    def api_cards_topup(card_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.topup_card(card_id, get_body()))


    @app.post("/api/cards/<int:card_id>/ban")
    def api_cards_ban(card_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.ban_card(card_id, get_body()))


    @app.post("/api/cards/<int:card_id>/unban")
    def api_cards_unban(card_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.unban_card(card_id, get_body()))

    # ======================================================
    # API - AUTH / PROFILE
    # ======================================================

    @app.post("/api/auth/login")
    def api_auth_login():
        missing = profile_required()
        if missing:
            return missing

        result = profile_manager.handle_login(get_body())
        return result_response(result)


    @app.post("/api/auth/request-otp")
    def api_auth_request_otp():
        missing = profile_required()
        if missing:
            return missing

        result = profile_manager.handle_request_otp(get_body())
        return result_response(result)


    @app.post("/api/auth/me")
    def api_auth_me_post():
        missing = profile_required()
        if missing:
            return missing

        result = profile_manager.handle_me(get_body())
        return jsonify(result), 200


    @app.get("/api/auth/me")
    def api_auth_me_get():
        missing = profile_required()
        if missing:
            return missing

        account_id = request.args.get("account_id") or request.headers.get("X-Account-ID")
        result = profile_manager.handle_me({"account_id": account_id})
        return jsonify(result), 200




    @app.post("/api/auth/verify-otp")
    def api_auth_verify_otp():
        missing = profile_required()
        if missing:
            return missing

        payload = get_body()
        # Verification is usually done by the final action endpoint.
        # This helper exists for frontend pre-checks.
        verified, message = profile_manager.verify_otp(
            payload.get("otp_token", ""),
            payload.get("otp_code", ""),
            purpose=payload.get("purpose"),
            account_id=payload.get("account_id"),
            consume=bool(payload.get("consume", False)),
        )
        result = {
            "status": "ok" if verified else "error",
            "message": message,
            "data": {"verified": verified},
        }
        return result_response(result)

    @app.post("/api/auth/logout")
    def api_auth_logout():
        return ok(
            {
                "user": None,
            },
            "Logged out. Local frontend session should be cleared.",
        )


    @app.post("/api/profile/change-password")
    def api_profile_change_password():
        missing = profile_required()
        if missing:
            return missing

        result = profile_manager.handle_change_password(get_body())
        return result_response(result)


    @app.put("/api/profile/update")
    def api_profile_update():
        missing = profile_required()
        if missing:
            return missing

        result = profile_manager.handle_update_profile(get_body())
        return result_response(result)



    # ======================================================
    # API - SUPERUSERS
    # ADMINISTRATOR / OWNER / DEVELOPER
    # ======================================================

    @app.get("/api/peopleware/administrators")
    def api_peopleware_administrators():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_administrators())


    @app.get("/api/peopleware/developers")
    def api_peopleware_developers():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_developers())


    @app.post("/api/peopleware/administrators/delete-all")
    def api_peopleware_administrators_delete_all():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.delete_all_administrators(get_body()))


    @app.get("/api/superusers")
    def api_superusers_list():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.get_superusers(request.args.get("role")))


    @app.post("/api/superusers")
    def api_superusers_create():
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.create_superuser(get_body()))


    @app.put("/api/superusers/<int:target_id>")
    def api_superusers_update_by_id(target_id: int):
        # Profile backend handles protected managed-account updates, including
        # password-change authorization rules. Keep list/create/delete in
        # peopleware.py, but route UPDATE here so Profile password approvals work.
        missing = profile_required()
        if missing:
            return missing

        body = get_body()
        body["target_id"] = target_id
        return result_response(profile_manager.handle_update_superuser(body))


    @app.delete("/api/superusers/<int:target_id>")
    def api_superusers_delete_by_id(target_id: int):
        missing = peopleware_required()
        if missing:
            return missing
        return result_response(peopleware_manager.delete_superuser(target_id, get_body(), get_request_author()))



    # ======================================================
    # API - SOFTWARE SECTION
    # RBAC is enforced inside software.py.
    # ======================================================

    @app.post("/api/software/summary")
    def api_software_summary():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.summary(get_body()))


    @app.post("/api/software/rates")
    def api_software_rates_update():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.update_rates(get_body()))


    @app.post("/api/software/themes")
    def api_software_theme_create():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.create_theme(get_body()))


    @app.delete("/api/software/themes/<int:theme_id>")
    def api_software_theme_delete(theme_id: int):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.delete_theme(theme_id, get_body()))


    @app.post("/api/software/themes/reorder")
    def api_software_theme_reorder():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.reorder_themes(get_body()))


    @app.post("/api/software/recipients")
    def api_software_recipients():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.recipients(get_body()))


    @app.post("/api/software/announcement/email")
    def api_software_announcement_email():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.send_email_announcement(get_body()))


    @app.post("/api/software/announcement/sms")
    def api_software_announcement_sms():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.send_sms_announcement(get_body()))


    @app.post("/api/software/bonus")
    def api_software_bonus():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.apply_bonus(get_body()))


    @app.post("/api/software/balance/set-all")
    def api_software_balance_set_all():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.set_all_balance(get_body()))


    @app.post("/api/software/logs")
    def api_software_logs_get():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_logs(get_body(), request.args.to_dict()))


    @app.post("/api/software/logs/download")
    def api_software_logs_download():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.download_logs(get_body()))


    @app.post("/api/software/logs/backup-clear")
    def api_software_logs_backup_clear():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.backup_and_clear_logs(get_body()))


    @app.post("/api/software/device")
    def api_software_device_get():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_device(get_body()))


    @app.put("/api/software/device")
    def api_software_device_update():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.update_device(get_body()))



    @app.post("/api/software/connection/status")
    def api_software_connection_status():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_connection(get_body()))


    @app.post("/api/software/connection/scan")
    def api_software_connection_scan():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.scan_wifi(get_body()))


    @app.post("/api/software/connection/connect")
    def api_software_connection_connect():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.connect_wifi(get_body()))


    @app.post("/api/software/connection/forget")
    def api_software_connection_forget():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.forget_wifi(get_body()))


    @app.put("/api/software/connection")
    def api_software_connection_update():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.update_connection(get_body()))


    @app.post("/api/software/payment-bridge")
    def api_software_payment_bridge_status():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_payment_bridge(get_body()))


    @app.put("/api/software/payment-bridge")
    def api_software_payment_bridge_update():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.update_payment_bridge(get_body()))


    @app.post("/api/software/database/tables")
    def api_software_database_tables():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_database_tables(get_body()))


    @app.post("/api/software/database/table/<table_name>")
    def api_software_database_table_get(table_name: str):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_database_table(table_name, get_body()))


    @app.post("/api/software/database/table/<table_name>/row")
    def api_software_database_row_create(table_name: str):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.create_database_row(table_name, get_body()))


    @app.put("/api/software/database/table/<table_name>/row/<int:row_id>")
    def api_software_database_row_update(table_name: str, row_id: int):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.update_database_row(table_name, row_id, get_body()))


    @app.delete("/api/software/database/table/<table_name>/row/<int:row_id>")
    def api_software_database_row_delete(table_name: str, row_id: int):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.delete_database_row(table_name, row_id, get_body()))


    @app.post("/api/software/database/table/<table_name>/batch")
    def api_software_database_batch(table_name: str):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.apply_database_batch(table_name, get_body()))


    @app.post("/api/software/database/table/<table_name>/clear")
    def api_software_database_clear(table_name: str):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.clear_database_table(table_name, get_body()))


    @app.post("/api/software/database/clear")
    def api_software_database_clear_multiple():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.clear_database_tables(get_body()))


    @app.post("/api/software/backups")
    def api_software_backups_get():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.get_backups(get_body()))


    @app.post("/api/software/backups/create")
    def api_software_backup_create():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.create_backup(get_body()))


    @app.post("/api/software/backups/restore/<int:backup_id>")
    def api_software_backup_restore(backup_id: int):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.restore_backup(backup_id, get_body()))


    @app.delete("/api/software/backups/<int:backup_id>")
    def api_software_backup_delete(backup_id: int):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.delete_backup(backup_id, get_body()))


    @app.post("/api/software/backups/delete")
    def api_software_backups_bulk_delete():
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.bulk_delete_backups(get_body()))


    @app.post("/api/software/backups/download/<int:backup_id>")
    def api_software_backup_download(backup_id: int):
        missing = software_required()
        if missing:
            return missing
        return result_response(software_manager.download_backup(backup_id, get_body()))


    # ======================================================
    # API - SETTINGS / SOFTWARE
    # ======================================================

    @app.get("/api/settings")
    def api_settings_get():
        return safe_call("get_settings")


    @app.put("/api/settings/<key>")
    def api_settings_update(key: str):
        return safe_call("update_setting", key, get_body())


    @app.get("/api/network/status")
    def api_network_status():
        return safe_call("get_network_status")


    # ======================================================
    # API - THEMES
    # ======================================================

    @app.get("/api/themes")
    def api_themes_get():
        return safe_call("get_themes")


    @app.get("/api/themes/<int:theme_id>")
    def api_theme_get(theme_id: int):
        return safe_call("get_theme", theme_id)


    @app.post("/api/themes")
    def api_theme_create():
        return safe_call("create_theme", get_body())


    @app.put("/api/themes/<int:theme_id>")
    def api_theme_update(theme_id: int):
        return safe_call("update_theme", theme_id, get_body())


    @app.delete("/api/themes/<int:theme_id>")
    def api_theme_delete(theme_id: int):
        return safe_call("delete_theme", theme_id, get_request_author())


    @app.post("/api/themes/default")
    def api_theme_default():
        return safe_call("set_theme_priority", get_body())


    # ======================================================
    # API - LOGS
    #
    # Uses log.py because logs are now their own backend.
    # ======================================================

    @app.get("/api/logs")
    def api_logs_get():
        missing = log_required()
        if missing:
            return missing

        result = log_manager.handle_get_logs(request.args.to_dict())
        return result_response(result)


    @app.post("/api/logs")
    def api_logs_write():
        missing = log_required()
        if missing:
            return missing

        result = log_manager.handle_write_log(get_body())
        return result_response(result)


    @app.post("/api/logs/clear")
    def api_logs_clear():
        missing = log_required()
        if missing:
            return missing

        result = log_manager.handle_clear_logs(get_body())
        return result_response(result)


    @app.delete("/api/logs/<int:log_id>")
    def api_logs_delete(log_id: int):
        missing = log_required()
        if missing:
            return missing

        result = log_manager.handle_delete_log(log_id, get_body())
        return result_response(result)


    # ======================================================
    # API - DATABASE TOOLS
    # DEVELOPER ONLY
    # ======================================================

    @app.get("/api/database/tables")
    def api_database_tables():
        return safe_call("get_database_tables")


    @app.get("/api/database/table/<table_name>")
    def api_database_table_get(table_name: str):
        return safe_call("get_database_table", table_name)


    @app.post("/api/database/table/<table_name>/row")
    def api_database_row_create(table_name: str):
        return safe_call("create_database_row", table_name, get_body())


    @app.put("/api/database/table/<table_name>/row/<int:row_id>")
    def api_database_row_update(table_name: str, row_id: int):
        return safe_call("update_database_row", table_name, row_id, get_body())


    @app.delete("/api/database/table/<table_name>/row/<int:row_id>")
    def api_database_row_delete(table_name: str, row_id: int):
        return safe_call("delete_database_row", table_name, row_id, get_request_author())


    @app.post("/api/database/table/<table_name>/clear")
    def api_database_table_clear(table_name: str):
        return safe_call("clear_database_table", table_name, get_body())


    # ======================================================
    # API - BACKUPS
    # ======================================================

    @app.get("/api/backups")
    def api_backups_get():
        return safe_call("get_backups")


    @app.post("/api/backups/create")
    def api_backup_create():
        return safe_call("create_backup", get_body())


    @app.post("/api/backups/restore/<int:backup_id>")
    def api_backup_restore(backup_id: int):
        return safe_call("restore_backup", backup_id, get_body())


    @app.delete("/api/backups/<int:backup_id>")
    def api_backup_delete(backup_id: int):
        return safe_call("delete_backup", backup_id, get_request_author())


    # ======================================================
    # API - TRANSACTIONS
    # ======================================================

    @app.get("/api/transactions")
    def api_transactions_get():
        return safe_call("get_transactions")


    @app.get("/api/transactions/<int:transaction_id>")
    def api_transaction_get(transaction_id: int):
        return safe_call("get_transaction", transaction_id)


    @app.post("/api/transactions")
    def api_transaction_create():
        return safe_call("create_transaction", get_body())


    @app.post("/api/transactions/<int:transaction_id>/apply")
    def api_transaction_apply(transaction_id: int):
        return safe_call("apply_transaction", transaction_id, get_body())


    @app.post("/api/transactions/<int:transaction_id>/cancel")
    def api_transaction_cancel(transaction_id: int):
        return safe_call("cancel_transaction", transaction_id, get_body())


    # ======================================================
    # API - PAYMENT BRIDGE
    # FUTURE CENTRALIZED PAYMENT WEBSITE
    # ======================================================

    @app.post("/api/payment/create")
    def api_payment_create():
        return safe_call("create_online_payment", get_body())


    @app.get("/api/payment/status")
    def api_payment_status():
        return safe_call("get_payment_bridge_status")


    @app.get("/api/payment/pending")
    def api_payment_pending():
        return safe_call("get_pending_online_payments")


    @app.post("/api/payment/sync")
    def api_payment_sync():
        return safe_call("sync_payment_bridge", get_body())


    # ======================================================
    # API - DEVICES
    # Raspberry Pi hotspot device tracking
    # ======================================================

    @app.get("/api/devices")
    def api_devices_get():
        return safe_call("get_devices")


    @app.get("/api/devices/<int:device_id>")
    def api_device_get(device_id: int):
        return safe_call("get_device", device_id)


    @app.post("/api/devices/visit")
    def api_device_visit():
        return safe_call("record_device_visit", get_body(), request)


    # ======================================================
    # API - CHATBOT
    #
    # Uses chatbot.py.
    # Chat history must stay on frontend/browser only.
    # ======================================================

    @app.get("/api/chatbot/rules")
    def api_chatbot_rules():
        rules = read_json_file(CHATBOT_RULES_PATH)

        if rules.get("status") == "error":
            return jsonify(rules), 500

        return jsonify({
            "status": "ok",
            "message": "Chatbot rules loaded.",
            "data": rules,
        }), 200


    @app.get("/api/chatbot/providers")
    def api_chatbot_providers():
        if api_manager is None:
            return error(
                "api_manager.py is not ready.",
                503,
                detail=API_MANAGER_IMPORT_ERROR,
            )

        return ok(api_manager.get_api_status(), "Chatbot providers loaded.")


    @app.post("/api/chatbot/message")
    def api_chatbot_message():
        missing = chatbot_required()
        if missing:
            return missing

        result = chatbot_manager.handle_message_request(get_body())
        return result_response(result)

"""
============================================================
ELECTRICREDIT V2 - PROFILE / AUTH BACKEND
File: profile.py

Purpose:
- Password login
- OTP login
- Request OTP by email
- Change password
- Edit profile
- Manage ADMINISTRATOR / OWNER / DEVELOPER accounts
- Send account emails through api_manager.py

Rules:
- Passwords are stored in the database column named `password`
- Password values are still HASHED before saving
- OTP is 6 digits
- OTP is stored in memory only for now
- Chatbot conversations are not stored here
============================================================
"""

from __future__ import annotations

import json
import os
import random
import secrets
import sqlite3
import string
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from werkzeug.security import check_password_hash, generate_password_hash

import api_manager
import log as log_manager

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database" / "electricredit.db"

OTP_TTL_MINUTES = 10

# Development flags.
# Keep PROFILE_OTP_ECHO=false in real use.
PROFILE_OTP_ALLOW_LOCAL_FALLBACK = os.getenv("PROFILE_OTP_ALLOW_LOCAL_FALLBACK", "true").lower() in {"1", "true", "yes", "on"}
PROFILE_OTP_ECHO = os.getenv("PROFILE_OTP_ECHO", "false").lower() in {"1", "true", "yes", "on"}
PROFILE_REQUIRE_OTP_FOR_SELF_UPDATE = os.getenv("PROFILE_REQUIRE_OTP_FOR_SELF_UPDATE", "true").lower() in {"1", "true", "yes", "on"}
PROFILE_REQUIRE_OTP_FOR_MANAGED_UPDATE = os.getenv("PROFILE_REQUIRE_OTP_FOR_MANAGED_UPDATE", "false").lower() in {"1", "true", "yes", "on"}
PROFILE_REQUIRE_CONFIRMATION_FOR_OWNER_DELETE = os.getenv("PROFILE_REQUIRE_CONFIRMATION_FOR_OWNER_DELETE", "true").lower() in {"1", "true", "yes", "on"}

ROLE_LEVEL = {
    "VISITOR": 0,
    "ADMINISTRATOR": 1,
    "OWNER": 2,
    "DEVELOPER": 3,
}

# In-memory OTP store.
# Restarting Flask clears this, which is okay for now because you removed otp_codes table.
OTP_STORE: dict[str, dict[str, Any]] = {}


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


def json_load(value: Any, fallback: Any = None) -> Any:
    if value is None:
        return fallback

    if isinstance(value, (list, dict)):
        return value

    try:
        return json.loads(value)
    except Exception:
        return fallback


def json_dump(value: Any) -> str:
    return json.dumps(value or [], ensure_ascii=False)


def normalize_role(role: str) -> str:
    role = str(role or "VISITOR").strip().upper()
    return role if role in ROLE_LEVEL else "VISITOR"


def role_level(role: str) -> int:
    return ROLE_LEVEL.get(normalize_role(role), 0)


def is_email(value: str) -> bool:
    value = str(value or "").strip()
    return "@" in value and "." in value


def clean_string(value: Any) -> str:
    return str(value or "").strip()


def confirmation_ok(value: Any) -> bool:
    text = clean_string(value)
    return len(text) == 16 and text.isalnum()


def public_superuser(row: sqlite3.Row | dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None

    item = dict(row)

    item.pop("password", None)

    item["emails"] = json_load(item.get("emails"), [])
    item["numbers"] = json_load(item.get("numbers"), [])
    item["links"] = json_load(item.get("links"), [])

    return item


def ok(
    message: str = "OK",
    data: Any = None,
    status: str = "ok",
) -> dict[str, Any]:
    return {
        "status": status,
        "message": message,
        "data": data,
    }


def fail(message: str, status: str = "error", data: Any = None) -> dict[str, Any]:
    return {
        "status": status,
        "message": message,
        "data": data,
    }


def actor_label(actor: dict[str, Any] | None) -> str:
    if not actor:
        return "UNKNOWN"

    role = normalize_role(actor.get("role"))
    actor_id = actor.get("id") or "?"
    return f"{role}[{actor_id}]"


# ==========================================================
# DATABASE GETTERS
# ==========================================================


def get_superuser_by_id(account_id: int | str) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute(
            "SELECT * FROM superusers WHERE id = ?",
            (account_id,),
        ).fetchone()


def get_superuser_by_username(username: str) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute(
            "SELECT * FROM superusers WHERE username = ?",
            (username,),
        ).fetchone()


def get_superusers_by_role(role: str | None = None) -> list[dict[str, Any]]:
    with connect() as db:
        if role:
            rows = db.execute(
                "SELECT * FROM superusers WHERE role = ? ORDER BY id ASC",
                (normalize_role(role),),
            ).fetchall()
        else:
            rows = db.execute("""
                SELECT * FROM superusers
                ORDER BY
                    CASE role
                        WHEN 'ADMINISTRATOR' THEN 1
                        WHEN 'OWNER' THEN 2
                        WHEN 'DEVELOPER' THEN 3
                        ELSE 99
                    END,
                    id ASC
                """).fetchall()

    return [public_superuser(row) for row in rows]


def get_first_developer() -> sqlite3.Row | None:
    with connect() as db:
        return db.execute(
            "SELECT * FROM superusers WHERE role = 'DEVELOPER' ORDER BY id ASC LIMIT 1"
        ).fetchone()


def get_account_email(account: sqlite3.Row | dict[str, Any] | None) -> str:
    if not account:
        return ""

    data = dict(account)
    emails = json_load(data.get("emails"), [])

    if isinstance(emails, list):
        for email in emails:
            if is_email(email):
                return email

    return ""


def verify_password(account: sqlite3.Row | dict[str, Any], password: str) -> bool:
    if not account or not password:
        return False

    stored_hash = dict(account).get("password") or ""

    try:
        return check_password_hash(stored_hash, password)
    except Exception:
        return False


# ==========================================================
# OTP
# ==========================================================


def generate_pin(length: int = 6) -> str:
    return "".join(random.choice(string.digits) for _ in range(length))


def create_otp(
    account_id: int,
    purpose: str,
    recipient_email: str,
    requested_by: int | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    token = secrets.token_urlsafe(24)
    pin = generate_pin(6)
    expires_at = datetime.now().astimezone() + timedelta(minutes=OTP_TTL_MINUTES)

    OTP_STORE[token] = {
        "token": token,
        "pin": pin,
        "account_id": int(account_id),
        "purpose": purpose,
        "recipient_email": recipient_email,
        "requested_by": requested_by,
        "meta": meta or {},
        "created_at": now_iso(),
        "expires_at": expires_at.isoformat(timespec="seconds"),
        "used": False,
    }

    return {
        "token": token,
        "pin": pin,
        "expires_at": expires_at.isoformat(timespec="seconds"),
    }


def verify_otp(
    token: str,
    pin: str,
    purpose: str | None = None,
    account_id: int | str | None = None,
    consume: bool = True,
) -> tuple[bool, str]:
    token = clean_string(token)
    pin = clean_string(pin)

    record = OTP_STORE.get(token)

    if not record:
        return False, "OTP token not found or expired."

    if record.get("used"):
        return False, "OTP has already been used."

    try:
        expires_at = datetime.fromisoformat(record["expires_at"])
        if datetime.now().astimezone() > expires_at:
            return False, "OTP has expired."
    except Exception:
        return False, "Invalid OTP expiration."

    if purpose and record.get("purpose") != purpose:
        return False, "OTP purpose does not match."

    if account_id is not None and int(record.get("account_id")) != int(account_id):
        return False, "OTP account does not match."

    if str(record.get("pin")) != str(pin):
        return False, "Invalid OTP."

    if consume:
        record["used"] = True

    return True, "OTP verified."


def cleanup_otps() -> None:
    expired: list[str] = []

    for token, record in OTP_STORE.items():
        try:
            expires_at = datetime.fromisoformat(record["expires_at"])
            if datetime.now().astimezone() > expires_at:
                expired.append(token)
        except Exception:
            expired.append(token)

    for token in expired:
        OTP_STORE.pop(token, None)


# ==========================================================
# EMAIL TEMPLATES
# ==========================================================


def get_theme_colors(theme: dict[str, Any] | None = None) -> dict[str, str]:
    theme = theme or {}

    return {
        "primary": theme.get("accent") or theme.get("primary") or "#38bdf8",
        "secondary": theme.get("success") or theme.get("secondary") or "#10b981",
        "background": theme.get("background") or theme.get("bg1") or "#020617",
        "surface": theme.get("surface") or "#0f172a",
        "text": theme.get("text") or theme.get("txtforbg1") or "#f8fafc",
        "muted": theme.get("muted_text") or theme.get("txtforbg2") or "#cbd5e1",
        "danger": theme.get("danger") or "#ef4444",
    }


def html_shell(
    title: str,
    body: str,
    theme: dict[str, Any] | None = None,
) -> str:
    colors = get_theme_colors(theme)

    return f"""
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:{colors['background']};font-family:Arial,sans-serif;color:{colors['text']};">
        <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
          <div style="border:1px solid rgba(148,163,184,.22);border-radius:24px;background:{colors['surface']};overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35);">
            <div style="padding:22px;background:linear-gradient(135deg,{colors['primary']},{colors['secondary']});color:#021018;">
              <h1 style="margin:0;font-size:24px;font-weight:900;">{title}</h1>
              <p style="margin:8px 0 0;font-size:14px;">ElectriCredit</p>
            </div>

            <div style="padding:24px;">
              {body}
            </div>

            <div style="padding:16px 24px;border-top:1px solid rgba(148,163,184,.18);color:{colors['muted']};font-size:12px;">
              This message was sent by ElectriCredit. If this was not expected, please contact the Developer or Owner.
            </div>
          </div>
        </div>
      </body>
    </html>
    """


def send_otp_email(
    to_email: str,
    pin: str,
    purpose: str,
    expires_at: str,
    theme: dict[str, Any] | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    meta = meta or {}
    readable_purpose = purpose.replace("_", " ").title()
    approval_message = clean_string(meta.get("approval_message"))

    if purpose in {"password_authorization", "managed_password_approval"} and approval_message:
        intro = f"""
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
            {approval_message}
          </p>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
            Use the OTP below only if you approve this password-change request.
          </p>
        """
        shell_title = "Password Authorization OTP"
        subject = "ElectriCredit Password Authorization OTP"
        text_intro = f"{approval_message} OTP: {pin}. It expires at {expires_at}."
    else:
        intro = f"""
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
            Your ElectriCredit OTP for <b>{readable_purpose}</b> is:
          </p>
        """
        shell_title = "Your OTP Code"
        subject = f"ElectriCredit OTP - {readable_purpose}"
        text_intro = f"Your ElectriCredit OTP for {readable_purpose} is {pin}. It expires at {expires_at}."

    body = f"""
      {intro}

      <div style="margin:22px 0;padding:18px;border-radius:18px;background:rgba(56,189,248,.12);text-align:center;">
        <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#38bdf8;">
          {pin}
        </div>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.6;color:#cbd5e1;">
        This code expires at <b>{expires_at}</b>. Do not share this code with anyone.
      </p>
    """

    return api_manager.send_email(
        to_email=to_email,
        subject=subject,
        html_body=html_shell(shell_title, body, theme),
        text_body=text_intro,
    )


def send_account_email(
    to_email: str,
    title: str,
    message: str,
    theme: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body = f"""
      <p style="margin:0;font-size:16px;line-height:1.7;">
        {message}
      </p>
    """

    return api_manager.send_email(
        to_email=to_email,
        subject=title,
        html_body=html_shell(title, body, theme),
        text_body=message,
    )


# ==========================================================
# PERMISSIONS
# ==========================================================


def get_actor(actor_id: Any) -> dict[str, Any] | None:
    if not actor_id:
        return None

    row = get_superuser_by_id(actor_id)
    return public_superuser(row)


def require_actor(actor_id: Any) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    actor = get_actor(actor_id)

    if not actor:
        return None, fail("Authorized actor is required.")

    return actor, None


def can_manage_superuser(actor_role: str, target_role: str, action: str) -> bool:
    actor_role = normalize_role(actor_role)
    target_role = normalize_role(target_role)
    action = str(action or "").lower()

    if actor_role == "DEVELOPER":
        return True

    if actor_role == "OWNER":
        if target_role == "ADMINISTRATOR":
            return action in {"add", "update", "remove"}
        return False

    return False


def requires_owner_remove_otp(target_role: str) -> bool:
    return normalize_role(target_role) == "OWNER"



# ==========================================================
# PASSWORD AUTHORIZATION HELPERS
# ==========================================================


def can_authorize_password_change(target_role: str, authorizer: sqlite3.Row | dict[str, Any] | None) -> tuple[bool, str]:
    """
    Password-change approval waterfall:
    - ADMINISTRATOR target: OWNER or DEVELOPER can authorize.
    - OWNER target: DEVELOPER can authorize.
    - DEVELOPER target: only the first/main DEVELOPER can authorize.
    """
    if not authorizer:
        return False, "Authorization account not found."

    target_role = normalize_role(target_role)
    authorizer_data = dict(authorizer)
    authorizer_role = normalize_role(authorizer_data.get("role"))

    if target_role == "ADMINISTRATOR":
        if role_level(authorizer_role) >= role_level("OWNER"):
            return True, "Authorized."
        return False, "Administrator password changes require an Owner or Developer OTP."

    if target_role == "OWNER":
        if authorizer_role == "DEVELOPER":
            return True, "Authorized."
        return False, "Owner password changes require a Developer OTP."

    if target_role == "DEVELOPER":
        first_developer = get_first_developer()
        if not first_developer:
            return False, "Main Developer account is not available."
        if authorizer_role == "DEVELOPER" and int(authorizer_data.get("id")) == int(first_developer["id"]):
            return True, "Authorized."
        return False, "Developer password changes require the main Developer OTP."

    return False, "Unsupported target role for password authorization."


def build_password_authorization_message(
    requester_name: str,
    requester_username: str,
    target_role: str,
    target_id: Any,
    target_name: str,
    target_username: str,
) -> str:
    requester = clean_string(requester_name) or "A user"
    requester_user = clean_string(requester_username)
    requester_label = f"{requester} @{requester_user}" if requester_user else requester

    target_role = normalize_role(target_role)
    target = clean_string(target_name) or clean_string(target_username) or "this account"
    target_user = clean_string(target_username)
    target_suffix = f" @{target_user}" if target_user else ""
    target_id_text = clean_string(target_id) or "?"

    return (
        f"{requester_label} has requested to change "
        f"{target_role}[{target_id_text}] {target}{target_suffix}'s password and requires your OTP."
    )


def verify_password_authorization(
    *,
    target: sqlite3.Row,
    authorizer_username: str,
    authorizer_otp_token: str,
    authorizer_otp_code: str,
) -> tuple[bool, str, sqlite3.Row | None]:
    authorizer_username = clean_string(authorizer_username)
    authorizer_otp_token = clean_string(authorizer_otp_token)
    authorizer_otp_code = clean_string(authorizer_otp_code)

    if not authorizer_username:
        return False, "Authorization username is required.", None

    if not authorizer_otp_token or not authorizer_otp_code:
        return False, "Authorization OTP is required.", None

    authorizer = get_superuser_by_username(authorizer_username)
    if not authorizer:
        return False, "Authorization account not found.", None

    allowed, message = can_authorize_password_change(target["role"], authorizer)
    if not allowed:
        return False, message, authorizer

    for purpose in ("password_authorization", "managed_password_approval"):
        verified, message = verify_otp(
            authorizer_otp_token,
            authorizer_otp_code,
            purpose=purpose,
            account_id=authorizer["id"],
            consume=True,
        )
        if verified:
            return True, "Authorization OTP verified.", authorizer

    return False, message, authorizer

# ==========================================================
# AUTH HANDLERS
# ==========================================================


def handle_login(body: dict[str, Any]) -> dict[str, Any]:
    username = clean_string(body.get("username"))
    password = clean_string(body.get("password"))
    otp_token = clean_string(body.get("otp_token"))
    otp_code = clean_string(body.get("otp_code"))

    if not username:
        return fail("Username is required.")

    account = get_superuser_by_username(username)

    if not account:
        return fail("Account not found.")

    account_public = public_superuser(account)

    if password:
        if not verify_password(account, password):
            return fail("Invalid username or password.")

        log_manager.log_login(account["role"], account["id"], "password")

        return ok(
            "Login successful.",
            {
                "user": account_public,
                "login_method": "password",
            },
        )

    if otp_token and otp_code:
        verified, message = verify_otp(
            otp_token,
            otp_code,
            purpose="login",
            account_id=account["id"],
        )

        if not verified:
            return fail(message)

        log_manager.log_login(account["role"], account["id"], "OTP")

        return ok(
            "Login successful.",
            {
                "user": account_public,
                "login_method": "otp",
            },
        )

    return fail("Password or OTP is required.")


def handle_request_otp(body: dict[str, Any]) -> dict[str, Any]:
    cleanup_otps()

    purpose = clean_string(body.get("purpose")) or "login"
    username = clean_string(body.get("username"))
    approver_username = clean_string(body.get("approver_username")) or username
    account_id = body.get("account_id")
    developer_id = body.get("developer_id")
    theme = body.get("theme") if isinstance(body.get("theme"), dict) else None

    account = None
    meta: dict[str, Any] = {
        "target_account_id": body.get("target_account_id") or body.get("target_id") or account_id,
        "target_id": body.get("target_id") or body.get("target_account_id") or account_id,
        "target_role": body.get("target_role"),
        "target_name": body.get("target_name"),
        "target_username": body.get("target_username"),
        "requester_name": body.get("requester_name"),
        "requester_username": body.get("requester_username"),
    }

    if purpose == "developer_approval":
        if developer_id:
            account = get_superuser_by_id(developer_id)
        else:
            account = get_first_developer()

        if not account:
            return fail("No developer account available for approval OTP.")

        if normalize_role(account["role"]) != "DEVELOPER":
            return fail("Developer approval OTP must be sent to a Developer account.")

    elif purpose in {"password_authorization", "managed_password_approval"}:
        if not approver_username:
            return fail("Authorization username is required.")

        account = get_superuser_by_username(approver_username)
        if not account:
            return fail("Authorization account not found.")

        target_id = body.get("target_id") or body.get("target_account_id") or account_id
        target = get_superuser_by_id(target_id) if target_id else None
        if target:
            allowed, message = can_authorize_password_change(target["role"], account)
            if not allowed:
                return fail(message)

            meta.update(
                {
                    "target_id": target["id"],
                    "target_account_id": target["id"],
                    "target_role": target["role"],
                    "target_name": target["name"],
                    "target_username": target["username"],
                }
            )

        approval_message = clean_string(body.get("approval_message"))
        if not approval_message:
            approval_message = build_password_authorization_message(
                requester_name=clean_string(body.get("requester_name")) or "A user",
                requester_username=clean_string(body.get("requester_username")),
                target_role=meta.get("target_role") or (target["role"] if target else "ACCOUNT"),
                target_id=meta.get("target_id") or "?",
                target_name=meta.get("target_name") or "account",
                target_username=meta.get("target_username") or "",
            )
        meta["approval_message"] = approval_message

    else:
        if account_id:
            account = get_superuser_by_id(account_id)
        elif username:
            account = get_superuser_by_username(username)

        if not account:
            return fail("Account not found.")

    email = get_account_email(account)

    if not email:
        return fail("This account has no valid email address.")

    otp = create_otp(
        account_id=account["id"],
        purpose=purpose,
        recipient_email=email,
        requested_by=body.get("requested_by"),
        meta=meta,
    )

    email_result = send_otp_email(
        to_email=email,
        pin=otp["pin"],
        purpose=purpose,
        expires_at=otp["expires_at"],
        theme=theme,
        meta=meta,
    )

    log_manager.log_otp_sent(account["role"], account["id"], purpose)

    response_data = {
        "otp_token": otp["token"],
        "expires_at": otp["expires_at"],
        "expires_in": OTP_TTL_MINUTES * 60,
        "cooldown_seconds": OTP_TTL_MINUTES * 60,
        "sent_to": email,
        "purpose": purpose,
        "email_sent": bool(email_result.get("ok")),
    }

    if PROFILE_OTP_ECHO:
        response_data["dev_pin"] = otp["pin"]

    if not email_result.get("ok"):
        response_data["email_error"] = email_result

        if not PROFILE_OTP_ALLOW_LOCAL_FALLBACK:
            return fail("OTP was created but email failed to send.", data=response_data)

        return ok(
            "OTP created locally, but email failed to send. Check SMTP configuration.",
            response_data,
        )

    return ok("OTP sent.", response_data)


def handle_me(body: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Since we are not yet using real Flask server sessions,
    frontend may pass account_id later.
    Without account_id, this returns visitor.
    """
    body = body or {}
    account_id = body.get("account_id")

    if not account_id:
        return ok("Visitor mode.", {"user": None})

    account = get_superuser_by_id(account_id)

    if not account:
        return ok("Visitor mode.", {"user": None})

    return ok("Current account loaded.", {"user": public_superuser(account)})


# ==========================================================
# PROFILE UPDATE / PASSWORD CHANGE
# ==========================================================


def handle_change_password(body: dict[str, Any]) -> dict[str, Any]:
    account_id = body.get("account_id") or body.get("actor_id")
    new_password = clean_string(body.get("new_password"))
    current_password = clean_string(body.get("current_password"))

    method = clean_string(body.get("password_verification_method") or body.get("password_method") or body.get("method") or "password").lower()

    otp_token = clean_string(body.get("otp_token"))
    otp_code = clean_string(body.get("otp_code"))

    authorizer_username = clean_string(body.get("authorizer_username") or body.get("approver_username"))
    authorizer_otp_token = clean_string(body.get("authorizer_otp_token") or body.get("approver_otp_token") or body.get("developer_otp_token"))
    authorizer_otp_code = clean_string(body.get("authorizer_otp_code") or body.get("approver_otp_code") or body.get("developer_otp_code"))

    if not account_id:
        return fail("account_id is required.")

    if len(new_password) < 6:
        return fail("New password must be at least 6 characters.")

    account = get_superuser_by_id(account_id)

    if not account:
        return fail("Account not found.")

    if method == "otp":
        if not otp_token or not otp_code:
            return fail("Account OTP is required.")

        verified, message = verify_otp(
            otp_token,
            otp_code,
            purpose="change_password",
            account_id=account["id"],
        )

        if not verified:
            return fail(message)

        approval_method = "account_otp_and_authorization_otp"
    else:
        if not current_password:
            return fail("Old password is required.")

        if not verify_password(account, current_password):
            return fail("Old password is incorrect.")

        approval_method = "old_password_and_authorization_otp"

    authorized, message, authorizer = verify_password_authorization(
        target=account,
        authorizer_username=authorizer_username,
        authorizer_otp_token=authorizer_otp_token,
        authorizer_otp_code=authorizer_otp_code,
    )

    if not authorized:
        return fail(message)

    with connect() as db:
        db.execute(
            "UPDATE superusers SET password = ? WHERE id = ?",
            (generate_password_hash(new_password), account["id"]),
        )
        db.commit()

    log_manager.log_password_changed(
        account["role"],
        account["id"],
        f"{approval_method}_by_{normalize_role(authorizer['role'])}[{authorizer['id']}]" if authorizer else approval_method,
    )

    email = get_account_email(account)
    if email:
        send_account_email(
            email,
            "ElectriCredit Password Changed",
            "Your ElectriCredit account password was changed. If this was not done by you, contact the Developer immediately.",
        )

    return ok("Password changed successfully.")


def handle_update_profile(body: dict[str, Any]) -> dict[str, Any]:
    account_id = body.get("account_id") or body.get("actor_id")
    otp_token = clean_string(body.get("otp_token"))
    otp_code = clean_string(body.get("otp_code"))

    if not account_id:
        return fail("account_id is required.")

    account = get_superuser_by_id(account_id)

    if not account:
        return fail("Account not found.")

    if PROFILE_REQUIRE_OTP_FOR_SELF_UPDATE:
        verified, message = verify_otp(
            otp_token,
            otp_code,
            purpose="update_profile",
            account_id=account["id"],
        )

        if not verified:
            return fail(message)

    allowed_fields = {
        "name",
        "username",
        "birthdate",
        "gender",
        "emails",
        "numbers",
        "links",
        "image",
    }

    updates: dict[str, Any] = {}

    for field in allowed_fields:
        if field not in body:
            continue

        value = body[field]

        if field in {"emails", "numbers", "links"}:
            value = json_dump(value if isinstance(value, list) else [])

        updates[field] = value

    if not updates:
        return fail("No editable fields provided.")

    set_clause = ", ".join([f"{field} = ?" for field in updates])
    values = list(updates.values())
    values.append(account["id"])

    with connect() as db:
        db.execute(
            f"UPDATE superusers SET {set_clause} WHERE id = ?",
            values,
        )
        db.commit()

    updated = get_superuser_by_id(account["id"])

    log_manager.log_profile_updated(
        account["role"],
        account["id"],
    )

    return ok(
        "Profile updated successfully.",
        {
            "user": public_superuser(updated),
        },
    )


# ==========================================================
# SUPERUSER MANAGEMENT
# ==========================================================


def handle_get_superusers(body: dict[str, Any] | None = None) -> dict[str, Any]:
    body = body or {}
    role = body.get("role")

    return ok(
        "Superusers loaded.",
        get_superusers_by_role(role),
    )


def handle_add_superuser(body: dict[str, Any]) -> dict[str, Any]:
    actor, error = require_actor(body.get("actor_id"))
    if error:
        return error

    target_role = normalize_role(body.get("role"))

    if target_role == "VISITOR":
        return fail("Invalid role.")

    if not can_manage_superuser(actor["role"], target_role, "add"):
        return fail("Permission denied.")

    name = clean_string(body.get("name"))
    username = clean_string(body.get("username"))
    password = clean_string(body.get("password"))

    if not name or not username or not password:
        return fail("Name, username, and password are required.")

    if len(password) < 6:
        return fail("Password must be at least 6 characters.")

    if get_superuser_by_username(username):
        return fail("Username already exists.")

    emails = body.get("emails") if isinstance(body.get("emails"), list) else []
    numbers = body.get("numbers") if isinstance(body.get("numbers"), list) else []
    links = body.get("links") if isinstance(body.get("links"), list) else []

    with connect() as db:
        cursor = db.execute(
            """
            INSERT INTO superusers (
                name, username, password, birthdate, gender,
                emails, numbers, links, image, role, created
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                username,
                generate_password_hash(password),
                clean_string(body.get("birthdate")) or "2000-01-01",
                clean_string(body.get("gender")) or "Other",
                json_dump(emails),
                json_dump(numbers),
                json_dump(links),
                clean_string(body.get("image")),
                target_role,
                now_iso(),
            ),
        )
        db.commit()
        new_id = cursor.lastrowid

    created = get_superuser_by_id(new_id)
    created_public = public_superuser(created)

    log_manager.log_superuser_added(
        actor_role=actor["role"],
        actor_id=actor["id"],
        target_role=target_role,
        target_id=new_id,
        target_name=name,
    )

    email_result = {"ok": False, "message": "No account email."}
    email = get_account_email(created)
    if email:
        email_result = send_account_email(
            email,
            f"Welcome to ElectriCredit as {target_role}",
            (
                f"Hello {name}, your ElectriCredit {target_role} account has been created. "
                f"Username: {username}. Please change your password after logging in."
            ),
        )

    return ok(
        f"{target_role.title()} account added successfully.",
        {
            "user": created_public,
            "email_result": email_result,
        },
    )


def handle_update_superuser(body: dict[str, Any]) -> dict[str, Any]:
    actor, error = require_actor(body.get("actor_id"))
    if error:
        return error

    target_id = body.get("target_id") or body.get("account_id")
    otp_token = clean_string(body.get("otp_token"))
    otp_code = clean_string(body.get("otp_code"))
    developer_otp_token = clean_string(body.get("developer_otp_token"))
    developer_otp_code = clean_string(body.get("developer_otp_code"))

    if not target_id:
        return fail("target_id is required.")

    target = get_superuser_by_id(target_id)
    if not target:
        return fail("Target account not found.")

    target_role = normalize_role(target["role"])
    is_self_update = int(actor["id"]) == int(target["id"])

    if not is_self_update and not can_manage_superuser(actor["role"], target_role, "update"):
        return fail("Permission denied.")

    if is_self_update:
        if PROFILE_REQUIRE_OTP_FOR_SELF_UPDATE:
            verified, message = verify_otp(
                otp_token,
                otp_code,
                purpose="update_profile",
                account_id=target["id"],
            )
            if not verified:
                return fail(message)
    elif PROFILE_REQUIRE_OTP_FOR_MANAGED_UPDATE:
        verified = False
        message = "Managed account update requires OTP."

        if developer_otp_token and developer_otp_code:
            verified, message = verify_otp(
                developer_otp_token,
                developer_otp_code,
                purpose="developer_approval",
            )
        elif otp_token and otp_code:
            verified, message = verify_otp(
                otp_token,
                otp_code,
                purpose="update_profile",
                account_id=actor["id"],
            )

        if not verified:
            return fail(message)

    allowed_fields = {
        "name",
        "username",
        "birthdate",
        "gender",
        "emails",
        "numbers",
        "links",
        "image",
        "role",
    }

    updates: dict[str, Any] = {}

    for field in allowed_fields:
        if field not in body:
            continue

        value = body[field]

        if field == "role":
            value = normalize_role(value)
            if not can_manage_superuser(actor["role"], value, "update"):
                return fail("Permission denied to set this role.")

        if field in {"emails", "numbers", "links"}:
            value = json_dump(value if isinstance(value, list) else [])

        updates[field] = value

    password_changed = False
    password_method_used = ""

    if body.get("password_change_requested") or clean_string(body.get("new_password")):
        new_password = clean_string(body.get("new_password"))
        if len(new_password) < 6:
            return fail("New password must be at least 6 characters.")

        password_method = clean_string(body.get("password_verification_method") or "password").lower()

        if password_method == "otp":
            verified, message = verify_otp(
                clean_string(body.get("target_otp_token")),
                clean_string(body.get("target_otp_code")),
                purpose="managed_password_target",
                account_id=target["id"],
            )
            if not verified:
                return fail(message)
            password_method_used = "target_otp"
        else:
            target_current_password = clean_string(body.get("target_current_password"))
            if not target_current_password:
                return fail("Target old password is required for Old PW mode.")
            if not verify_password(target, target_current_password):
                return fail("Target old password is incorrect.")
            password_method_used = "target_old_password"

        authorized, message, authorizer = verify_password_authorization(
            target=target,
            authorizer_username=clean_string(body.get("approver_username") or body.get("authorizer_username")),
            authorizer_otp_token=clean_string(body.get("approver_otp_token") or body.get("authorizer_otp_token")),
            authorizer_otp_code=clean_string(body.get("approver_otp_code") or body.get("authorizer_otp_code")),
        )

        if not authorized:
            return fail(message)

        updates["password"] = generate_password_hash(new_password)
        password_changed = True
        password_method_used = f"{password_method_used}_approved_by_{normalize_role(authorizer['role'])}[{authorizer['id']}]" if authorizer else password_method_used

    if not updates:
        return fail("No editable fields provided.")

    if "username" in updates:
        existing = get_superuser_by_username(str(updates["username"]))
        if existing and int(existing["id"]) != int(target["id"]):
            return fail("Username already exists.")

    set_clause = ", ".join([f"{field} = ?" for field in updates])
    values = list(updates.values())
    values.append(target["id"])

    with connect() as db:
        db.execute(f"UPDATE superusers SET {set_clause} WHERE id = ?", values)
        db.commit()

    updated = get_superuser_by_id(target["id"])

    log_manager.log_superuser_updated(
        actor_role=actor["role"],
        actor_id=actor["id"],
        target_role=target_role,
        target_id=target["id"],
    )

    email = get_account_email(updated)
    if email:
        if password_changed:
            send_account_email(
                email,
                "ElectriCredit Password Changed",
                "Your ElectriCredit account password was changed by an authorized account. If this was not expected, contact the Developer immediately.",
            )
        else:
            send_account_email(
                email,
                "ElectriCredit Account Updated",
                "Your ElectriCredit account details were updated.",
            )

    if password_changed:
        log_manager.log_password_changed(target_role, target["id"], password_method_used)

    return ok("Account updated successfully.", {"user": public_superuser(updated)})


def handle_remove_superuser(body: dict[str, Any]) -> dict[str, Any]:
    actor, error = require_actor(body.get("actor_id"))
    if error:
        return error

    target_id = body.get("target_id")

    if not target_id:
        return fail("target_id is required.")

    target = get_superuser_by_id(target_id)

    if not target:
        return fail("Target account not found.")

    target_role = normalize_role(target["role"])

    if not can_manage_superuser(actor["role"], target_role, "remove"):
        return fail("Permission denied.")

    # Removing OWNER requires OTP and a frontend-generated 16-character confirmation key.
    if requires_owner_remove_otp(target_role):
        if PROFILE_REQUIRE_CONFIRMATION_FOR_OWNER_DELETE and not confirmation_ok(body.get("confirmation_key") or body.get("confirm_key")):
            return fail("Removing an OWNER requires a valid 16-character confirmation key.")

        otp_token = clean_string(body.get("otp_token"))
        otp_code = clean_string(body.get("otp_code"))

        verified, message = verify_otp(
            otp_token,
            otp_code,
            purpose="remove_owner",
            account_id=actor["id"],
        )

        if not verified:
            return fail(message)

    # Avoid removing the last developer.
    if target_role == "DEVELOPER":
        developers = get_superusers_by_role("DEVELOPER")
        if len(developers) <= 1:
            return fail("Cannot remove the last Developer account.")

    target_public = public_superuser(target)
    target_email = get_account_email(target)

    with connect() as db:
        db.execute(
            "DELETE FROM superusers WHERE id = ?",
            (target["id"],),
        )
        db.commit()

    log_manager.log_superuser_removed(
        actor_role=actor["role"],
        actor_id=actor["id"],
        target_role=target_role,
        target_id=target["id"],
        target_name=target["name"],
    )
    
    if target_email:
        send_account_email(
            target_email,
            "ElectriCredit Account Removed",
            "Your ElectriCredit account has been removed from the system.",
        )

    return ok(
        "Account removed successfully.",
        {
            "removed": target_public,
        },
    )

"""
============================================================
ELECTRICREDIT V2 - API MANAGER
File: api_manager.py

Purpose:
- Manage external API providers
- AI Providers: Gemini first, Groq fallback
- Email: SMTP HTML email sender
- SMS: UniSMS sender
- Used later by chatbot.py and announcement.py

Important:
- Chatbot conversation must NOT be saved here.
- This file only sends requests and returns responses.
============================================================
"""

from __future__ import annotations

import base64
import json
import os
import smtplib
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any


# ==========================================================
# OPTIONAL .ENV LOADER
# ==========================================================

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


# ==========================================================
# ENV HELPERS
# ==========================================================

def env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def env_bool(key: str, default: bool = False) -> bool:
    value = env(key, str(default)).lower()
    return value in {"1", "true", "yes", "on"}


def env_list(key: str) -> list[str]:
    raw = env(key)
    if not raw:
        return []

    blocked = {
        "api_key",
        "api_key_1",
        "api_key_2",
        "api_key_3",
        "your_api_key",
        "your_real_api_key",
        "your_real_gemini_key",
        "your_real_groq_key",
    }

    output: list[str] = []
    for item in raw.split(","):
        value = item.strip()
        if not value:
            continue
        lower = value.lower()
        if lower in blocked or lower.startswith("your_"):
            continue
        output.append(value)

    return output


# ==========================================================
# CONFIG
# ==========================================================

GEMINI_API_KEYS = env_list("GEMINI_API_KEYS")
GROQ_API_KEYS = env_list("GROQ_API_KEYS")

GEMINI_MODEL = env("GEMINI_MODEL", "gemini-2.0-flash")
GROQ_MODEL = env("GROQ_MODEL", "llama-3.1-8b-instant")

SMTP_HOST = env("SMTP_HOST")
SMTP_PORT = int(env("SMTP_PORT", "587") or 587)
SMTP_SECURE = env_bool("SMTP_SECURE", False)
SMTP_USER = env("SMTP_USER")
SMTP_PASS = env("SMTP_PASS")
SMTP_FROM_NAME = env("SMTP_FROM_NAME", "ElectriCredit")
SMTP_FROM_EMAIL = env("SMTP_FROM_EMAIL", SMTP_USER)

UNISMS_API_KEY = env("UNISMS_API_KEY")
UNISMS_SENDER_ID = env("UNISMS_SENDER_ID", "ElectriCredit")

# Keep configurable because UniSMS endpoint may differ depending on account/version.
UNISMS_API_URL = env("UNISMS_API_URL", "https://unismsapi.com/api/sms")


def has_ai_provider() -> bool:
    return bool(GEMINI_API_KEYS or GROQ_API_KEYS)


# ==========================================================
# RESULT OBJECT
# ==========================================================

@dataclass
class ApiResult:
    ok: bool
    provider: str
    message: str
    data: Any = None
    error: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "provider": self.provider,
            "message": self.message,
            "data": self.data,
            "error": self.error,
        }


# ==========================================================
# HTTP HELPER
# ==========================================================

def post_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str] | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url=url,
        data=body,
        headers={
            "Content-Type": "application/json",
            **(headers or {}),
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            try:
                return json.loads(response_body)
            except json.JSONDecodeError:
                return {
                    "raw": response_body
                }

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {error_body}") from exc

    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}") from exc


# ==========================================================
# AI MESSAGE NORMALIZATION
# ==========================================================

def normalize_messages(
    prompt: str | None = None,
    messages: list[dict[str, str]] | None = None,
    system: str | None = None,
) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []

    if system:
        output.append({
            "role": "system",
            "content": system,
        })

    if messages:
        for item in messages:
            role = str(item.get("role", "user")).strip() or "user"
            content = str(item.get("content", "")).strip()

            if content:
                output.append({
                    "role": role,
                    "content": content,
                })

    if prompt:
        output.append({
            "role": "user",
            "content": prompt,
        })

    return output


def messages_to_gemini_text(messages: list[dict[str, str]]) -> str:
    lines: list[str] = []

    for item in messages:
        role = item.get("role", "user").upper()
        content = item.get("content", "")
        lines.append(f"{role}: {content}")

    return "\n\n".join(lines)


# ==========================================================
# GEMINI
# ==========================================================

def send_to_gemini(
    messages: list[dict[str, str]],
    api_key: str,
    model: str = GEMINI_MODEL,
    temperature: float = 0.4,
    timeout: int = 30,
) -> ApiResult:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    text = messages_to_gemini_text(messages)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": text
                    }
                ],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
        },
    }

    data = post_json(url, payload, timeout=timeout)

    try:
        reply = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        reply = ""

    if not reply:
        return ApiResult(
            ok=False,
            provider="gemini",
            message="Gemini returned no text.",
            data=data,
            error="EMPTY_RESPONSE",
        )

    return ApiResult(
        ok=True,
        provider="gemini",
        message=reply,
        data=data,
    )


# ==========================================================
# GROQ
# ==========================================================

def send_to_groq(
    messages: list[dict[str, str]],
    api_key: str,
    model: str = GROQ_MODEL,
    temperature: float = 0.4,
    timeout: int = 30,
) -> ApiResult:
    url = "https://api.groq.com/openai/v1/chat/completions"

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    data = post_json(url, payload, headers=headers, timeout=timeout)

    try:
        reply = data["choices"][0]["message"]["content"]
    except Exception:
        reply = ""

    if not reply:
        return ApiResult(
            ok=False,
            provider="groq",
            message="Groq returned no text.",
            data=data,
            error="EMPTY_RESPONSE",
        )

    return ApiResult(
        ok=True,
        provider="groq",
        message=reply,
        data=data,
    )


# ==========================================================
# AI FALLBACK MANAGER
# ==========================================================

def send_to_ai(
    prompt: str | None = None,
    messages: list[dict[str, str]] | None = None,
    system: str | None = None,
    temperature: float = 0.4,
    timeout: int = 30,
) -> dict[str, Any]:
    """
    Main AI function.

    Priority:
    1. Gemini keys, in order
    2. Groq keys, in order

    Returns:
    {
      "ok": true/false,
      "provider": "gemini/groq/none",
      "response": "...",
      "error": "...",
      "attempts": [...]
    }
    """

    normalized_messages = normalize_messages(
        prompt=prompt,
        messages=messages,
        system=system,
    )

    if not normalized_messages:
        return {
            "ok": False,
            "provider": "none",
            "response": "",
            "error": "No prompt or messages provided.",
            "attempts": [],
        }

    attempts: list[dict[str, Any]] = []

    # 1. Gemini priority
    for index, key in enumerate(GEMINI_API_KEYS, start=1):
        try:
            result = send_to_gemini(
                messages=normalized_messages,
                api_key=key,
                temperature=temperature,
                timeout=timeout,
            )

            attempts.append({
                "provider": "gemini",
                "key_index": index,
                "ok": result.ok,
                "error": result.error,
            })

            if result.ok:
                return {
                    "ok": True,
                    "provider": "gemini",
                    "response": result.message,
                    "error": "",
                    "attempts": attempts,
                }

        except Exception as exc:
            attempts.append({
                "provider": "gemini",
                "key_index": index,
                "ok": False,
                "error": str(exc),
            })

    # 2. Groq fallback
    for index, key in enumerate(GROQ_API_KEYS, start=1):
        try:
            result = send_to_groq(
                messages=normalized_messages,
                api_key=key,
                temperature=temperature,
                timeout=timeout,
            )

            attempts.append({
                "provider": "groq",
                "key_index": index,
                "ok": result.ok,
                "error": result.error,
            })

            if result.ok:
                return {
                    "ok": True,
                    "provider": "groq",
                    "response": result.message,
                    "error": "",
                    "attempts": attempts,
                }

        except Exception as exc:
            attempts.append({
                "provider": "groq",
                "key_index": index,
                "ok": False,
                "error": str(exc),
            })

    return {
        "ok": False,
        "provider": "none",
        "response": "",
        "error": "All AI providers failed or no API keys configured.",
        "attempts": attempts,
    }


# ==========================================================
# EMAIL / SMTP
# ==========================================================

def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    from_name: str | None = None,
    from_email: str | None = None,
) -> dict[str, Any]:
    if not SMTP_HOST:
        return {
            "ok": False,
            "provider": "smtp",
            "message": "SMTP_HOST is not configured.",
        }

    if not SMTP_USER or not SMTP_PASS:
        return {
            "ok": False,
            "provider": "smtp",
            "message": "SMTP_USER or SMTP_PASS is not configured.",
        }

    sender_name = from_name or SMTP_FROM_NAME
    sender_email = from_email or SMTP_FROM_EMAIL or SMTP_USER

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = to_email

    plain = text_body or "This email requires an HTML-capable email client."

    message.attach(MIMEText(plain, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if SMTP_SECURE:
            context = ssl.create_default_context()

            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(sender_email, [to_email], message.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(sender_email, [to_email], message.as_string())

        return {
            "ok": True,
            "provider": "smtp",
            "message": "Email sent.",
            "to": to_email,
        }

    except Exception as exc:
        return {
            "ok": False,
            "provider": "smtp",
            "message": "Email failed.",
            "error": str(exc),
        }


# ==========================================================
# SMS / UNISMS
# ==========================================================

def send_sms(
    to_number: str,
    message: str,
    sender_id: str | None = None,
) -> dict[str, Any]:
    if not UNISMS_API_KEY:
        return {
            "ok": False,
            "provider": "unisms",
            "message": "UNISMS_API_KEY is not configured.",
        }

    if not to_number:
        return {
            "ok": False,
            "provider": "unisms",
            "message": "Target number is required.",
        }

    if not message:
        return {
            "ok": False,
            "provider": "unisms",
            "message": "SMS message is required.",
        }

    payload = {
        "recipient": to_number,
        "content": message,
    }

    selected_sender = sender_id or UNISMS_SENDER_ID
    if selected_sender:
        payload["sender_id"] = selected_sender

    credentials = f"{UNISMS_API_KEY}:"
    encoded_credentials = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
    }

    try:
        data = post_json(
            UNISMS_API_URL,
            payload,
            headers=headers,
            timeout=30
        )

        return {
            "ok": True,
            "provider": "unisms",
            "message": "SMS request sent.",
            "data": data,
        }

    except Exception as exc:
        return {
            "ok": False,
            "provider": "unisms",
            "message": "SMS failed.",
            "error": str(exc),
        }


# ==========================================================
# STATUS
# ==========================================================

def get_api_status() -> dict[str, Any]:
    return {
        "ai": {
            "configured": has_ai_provider(),
            "gemini_keys": len(GEMINI_API_KEYS),
            "groq_keys": len(GROQ_API_KEYS),
            "gemini_model": GEMINI_MODEL,
            "groq_model": GROQ_MODEL,
            "priority": ["gemini", "groq"],
            "note": "Configured only means keys were loaded. If chatbot still falls back, check CHATBOT AI FAILED in Flask terminal for provider errors.",
        },
        "smtp": {
            "configured": bool(SMTP_HOST and SMTP_USER and SMTP_PASS),
            "host": SMTP_HOST,
            "port": SMTP_PORT,
            "secure": SMTP_SECURE,
            "user": SMTP_USER,
            "from_name": SMTP_FROM_NAME,
            "from_email": SMTP_FROM_EMAIL,
            "password_loaded": bool(SMTP_PASS),
        },
        "sms": {
            "configured": bool(UNISMS_API_KEY),
            "sender_id": UNISMS_SENDER_ID,
            "api_url": UNISMS_API_URL,
            "api_key_loaded": bool(UNISMS_API_KEY),
        },
    }


# ==========================================================
# QUICK MANUAL TEST
# ==========================================================

if __name__ == "__main__":
    print(json.dumps(get_api_status(), indent=4))
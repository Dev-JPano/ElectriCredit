"""
============================================================
ELECTRICREDIT V2 - CHATBOT BACKEND
File: chatbot.py

Purpose:
- Handles chatbot backend logic
- Uses api_manager.py for Gemini/Groq AI
- Handles slash commands
- Fetches database data when commands need it
- Does NOT save chatbot conversations to SQLite
- Does NOT write chatbot conversations to logs

Frontend:
POST /api/chatbot/message

Expected body:
{
    "message": "hello",
    "history": [
        {"role": "user", "content": "previous message"},
        {"role": "assistant", "content": "previous reply"}
    ]
}
============================================================
"""

from __future__ import annotations

import json
import random
import re
from pathlib import Path
from typing import Any

import api_manager

try:
    from database import database as db
except Exception:
    db = None


LAST_RANDOM_PICK: dict[str, str] = {}

# ==========================================================
# PATHS
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent
RULES_PATH = BASE_DIR / "static" / "components" / "header" / "chatbot" / "chatbot_rules.json"


# ==========================================================
# BASIC HELPERS
# ==========================================================

def ok_response(
    response: str,
    reply: list[str] | None = None,
    mode: str = "local",
    intent: str = "general",
    cards: list[dict[str, Any]] | None = None,
    data: Any = None,
) -> dict[str, Any]:
    return {
        "status": "ok",
        "mode": mode,
        "intent": intent,
        "response": response,
        "reply": reply or default_replies(),
        "cards": cards or [],
        "data": data,
    }


def error_response(message: str, reply: list[str] | None = None) -> dict[str, Any]:
    return {
        "status": "error",
        "mode": "error",
        "intent": "error",
        "response": message,
        "reply": reply or default_replies(),
        "cards": [],
        "data": None,
    }


def clean_message(value: Any) -> str:
    return str(value or "").strip()


def default_replies() -> list[str]:
    rules = load_rules()
    return rules.get(
        "defaultSuggestedReplies",
        [
            "What is ElectriCredit?",
            "Explain Hardware",
            "How does top-up work?",
            "Why is Software disabled?",
        ],
    )


def load_rules() -> dict[str, Any]:
    try:
        with open(RULES_PATH, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return {
            "identity": {
                "outsideTopicReply": "I can only help with ElectriCredit."
            },
            "system": {
                "summary": "ElectriCredit is a local-first prepaid electricity management system."
            },
            "offline": {
                "messages": [
                    "I am currently offline. Kindly contact an Administrator or Developer for direct assistance."
                ]
            },
            "defaultSuggestedReplies": [
                "What is ElectriCredit?",
                "Explain Hardware",
                "How does top-up work?",
                "Why is Software disabled?",
            ],
        }


def pick_rule_message(pool_name: str, fallback: str) -> str:
    rules = load_rules()
    pools = rules.get("randomPools", {}) if isinstance(rules, dict) else {}
    messages = pools.get(pool_name, [])

    if not isinstance(messages, list) or not messages:
        messages = [fallback]

    if len(messages) == 1:
        return str(messages[0])

    last = LAST_RANDOM_PICK.get(pool_name)
    picked = random.choice(messages)
    guard = 0

    while picked == last and guard < 8:
        picked = random.choice(messages)
        guard += 1

    LAST_RANDOM_PICK[pool_name] = str(picked)
    return str(picked)


def offline_message(pool_name: str = "localServerOffline") -> str:
    return pick_rule_message(
        pool_name,
        "The server is running locally. Please contact the developer directly or try /help.",
    )


def looks_like_provider_credit_error(text: Any) -> bool:
    value = str(text or "").lower()
    return bool(re.search(r"quota|credit|credits|billing|exhaust|insufficient|resource_exhausted|rate limit|api key|provider", value))


def is_electricity_question(text: str) -> bool:
    return bool(re.search(
        r"(blackout|brownout|outage|no power|power cut|electricity|electrical|kwh|kilowatt|watt|voltage|current|breaker|short circuit|bill|billing|consumption)",
        text.lower(),
    ))


def normalize_history(history: Any, limit: int = 8) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []

    output: list[dict[str, str]] = []

    for item in history[-limit:]:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role", "user")).strip().lower()
        content = str(item.get("content") or item.get("text") or "").strip()

        if not content:
            continue

        if role in {"assistant", "bot", "model"}:
            role = "assistant"
        else:
            role = "user"

        output.append({
            "role": role,
            "content": content,
        })

    return output


def parse_json_response(text: str) -> dict[str, Any] | None:
    if not text:
        return None

    cleaned = text.strip()

    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        return None

    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def format_label(prefix: str, value: Any) -> str:
    return f"{prefix}[{value}]"


# ==========================================================
# MAIN ENTRY
# ==========================================================

def handle_message_request(body: dict[str, Any]) -> dict[str, Any]:
    message = clean_message(body.get("message"))
    history = normalize_history(body.get("history"))

    if not message:
        return error_response("Message is required.")

    command = parse_command(message)

    if command:
        return handle_command(command, message)

    # Try AI. If unavailable, fallback to local/offline.
    ai_result = run_ai_chat(message, history)

    if ai_result.get("ok"):
        return ok_response(
            response=ai_result["response"],
            reply=ai_result.get("reply") or default_replies(),
            mode="ai",
            intent=ai_result.get("intent", "ai"),
            cards=ai_result.get("cards", []),
            data={
                "provider": ai_result.get("provider"),
            },
        )

    fallback = handle_offline_free_text(message)
    fallback["mode"] = "local_fallback"
    fallback["data"] = {
        "provider_error": ai_result.get("error"),
        "attempts": ai_result.get("attempts", []),
    }

    if looks_like_provider_credit_error(ai_result.get("error")):
        fallback["intent"] = "provider_rest"
        fallback["response"] = offline_message("providerRest")
        fallback["reply"] = ["/contact", "/devs", "/help", "/status", "Try commands"]

    return fallback


# ==========================================================
# AI LOGIC
# ==========================================================

def run_ai_chat(message: str, history: list[dict[str, str]]) -> dict[str, Any]:
    rules = load_rules()

    system_prompt = build_system_prompt(rules)

    messages: list[dict[str, str]] = []

    for item in history:
        messages.append(item)

    messages.append({
        "role": "user",
        "content": message,
    })

    ai = api_manager.send_to_ai(
        messages=messages,
        system=system_prompt,
        temperature=0.35,
        timeout=25,
    )

    if not ai.get("ok"):
        # Development diagnostics: shows real provider errors in the Flask terminal
        # without exposing API keys.
        try:
            print("CHATBOT AI FAILED:")
            print(json.dumps({
                "error": ai.get("error"),
                "provider": ai.get("provider"),
                "attempts": ai.get("attempts", []),
            }, indent=4, ensure_ascii=False))
        except Exception:
            pass

        return {
            "ok": False,
            "error": ai.get("error", "AI unavailable."),
            "attempts": ai.get("attempts", []),
        }

    raw = ai.get("response", "")
    parsed = parse_json_response(raw)

    if parsed:
        response = str(parsed.get("response") or "").strip()
        replies = parsed.get("reply") or parsed.get("replies") or []
        intent = str(parsed.get("intent") or "ai").strip()

        if not isinstance(replies, list):
            replies = default_replies()

        if response:
            return {
                "ok": True,
                "provider": ai.get("provider", "ai"),
                "intent": intent,
                "response": response,
                "reply": [str(item) for item in replies[:6]],
                "cards": parsed.get("cards", []),
            }

    return {
        "ok": True,
        "provider": ai.get("provider", "ai"),
        "intent": "ai",
        "response": raw.strip(),
        "reply": default_replies(),
        "cards": [],
    }


def build_system_prompt(rules: dict[str, Any]) -> str:
    project_summary = rules.get("system", {}).get("summary", "")
    identity = rules.get("identity", {})
    navigation = rules.get("navigation", {})
    roles = rules.get("roles", {})
    hardware = rules.get("hardware", {})
    transactions = rules.get("transactions", {})
    security = rules.get("security", {})
    contact = rules.get("contactGuide", {})

    return f"""
You are the official ElectriCredit Assistant.

Scope:
- Answer primarily about ElectriCredit.
- You may answer basic electricity-related questions when they relate to outage/blackout, brownout, kWh, power consumption, billing concept, or safety.
- If asked about a live area blackout/outage, say you cannot verify live outage status unless an outage provider/API is connected. Suggest checking the utility provider, barangay/local advisory, building administrator, or developer for ElectriCredit device/network checks.
- Do not answer unrelated topics outside ElectriCredit or electricity operation.
- Do not invent live database records.
- Do not expose API keys, passwords, tokens, .env values, Wi-Fi passwords, SMTP credentials, SMS keys, or payment secrets.
- Do not claim online payment works unless configured.
- Chat history is browser-only. Do not say it is saved to server.

Project:
{project_summary}

Navigation:
{json.dumps(navigation, ensure_ascii=False)}

Roles:
{json.dumps(roles, ensure_ascii=False)}

Hardware:
{json.dumps(hardware, ensure_ascii=False)}

Transactions:
{json.dumps(transactions, ensure_ascii=False)}

Security:
{json.dumps(security, ensure_ascii=False)}

Contact Guide:
{json.dumps(contact, ensure_ascii=False)}

Response format:
Return strict JSON only:
{{
  "intent": "short_intent",
  "response": "final answer for user",
  "reply": ["short follow-up 1", "short follow-up 2", "short follow-up 3"]
}}

Keep response concise and useful.
""".strip()


def handle_offline_free_text(message: str) -> dict[str, Any]:
    lower = message.lower().strip()

    # Commands / help first.
    if lower.startswith("/") or re.search(r"\b(reset|clear|command|commands|help)\b", lower):
        return command_help_response()

    # Direct role/person requests.
    if re.search(r"\b(contact|developer|developers|devs)\b", lower):
        return command_superusers("DEVELOPER")

    if re.search(r"\b(admin|admins|administrator|administrators)\b", lower):
        return command_superusers("ADMINISTRATOR")

    if re.search(r"\b(owner|owners)\b", lower):
        return command_superusers("OWNER")

    # Electricity questions are allowed even when outside direct system scope.
    if is_electricity_question(lower):
        return ok_response(
            response=pick_rule_message(
                "electricity",
                "I cannot verify a live area blackout unless an outage API is connected. Check your electric utility or local advisory. For ElectriCredit device issues, contact the developer.",
            ),
            reply=[
                "Check system status",
                "/status",
                "/contact",
                "Why did power cut off?",
                "Explain Hub",
            ],
            mode="local",
            intent="electricity_support",
        )

    # Dashboard requests.
    if re.search(r"\b(dashboard|summary|chart|charts|revenue|usage|power|heatmap|overview)\b", lower):
        return ok_response(
            response=(
                "The Dashboard shows ElectriCredit overview data from SQLite: power trend, hub performance, "
                "user/card activity, usage heatmap, revenue, sessions, and system metrics."
            ),
            reply=[
                "Explain Hardware",
                "Show current rate",
                "What is Peopleware?",
                "/status",
            ],
            mode="local",
            intent="dashboard",
        )

    # Hardware / cost requests.
    if re.search(r"\b(hub|hubs|registry|hardware|rc522|coinslot|coin slot|pzem|relay|oled|esp32|components|parts|cost|price|budget)\b", lower):
        return ok_response(
            response=(
                "ElectriCredit hardware uses a Raspberry Pi 4 as the Flask + SQLite server, ESP32 Hub Modules "
                "for electricity sessions/relay/power monitoring, and ESP32 Registry Stations for RFID registration "
                "and coin-slot top-up. Exact cost depends on suppliers and quantity."
            ),
            reply=[
                "What is a Hub?",
                "What is Registry Station?",
                "How does top-up work?",
                "/contact",
            ],
            mode="local",
            intent="hardware",
        )

    # Top-up / transaction requests.
    if re.search(r"\b(topup|top-up|payment|coinslot|coin slot|balance|transaction|online payment|credit mode|debt limit)\b", lower):
        return ok_response(
            response=(
                "Top-up is handled through transactions. Coin-slot top-up uses a Registry Station. Future online "
                "payment will use a payment bridge. If a card reaches its debt/credit limit, the Hub can cut power automatically."
            ),
            reply=[
                "How coin-slot top-up works?",
                "Why online payment disabled?",
                "Show current rate",
                "/status",
            ],
            mode="local",
            intent="transactions",
        )

    # Software requests.
    if re.search(r"\b(software|logs|database|backup|theme|announcement|bonus|rate|rates|connection|wifi|server)\b", lower):
        return ok_response(
            response=(
                "Software contains rates, connection/Wi-Fi settings, logs, announcements, bonus tools, server identity, "
                "database maintenance, and backups. Access depends on role: Administrator, Owner, or Developer."
            ),
            reply=[
                "/rate",
                "/status",
                "/contact",
                "Who can access Software?",
            ],
            mode="local",
            intent="software",
        )

    # Peopleware / accounts.
    if re.search(r"\b(peopleware|user|users|card|cards|rfid|administrator|owner|developer|role|roles|rbac)\b", lower):
        return ok_response(
            response=(
                "Peopleware manages tenant users, RFID cards, administrators, owners, and developers. "
                "Administrators handle users/cards, owners have higher management permissions, and developers handle technical control."
            ),
            reply=[
                "/users",
                "/superusers",
                "/devs",
                "/contact",
            ],
            mode="local",
            intent="peopleware",
        )

    # System identity.
    if re.search(r"\b(who are you|who r u|what are you|what is electricredit|about system|purpose|capstone)\b", lower):
        return ok_response(
            response=(
                "I am the ElectriCredit Assistant. I help explain the prepaid electricity management capstone system: "
                "Dashboard, Hardware, Peopleware, Software, About, cards, top-up, logs, database, and troubleshooting."
            ),
            reply=[
                "Explain Hardware",
                "What's in the dashboard?",
                "How does top-up work?",
                "/contact",
            ],
            mode="local",
            intent="identity",
        )

    # Pure greeting only.
    if re.fullmatch(r"\s*(hello|hi|hey|hellow|hello there|hi there|hey there)\s*[!.?]*\s*", lower):
        return ok_response(
            response=pick_rule_message("greetings", "Hello. I can help with ElectriCredit. Type /help to see commands."),
            reply=[
                "What is ElectriCredit?",
                "Explain Hardware",
                "Is there a blackout?",
                "/help",
                "/contact",
            ],
            mode="local",
            intent="greeting",
        )

    return ok_response(
        response=pick_rule_message(
            "outsideScope",
            "I am focused on ElectriCredit. I can also help with basic electricity topics like outage, kWh, or safety.",
        ),
        reply=[
            "/help",
            "/contact",
            "Is there a blackout?",
            "Explain Hardware",
            "Show system status",
        ],
        mode="offline",
        intent="outside_scope",
    )

# ==========================================================
# COMMANDS
# ==========================================================

def parse_command(message: str) -> dict[str, Any] | None:
    text = message.strip()

    if not text.startswith("/"):
        return None

    parts = text.split()
    name = parts[0].lower()
    args = parts[1:]

    return {
        "name": name,
        "args": args,
        "raw": text,
    }


def handle_command(command: dict[str, Any], original_message: str) -> dict[str, Any]:
    name = command["name"]
    args = command["args"]

    if name in {"/help", "/commands"}:
        return command_help_response()

    if name in {"/clear"}:
        return ok_response(
            response="Chat display cleared on this browser only.",
            reply=[
                "/help",
                "/devs",
                "/status",
                "/rate",
            ],
            mode="command",
            intent="command_clear",
            data={
                "client_action": "clear_messages"
            },
        )

    if name in {"/reset"}:
        return ok_response(
            response="Chat history reset on this browser only.",
            reply=[
                "/help",
                "/devs",
                "/status",
                "/rate",
            ],
            mode="command",
            intent="command_reset",
            data={
                "client_action": "reset_history"
            },
        )

    if name in {"/history"}:
        return ok_response(
            response="Chat history is stored only on this browser. The frontend should display the local saved conversation history.",
            reply=[
                "/clear",
                "/reset",
                "/help",
            ],
            mode="command",
            intent="command_history",
            data={
                "client_action": "show_history"
            },
        )

    if name in {"/theme"}:
        theme_id = args[0] if args else ""
        return command_theme(theme_id)

    if name in {"/devs", "/developers", "/developer", "/contact", "/developer-contact"}:
        return command_superusers("DEVELOPER")

    if name in {"/admins", "/admin", "/administrator", "/administrators"}:
        return command_superusers("ADMINISTRATOR")

    if name in {"/own", "/owner", "/owners"}:
        return command_superusers("OWNER")

    if name in {"/superusers", "/people"}:
        return command_all_superusers()

    if name in {"/users"}:
        return command_users()

    if name in {"/rate", "/rates"}:
        return command_rates()

    if name in {"/status"}:
        return command_status()

    return ok_response(
        response=f"Unknown command: {name}. Use /help to see available commands.",
        reply=[
            "/help",
            "/contact",
            "/devs",
            "/status",
            "/rate",
        ],
        mode="command",
        intent="unknown_command",
    )


def command_help_response() -> dict[str, Any]:
    response = """
Available commands:

/help - show commands
/contact - show developer contact cards
/clear - clear chat display on this browser
/reset - reset local chat history
/history - display local chat history
/theme <id> - apply theme by ID
/theme - apply random theme
/devs - show developers as cards
/admins - show administrators as cards
/owner - show owner as cards
/users - show users as text
/superusers - show all superusers as text
/rate - show current rates
/status - show system/network status

Chat history stays on this browser only.
""".strip()

    return ok_response(
        response=response,
        reply=[
            "/devs",
            "/status",
            "/rate",
            "/theme",
            "/users",
        ],
        mode="command",
        intent="command_help",
    )


def command_theme(theme_id: str = "") -> dict[str, Any]:
    themes = safe_get_themes()

    if not themes:
        return ok_response(
            response="No themes are available right now.",
            reply=[
                "/status",
                "/help",
            ],
            mode="command",
            intent="command_theme",
        )

    selected = None

    if theme_id:
        for theme in themes:
            if str(theme.get("id")) == str(theme_id):
                selected = theme
                break
    else:
        selected = random.choice(themes)

    if not selected:
        return ok_response(
            response=f"Theme ID {theme_id} was not found.",
            reply=[
                "/theme",
                "/help",
            ],
            mode="command",
            intent="command_theme_not_found",
        )

    return ok_response(
        response=f"Theme selected: {selected.get('name', 'Unnamed Theme')}.",
        reply=[
            "/theme",
            "/status",
            "/help",
        ],
        mode="command",
        intent="command_theme",
        data={
            "client_action": "apply_theme",
            "theme": selected,
        },
    )


def command_superusers(role: str) -> dict[str, Any]:
    people = safe_get_superusers(role)

    label = role.title()

    if not people:
        return ok_response(
            response=f"No {label} accounts found.",
            reply=[
                "/superusers",
                "/help",
            ],
            mode="command",
            intent=f"command_{role.lower()}",
            cards=[],
        )

    response = f"Found {len(people)} {label} account(s)."

    cards = [
        build_person_card(person)
        for person in people
    ]

    return ok_response(
        response=response,
        reply=[
            "/admins",
            "/owner",
            "/devs",
            "/superusers",
        ],
        mode="command",
        intent=f"command_{role.lower()}",
        cards=cards,
        data=people,
    )


def command_all_superusers() -> dict[str, Any]:
    people = []

    for role in ["ADMINISTRATOR", "OWNER", "DEVELOPER"]:
        people.extend(safe_get_superusers(role))

    if not people:
        return ok_response(
            response="No superuser accounts found.",
            reply=[
                "/devs",
                "/admins",
                "/owner",
            ],
            mode="command",
            intent="command_superusers",
        )

    lines = []

    for person in people:
        lines.append(
            f"{person.get('role', 'SUPERUSER')}[{person.get('id')}] - {person.get('name')} (@{person.get('username')})"
        )

    return ok_response(
        response="\n".join(lines),
        reply=[
            "/devs",
            "/admins",
            "/owner",
            "/help",
        ],
        mode="command",
        intent="command_superusers",
        data=people,
    )


def command_users() -> dict[str, Any]:
    users = safe_get_users()

    if not users:
        return ok_response(
            response="No users found.",
            reply=[
                "/help",
                "/status",
            ],
            mode="command",
            intent="command_users",
        )

    lines = []

    for user in users:
        cards = user.get("cards") or []
        lines.append(
            f"USER[{user.get('id')}] - {user.get('name')} | Cards: {len(cards)}"
        )

    return ok_response(
        response="\n".join(lines),
        reply=[
            "/rate",
            "/status",
            "/superusers",
        ],
        mode="command",
        intent="command_users",
        data=users,
    )


def command_rates() -> dict[str, Any]:
    settings = safe_get_settings()

    base_rate = settings.get("base_rate", "not set")
    tenant_rate = settings.get("tenant_rate", "not set")

    return ok_response(
        response=f"Current rates:\nBase rate: ₱{base_rate}\nTenant rate: ₱{tenant_rate}",
        reply=[
            "/status",
            "/help",
        ],
        mode="command",
        intent="command_rates",
        data={
            "base_rate": base_rate,
            "tenant_rate": tenant_rate,
        },
    )


def command_status() -> dict[str, Any]:
    status = safe_get_status()
    settings = safe_get_settings()

    network_mode = settings.get("network_mode", "unknown")
    internet_status = settings.get("internet_status", "unknown")
    hotspot = settings.get("hotspot_name", "ElectriCredit")

    counts = status.get("counts", {}) if isinstance(status, dict) else {}

    response = f"""
System status:
Mode: {network_mode}
Internet: {internet_status}
Hotspot: {hotspot}

Counts:
Users: {counts.get("users", "—")}
Cards: {counts.get("cards", "—")}
Hubs: {counts.get("hubs", "—")}
Registry Stations: {counts.get("registry_stations", "—")}
Themes: {counts.get("themes", "—")}
""".strip()

    return ok_response(
        response=response,
        reply=[
            "/rate",
            "/users",
            "/devs",
            "/help",
        ],
        mode="command",
        intent="command_status",
        data=status,
    )


# ==========================================================
# DATABASE ACCESS WRAPPERS
# ==========================================================

def safe_get_superusers(role: str) -> list[dict[str, Any]]:
    if db is None:
        return []

    try:
        if hasattr(db, "get_superusers"):
            return db.get_superusers(role=role)
    except Exception:
        return []

    return []


def safe_get_users() -> list[dict[str, Any]]:
    if db is None:
        return []

    try:
        if hasattr(db, "get_users"):
            return db.get_users()
    except Exception:
        return []

    return []


def safe_get_themes() -> list[dict[str, Any]]:
    if db is None:
        return []

    try:
        if hasattr(db, "get_themes"):
            return db.get_themes()
    except Exception:
        return []

    return []


def safe_get_settings() -> dict[str, str]:
    if db is None:
        return {}

    try:
        if hasattr(db, "get_settings"):
            rows = db.get_settings()
            output: dict[str, str] = {}

            for row in rows:
                key = str(row.get("key", ""))
                value = str(row.get("value", ""))

                if key:
                    output[key] = value

            return output
    except Exception:
        return {}

    return {}


def safe_get_status() -> dict[str, Any]:
    if db is None:
        return {}

    try:
        if hasattr(db, "get_system_status"):
            return db.get_system_status()
    except Exception:
        return {}

    return {}


# ==========================================================
# CARD FORMATTERS
# ==========================================================

def build_person_card(person: dict[str, Any]) -> dict[str, Any]:
    emails = person.get("emails") if isinstance(person.get("emails"), list) else []
    numbers = person.get("numbers") if isinstance(person.get("numbers"), list) else []
    links = person.get("links") if isinstance(person.get("links"), list) else []

    return {
        "type": "person",
        "id": person.get("id"),
        "label": format_label(person.get("role", "SUPERUSER"), person.get("id")),
        "name": person.get("name", "Unnamed"),
        "username": person.get("username", ""),
        "role": person.get("role", "SUPERUSER"),
        "image": person.get("image", ""),
        "emails": emails,
        "numbers": numbers,
        "links": links,
    }
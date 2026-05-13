"""
============================================================
ELECTRICREDIT V2 - ORM-LIKE MODELS
File: database/models.py

Purpose:
- Define one Python class per database table
- Each class acts as the blueprint/model of a table
- database.py can use these models for CRUD operations
- create_database.py can use these models to generate CREATE TABLE SQL

Note:
This is a lightweight ORM-style layer using sqlite3.
It is NOT SQLAlchemy yet.

Database:
database/electricredit.db
============================================================
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, ClassVar
import json


# ==========================================================
# GLOBAL CONSTANTS
# ==========================================================

DATABASE_FILENAME = "electricredit.db"


# ==========================================================
# ROLE / PERMISSION CONSTANTS
# ==========================================================

ROLE_VISITOR = "VISITOR"
ROLE_ADMINISTRATOR = "ADMINISTRATOR"
ROLE_OWNER = "OWNER"
ROLE_DEVELOPER = "DEVELOPER"

ROLE_ORDER = {
    ROLE_VISITOR: 0,
    ROLE_ADMINISTRATOR: 1,
    ROLE_OWNER: 2,
    ROLE_DEVELOPER: 3,
}


# ==========================================================
# STATUS CONSTANTS
# ==========================================================

CARD_STATUS_ACTIVE = "active"
CARD_STATUS_BANNED = "banned"

HARDWARE_STATUS_ENABLED = "enabled"
HARDWARE_STATUS_DISABLED = "disabled"

HARDWARE_CONNECTION_ONLINE = "online"
HARDWARE_CONNECTION_OFFLINE = "offline"

SESSION_STATUS_ACTIVE = "active"
SESSION_STATUS_FINISHED = "finished"
SESSION_STATUS_TERMINATED = "terminated"
SESSION_STATUS_FAILED = "failed"

TRANSACTION_STATUS_PENDING = "pending"
TRANSACTION_STATUS_HOLD = "hold"
TRANSACTION_STATUS_APPLIED = "applied"
TRANSACTION_STATUS_FAILED = "failed"
TRANSACTION_STATUS_CANCELLED = "cancelled"


# ==========================================================
# HELPERS
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


def normalize_uid(uid: str) -> str:
    return "".join(ch for ch in str(uid or "") if ch.isalnum()).upper()


def default_hardware_status(
    available: bool = True,
    status: str = HARDWARE_STATUS_ENABLED,
    connection: str = HARDWARE_CONNECTION_ONLINE,
) -> str:
    return to_json({
        "available": available,
        "status": status,
        "connection": connection,
    })


def role_rank(role: str | None) -> int:
    return ROLE_ORDER.get(str(role or ROLE_VISITOR).upper(), 0)


def can_access_role(current_role: str | None, required_role: str) -> bool:
    return role_rank(current_role) >= role_rank(required_role)


# ==========================================================
# COLUMN DEFINITION
# ==========================================================

@dataclass(frozen=True)
class Column:
    name: str
    sql_type: str
    primary_key: bool = False
    autoincrement: bool = False
    required: bool = False
    unique: bool = False
    default: Any = None
    references: str | None = None
    on_delete: str | None = None
    editable: bool = True

    def sql(self) -> str:
        parts = [self.name, self.sql_type]

        if self.primary_key:
            parts.append("PRIMARY KEY")

        if self.autoincrement:
            parts.append("AUTOINCREMENT")

        if self.required:
            parts.append("NOT NULL")

        if self.unique:
            parts.append("UNIQUE")

        if self.default is not None:
            if isinstance(self.default, str):
                parts.append(f"DEFAULT '{self.default}'")
            elif isinstance(self.default, bool):
                parts.append(f"DEFAULT {1 if self.default else 0}")
            else:
                parts.append(f"DEFAULT {self.default}")

        if self.references:
            parts.append(f"REFERENCES {self.references}")
            if self.on_delete:
                parts.append(f"ON DELETE {self.on_delete}")

        return " ".join(parts)


# ==========================================================
# BASE MODEL
# ==========================================================

@dataclass
class BaseModel:
    """
    Base class for all ORM-like models.

    Every child class must define:
    - table_name
    - columns
    """

    id: int | None = None

    table_name: ClassVar[str] = ""
    display_name: ClassVar[str] = ""
    columns: ClassVar[list[Column]] = []

    @classmethod
    def create_table_sql(cls) -> str:
        column_sql = ",\n    ".join(column.sql() for column in cls.columns)
        return f"""
CREATE TABLE IF NOT EXISTS {cls.table_name} (
    {column_sql}
);
""".strip()

    @classmethod
    def column_names(cls, include_id: bool = True) -> list[str]:
        if include_id:
            return [column.name for column in cls.columns]
        return [column.name for column in cls.columns if column.name != "id"]

    @classmethod
    def editable_columns(cls) -> list[str]:
        return [
            column.name
            for column in cls.columns
            if column.editable and column.name != "id"
        ]

    @classmethod
    def required_columns(cls) -> list[str]:
        return [
            column.name
            for column in cls.columns
            if column.required and column.name != "id"
        ]

    @classmethod
    def defaults(cls) -> dict[str, Any]:
        return {
            column.name: column.default
            for column in cls.columns
            if column.default is not None
        }

    @classmethod
    def validate_required(cls, data: dict[str, Any]) -> str | None:
        for field in cls.required_columns():
            value = data.get(field)
            if value is None or str(value).strip() == "":
                return field
        return None

    @classmethod
    def clean_insert_data(cls, data: dict[str, Any]) -> dict[str, Any]:
        allowed = cls.column_names(include_id=False)
        defaults = cls.defaults()

        cleaned: dict[str, Any] = {}

        for key in allowed:
            if key in data:
                cleaned[key] = data[key]
            elif key in defaults:
                cleaned[key] = defaults[key]

        return cleaned

    @classmethod
    def clean_update_data(cls, data: dict[str, Any]) -> dict[str, Any]:
        allowed = cls.editable_columns()
        return {
            key: value
            for key, value in data.items()
            if key in allowed
        }

    def to_dict(self) -> dict[str, Any]:
        output: dict[str, Any] = {}

        for column in self.columns:
            output[column.name] = getattr(self, column.name, None)

        return output

    @classmethod
    def from_row(cls, row: Any) -> dict[str, Any]:
        if row is None:
            return {}

        if isinstance(row, dict):
            return dict(row)

        return dict(row)


# ==========================================================
# USERS
# ==========================================================

@dataclass
class User(BaseModel):
    id: int | None = None
    name: str = ""
    birthdate: str = ""
    gender: str = ""
    numbers: str = "[]"
    emails: str = "[]"
    image: str = ""
    created: str = ""

    table_name: ClassVar[str] = "users"
    display_name: ClassVar[str] = "Users"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("name", "TEXT", required=True),
        Column("birthdate", "TEXT", default="~"),
        Column("gender", "TEXT", default="Others"),
        Column("numbers", "TEXT", default="[]"),
        Column("emails", "TEXT", default="[]"),
        Column("image", "TEXT", default=""),
        Column("created", "TEXT", required=True, editable=False),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("birthdate", "~")
        data.setdefault("gender", "Others")
        if not str(data.get("birthdate") or "").strip():
            data["birthdate"] = "~"
        if not str(data.get("gender") or "").strip():
            data["gender"] = "Others"
        data.setdefault("numbers", [])
        data.setdefault("emails", [])
        data.setdefault("image", "")
        data.setdefault("created", now_iso())

        if isinstance(data.get("numbers"), list):
            data["numbers"] = to_json(data["numbers"])

        if isinstance(data.get("emails"), list):
            data["emails"] = to_json(data["emails"])

        return cls.clean_insert_data(data)


# ==========================================================
# CARDS
# ==========================================================

@dataclass
class Card(BaseModel):
    id: int | None = None
    uid: str = ""
    user_id: int | None = None
    balance: float = 0
    debt_limit: float = 100
    used_kwh: float = 0
    created: str = ""
    status: str = CARD_STATUS_ACTIVE
    reason: str = ""
    until: str = "~"

    table_name: ClassVar[str] = "cards"
    display_name: ClassVar[str] = "Cards"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("uid", "TEXT", required=True, unique=True),
        Column("user_id", "INTEGER", required=True, references="users(id)", on_delete="CASCADE"),
        Column("balance", "REAL", default=0),
        Column("debt_limit", "REAL", default=100),
        Column("used_kwh", "REAL", default=0),
        Column("created", "TEXT", required=True, editable=False),
        Column("status", "TEXT", default=CARD_STATUS_ACTIVE),
        Column("reason", "TEXT", default=""),
        Column("until", "TEXT", default="~"),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data["uid"] = normalize_uid(data.get("uid", data.get("rfid_uid", data.get("card_uid", ""))))
        data.setdefault("balance", 0)
        data["debt_limit"] = data.get("debt_limit", data.get("credit_limit", data.get("limit", 100)))
        data.setdefault("used_kwh", 0)
        data.setdefault("created", now_iso())
        data.setdefault("status", CARD_STATUS_ACTIVE)
        data.setdefault("reason", "")
        data.setdefault("until", "~")
        return cls.clean_insert_data(data)


# ==========================================================
# SUPERUSERS
# ==========================================================

@dataclass
class SuperUser(BaseModel):
    id: int | None = None
    name: str = ""
    username: str = ""
    password: str = ""
    birthdate: str = ""
    gender: str = ""
    emails: str = "[]"
    numbers: str = "[]"
    links: str = "[]"
    image: str = ""
    role: str = ROLE_ADMINISTRATOR
    created: str = ""

    table_name: ClassVar[str] = "superusers"
    display_name: ClassVar[str] = "Superusers"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("name", "TEXT", required=True),
        Column("username", "TEXT", required=True, unique=True),
        Column("password", "TEXT", required=True),
        Column("birthdate", "TEXT", default="~"),
        Column("gender", "TEXT", default="Others"),
        Column("emails", "TEXT", default="[]"),
        Column("numbers", "TEXT", default="[]"),
        Column("links", "TEXT", default="[]"),
        Column("image", "TEXT", default=""),
        Column("role", "TEXT", required=True),
        Column("created", "TEXT", required=True, editable=False),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("birthdate", "~")
        data.setdefault("gender", "Others")
        if not str(data.get("birthdate") or "").strip():
            data["birthdate"] = "~"
        if not str(data.get("gender") or "").strip():
            data["gender"] = "Others"
        data.setdefault("emails", [])
        data.setdefault("numbers", [])
        data.setdefault("links", [])
        data.setdefault("image", "")
        data.setdefault("role", ROLE_ADMINISTRATOR)
        data.setdefault("created", now_iso())

        if isinstance(data.get("emails"), list):
            data["emails"] = to_json(data["emails"])

        if isinstance(data.get("numbers"), list):
            data["numbers"] = to_json(data["numbers"])

        if isinstance(data.get("links"), list):
            data["links"] = to_json(data["links"])

        data["role"] = str(data["role"]).upper()

        return cls.clean_insert_data(data)


# ==========================================================
# HUBS
# ==========================================================

@dataclass
class Hub(BaseModel):
    id: int | None = None
    mac: str = ""
    revenue: float = 0
    consumed_kwh: float = 0
    location: str = ""
    status: str = ""
    created: str = ""

    table_name: ClassVar[str] = "hubs"
    display_name: ClassVar[str] = "Hubs"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("mac", "TEXT"),
        Column("revenue", "REAL", default=0),
        Column("consumed_kwh", "REAL", default=0),
        Column("location", "TEXT"),
        Column("status", "TEXT", default=default_hardware_status()),
        Column("created", "TEXT", required=True, editable=False),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("revenue", 0)
        data.setdefault("consumed_kwh", 0)
        data.setdefault("created", now_iso())

        if "status" not in data:
            data["status"] = default_hardware_status()
        elif isinstance(data["status"], dict):
            data["status"] = to_json(data["status"])

        return cls.clean_insert_data(data)


# ==========================================================
# REGISTRY STATIONS
# ==========================================================

@dataclass
class RegistryStation(BaseModel):
    id: int | None = None
    mac: str = ""
    created: str = ""
    location: str = ""
    status: str = ""

    table_name: ClassVar[str] = "registry_stations"
    display_name: ClassVar[str] = "Registry Stations"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("mac", "TEXT"),
        Column("created", "TEXT", required=True, editable=False),
        Column("location", "TEXT"),
        Column("status", "TEXT", default=default_hardware_status()),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("created", now_iso())

        if "status" not in data:
            data["status"] = default_hardware_status()
        elif isinstance(data["status"], dict):
            data["status"] = to_json(data["status"])

        return cls.clean_insert_data(data)


# ==========================================================
# SESSIONS
# ==========================================================

@dataclass
class Session(BaseModel):
    id: int | None = None
    hub_id: int | None = None
    card_id: int | None = None
    user_id: int | None = None
    started: str = ""
    ended: str = ""
    consumed_kwh: float = 0
    revenue: float = 0
    status: str = SESSION_STATUS_ACTIVE
    reason: str = ""

    table_name: ClassVar[str] = "sessions"
    display_name: ClassVar[str] = "Sessions"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("hub_id", "INTEGER", references="hubs(id)", on_delete="SET NULL"),
        Column("card_id", "INTEGER", references="cards(id)", on_delete="SET NULL"),
        Column("user_id", "INTEGER", references="users(id)", on_delete="SET NULL"),
        Column("started", "TEXT"),
        Column("ended", "TEXT"),
        Column("consumed_kwh", "REAL", default=0),
        Column("revenue", "REAL", default=0),
        Column("status", "TEXT", default=SESSION_STATUS_ACTIVE),
        Column("reason", "TEXT"),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("started", now_iso())
        data.setdefault("ended", "")
        data.setdefault("consumed_kwh", 0)
        data.setdefault("revenue", 0)
        data.setdefault("status", SESSION_STATUS_ACTIVE)
        data.setdefault("reason", "")
        return cls.clean_insert_data(data)


# ==========================================================
# TRANSACTIONS
# ==========================================================

@dataclass
class Transaction(BaseModel):
    id: int | None = None
    type: str = ""
    method: str = ""
    amount: float = 0
    card_id: int | None = None
    registry_station_id: int | None = None
    gateway_reference: str = ""
    status: str = TRANSACTION_STATUS_PENDING
    created: str = ""
    applied: str = ""

    table_name: ClassVar[str] = "transactions"
    display_name: ClassVar[str] = "Transactions"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("type", "TEXT"),
        Column("method", "TEXT"),
        Column("amount", "REAL"),
        Column("card_id", "INTEGER", references="cards(id)", on_delete="SET NULL"),
        Column("registry_station_id", "INTEGER", references="registry_stations(id)", on_delete="SET NULL"),
        Column("gateway_reference", "TEXT"),
        Column("status", "TEXT", default=TRANSACTION_STATUS_PENDING),
        Column("created", "TEXT", required=True, editable=False),
        Column("applied", "TEXT"),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("gateway_reference", "")
        data.setdefault("status", TRANSACTION_STATUS_PENDING)
        data.setdefault("created", now_iso())
        data.setdefault("applied", "")
        return cls.clean_insert_data(data)


# ==========================================================
# LOGS
# ==========================================================

@dataclass
class Log(BaseModel):
    id: int | None = None
    datetime: str = ""
    action: str = ""
    author: str = "SYSTEM"

    table_name: ClassVar[str] = "logs"
    display_name: ClassVar[str] = "Logs"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("datetime", "TEXT", required=True, editable=False),
        Column("action", "TEXT", required=True),
        Column("author", "TEXT", required=True),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("datetime", now_iso())
        data.setdefault("author", "SYSTEM")
        return cls.clean_insert_data(data)


# ==========================================================
# DEVICES
# ==========================================================

@dataclass
class Device(BaseModel):
    id: int | None = None
    mac: str = ""
    device: str = ""
    visited: str = "[]"

    table_name: ClassVar[str] = "devices"
    display_name: ClassVar[str] = "Devices"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("mac", "TEXT"),
        Column("device", "TEXT"),
        Column("visited", "TEXT", default="[]"),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("device", "")
        data.setdefault("visited", [now_iso()])

        if isinstance(data.get("visited"), list):
            data["visited"] = to_json(data["visited"])

        return cls.clean_insert_data(data)


# ==========================================================
# THEMES
# ==========================================================

@dataclass
class Theme(BaseModel):
    id: int | None = None
    name: str = ""
    background: str = ""
    surface: str = ""
    card: str = ""
    text: str = ""
    muted_text: str = ""
    accent: str = ""
    success: str = ""
    warning: str = ""
    danger: str = ""
    border: str = ""
    shadow: str = ""
    priority: int = 1
    created: str = ""

    table_name: ClassVar[str] = "themes"
    display_name: ClassVar[str] = "Themes"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("name", "TEXT", required=True),
        Column("background", "TEXT"),
        Column("surface", "TEXT"),
        Column("card", "TEXT"),
        Column("text", "TEXT"),
        Column("muted_text", "TEXT"),
        Column("accent", "TEXT"),
        Column("success", "TEXT"),
        Column("warning", "TEXT"),
        Column("danger", "TEXT"),
        Column("border", "TEXT"),
        Column("shadow", "TEXT"),
        Column("priority", "INTEGER", default=1),
        Column("created", "TEXT", required=True, editable=False),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("priority", 1)
        data.setdefault("created", now_iso())
        return cls.clean_insert_data(data)

    @staticmethod
    def to_frontend_theme(row: dict[str, Any]) -> dict[str, Any]:
        text = str(row.get("text") or "#f8fafc")
        background = str(row.get("background") or "#020617")

        return {
            "id": row.get("id"),
            "name": row.get("name"),
            "primary": row.get("accent"),
            "secondary": row.get("success"),
            "warning": row.get("warning"),
            "danger": row.get("danger"),
            "bg1": background,
            "bg2": row.get("surface") or background,
            "txtforbg1": text,
            "txtforbg2": row.get("muted_text"),
            "txtforprimary": "#021018" if text.lower() != "#0f172a" else "#ffffff",
            "txtforsecondary": "#02140a" if text.lower() != "#0f172a" else "#ffffff",
            "success": row.get("success"),
            "surface": row.get("surface"),
            "card": row.get("card"),
            "border": row.get("border"),
            "shadow": row.get("shadow"),
            "priority": row.get("priority"),
        }


# ==========================================================
# SETTINGS
# ==========================================================

@dataclass
class Setting(BaseModel):
    id: int | None = None
    key: str = ""
    value: str = ""

    table_name: ClassVar[str] = "settings"
    display_name: ClassVar[str] = "Settings"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("key", "TEXT", required=True, unique=True),
        Column("value", "TEXT"),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        return cls.clean_insert_data(data)


# ==========================================================
# BACKUPS
# ==========================================================

@dataclass
class Backup(BaseModel):
    id: int | None = None
    filename: str = ""
    created: str = ""
    author: str = "SYSTEM"
    reason: str = ""

    table_name: ClassVar[str] = "backups"
    display_name: ClassVar[str] = "Backups"

    columns: ClassVar[list[Column]] = [
        Column("id", "INTEGER", primary_key=True, autoincrement=True, editable=False),
        Column("filename", "TEXT"),
        Column("created", "TEXT", required=True, editable=False),
        Column("author", "TEXT"),
        Column("reason", "TEXT"),
    ]

    @classmethod
    def prepare_insert(cls, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("created", now_iso())
        data.setdefault("author", "SYSTEM")
        data.setdefault("reason", "")
        return cls.clean_insert_data(data)


# ==========================================================
# MODEL REGISTRY
# ==========================================================

MODEL_REGISTRY: dict[str, type[BaseModel]] = {
    User.table_name: User,
    Card.table_name: Card,
    SuperUser.table_name: SuperUser,
    Hub.table_name: Hub,
    RegistryStation.table_name: RegistryStation,
    Session.table_name: Session,
    Transaction.table_name: Transaction,
    Log.table_name: Log,
    Device.table_name: Device,
    Theme.table_name: Theme,
    Setting.table_name: Setting,
    Backup.table_name: Backup,
}

ALL_TABLES = list(MODEL_REGISTRY.keys())
ALLOWED_DATABASE_EDITOR_TABLES = set(ALL_TABLES)


# ==========================================================
# CREATE DATABASE SCHEMA
# ==========================================================

def create_schema_sql() -> str:
    statements = ["PRAGMA foreign_keys = ON;"]

    for model in MODEL_REGISTRY.values():
        statements.append(model.create_table_sql())

    return "\n\n".join(statements)


SCHEMA_SQL = create_schema_sql()


# ==========================================================
# MODEL HELPERS FOR database.py
# ==========================================================

def get_model(table_name: str) -> type[BaseModel] | None:
    return MODEL_REGISTRY.get(table_name)


def is_allowed_table(table_name: str) -> bool:
    return table_name in ALLOWED_DATABASE_EDITOR_TABLES


def get_editable_columns(table_name: str) -> list[str]:
    model = get_model(table_name)
    return model.editable_columns() if model else []


def get_required_columns(table_name: str) -> list[str]:
    model = get_model(table_name)
    return model.required_columns() if model else []


def get_table_columns(table_name: str) -> list[str]:
    model = get_model(table_name)
    return model.column_names() if model else []


def prepare_insert_data(table_name: str, data: dict[str, Any]) -> dict[str, Any]:
    model = get_model(table_name)

    if not model:
        raise ValueError(f"Unknown table: {table_name}")

    prepare = getattr(model, "prepare_insert", None)

    if callable(prepare):
        return prepare(data)

    return model.clean_insert_data(data)


def prepare_update_data(table_name: str, data: dict[str, Any]) -> dict[str, Any]:
    model = get_model(table_name)

    if not model:
        raise ValueError(f"Unknown table: {table_name}")

    return model.clean_update_data(data)


def validate_required(table_name: str, data: dict[str, Any]) -> str | None:
    model = get_model(table_name)

    if not model:
        raise ValueError(f"Unknown table: {table_name}")

    return model.validate_required(data)


def database_table_metadata() -> list[dict[str, Any]]:
    metadata = []

    for table_name, model in MODEL_REGISTRY.items():
        metadata.append({
            "table": table_name,
            "display_name": model.display_name,
            "columns": [
                {
                    "name": column.name,
                    "sql_type": column.sql_type,
                    "required": column.required,
                    "unique": column.unique,
                    "editable": column.editable,
                    "default": column.default,
                }
                for column in model.columns
            ],
        })

    return metadata

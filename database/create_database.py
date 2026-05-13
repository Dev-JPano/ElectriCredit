"""
============================================================
ELECTRICREDIT V2 - DATABASE CREATOR
File: database/create_database.py

Run:
python database/create_database.py
============================================================
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from werkzeug.security import generate_password_hash

try:
    from . import models
except ImportError:
    import models


DATABASE_DIR = Path(__file__).resolve().parent
DB_PATH = DATABASE_DIR / models.DATABASE_FILENAME
DATABASE_DIR.mkdir(exist_ok=True)


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def seed_time(
    days_ago: int = 0, hour: int = 8, minute: int = 0, duration_minutes: int = 0
) -> str:
    base = (
        datetime.now()
        .astimezone()
        .replace(hour=hour, minute=minute, second=0, microsecond=0)
    )
    return (
        base - timedelta(days=days_ago) + timedelta(minutes=duration_minutes)
    ).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def table_count(db: sqlite3.Connection, table_name: str) -> int:
    row = db.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()
    return int(row["count"])


DEFAULT_SETTINGS = [
    ("system_name", "ElectriCredit"),
    ("system_version", "2.0.0"),
    ("base_rate", "15.00"),
    ("tenant_rate", "20.00"),
    ("log_limit", "1000"),
    ("network_mode", "local_only"),
    ("hotspot_name", "ElectriCredit"),
    ("internet_status", "unknown"),
    ("payment_bridge_url", ""),
    ("payment_bridge_system_id", ""),
    ("payment_bridge_owner_id", ""),
]

# Only one default theme. Add more later from the UI/database tools.
DEFAULT_THEMES = [
    {
        "name": "Electricity Arc",
        "background": "#020617",
        "surface": "rgba(15, 23, 42, 0.88)",
        "card": "rgba(30, 41, 59, 0.82)",
        "text": "#f8fafc",
        "muted_text": "#cbd5e1",
        "accent": "#38bdf8",
        "success": "#22c55e",
        "warning": "#facc15",
        "danger": "#ef4444",
        "border": "rgba(56, 189, 248, 0.30)",
        "shadow": "rgba(0, 0, 0, 0.48)",
        "priority": 1,
    },
    {
        "name": "Midnight Volt",
        "background": "#030712",
        "surface": "rgba(17, 24, 39, 0.90)",
        "card": "rgba(31, 41, 55, 0.84)",
        "text": "#f9fafb",
        "muted_text": "#d1d5db",
        "accent": "#60a5fa",
        "success": "#34d399",
        "warning": "#fbbf24",
        "danger": "#f87171",
        "border": "rgba(96, 165, 250, 0.30)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 2,
    },
    {
        "name": "Neon Circuit",
        "background": "#050816",
        "surface": "rgba(12, 18, 44, 0.90)",
        "card": "rgba(17, 24, 63, 0.84)",
        "text": "#ecfeff",
        "muted_text": "#a5f3fc",
        "accent": "#22d3ee",
        "success": "#4ade80",
        "warning": "#fde047",
        "danger": "#fb7185",
        "border": "rgba(34, 211, 238, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 3,
    },
    {
        "name": "Cyber Lime",
        "background": "#070b03",
        "surface": "rgba(18, 27, 8, 0.90)",
        "card": "rgba(28, 42, 12, 0.84)",
        "text": "#f7fee7",
        "muted_text": "#d9f99d",
        "accent": "#a3e635",
        "success": "#22c55e",
        "warning": "#facc15",
        "danger": "#fb7185",
        "border": "rgba(163, 230, 53, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.48)",
        "priority": 4,
    },
    {
        "name": "Ocean Pulse",
        "background": "#03141f",
        "surface": "rgba(8, 35, 52, 0.90)",
        "card": "rgba(12, 51, 76, 0.84)",
        "text": "#f0f9ff",
        "muted_text": "#bae6fd",
        "accent": "#0ea5e9",
        "success": "#2dd4bf",
        "warning": "#fbbf24",
        "danger": "#fb7185",
        "border": "rgba(14, 165, 233, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 5,
    },
    {
        "name": "Aurora Field",
        "background": "#071a18",
        "surface": "rgba(13, 42, 39, 0.90)",
        "card": "rgba(18, 62, 57, 0.84)",
        "text": "#ecfdf5",
        "muted_text": "#a7f3d0",
        "accent": "#2dd4bf",
        "success": "#22c55e",
        "warning": "#fde047",
        "danger": "#f87171",
        "border": "rgba(45, 212, 191, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.48)",
        "priority": 6,
    },
    {
        "name": "Violet Storm",
        "background": "#11051f",
        "surface": "rgba(34, 13, 63, 0.90)",
        "card": "rgba(51, 20, 89, 0.84)",
        "text": "#faf5ff",
        "muted_text": "#e9d5ff",
        "accent": "#c084fc",
        "success": "#4ade80",
        "warning": "#facc15",
        "danger": "#fb7185",
        "border": "rgba(192, 132, 252, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 7,
    },
    {
        "name": "Royal Current",
        "background": "#12081f",
        "surface": "rgba(30, 18, 51, 0.90)",
        "card": "rgba(49, 32, 82, 0.84)",
        "text": "#fff7ed",
        "muted_text": "#ddd6fe",
        "accent": "#fbbf24",
        "success": "#a78bfa",
        "warning": "#f59e0b",
        "danger": "#f87171",
        "border": "rgba(251, 191, 36, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 8,
    },
    {
        "name": "Solar Surge",
        "background": "#1c1200",
        "surface": "rgba(55, 32, 6, 0.90)",
        "card": "rgba(74, 44, 10, 0.84)",
        "text": "#fff7ed",
        "muted_text": "#fed7aa",
        "accent": "#fb923c",
        "success": "#a3e635",
        "warning": "#facc15",
        "danger": "#f87171",
        "border": "rgba(251, 146, 60, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 9,
    },
    {
        "name": "Copper Wire",
        "background": "#1a0d05",
        "surface": "rgba(48, 24, 10, 0.90)",
        "card": "rgba(70, 34, 14, 0.84)",
        "text": "#fffbeb",
        "muted_text": "#fed7aa",
        "accent": "#f97316",
        "success": "#84cc16",
        "warning": "#fbbf24",
        "danger": "#ef4444",
        "border": "rgba(249, 115, 22, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 10,
    },
    {
        "name": "Cherry Core",
        "background": "#1f0710",
        "surface": "rgba(55, 13, 27, 0.90)",
        "card": "rgba(76, 18, 38, 0.84)",
        "text": "#fff1f2",
        "muted_text": "#fecdd3",
        "accent": "#fb7185",
        "success": "#34d399",
        "warning": "#fbbf24",
        "danger": "#ef4444",
        "border": "rgba(251, 113, 133, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 11,
    },
    {
        "name": "Crimson Relay",
        "background": "#1b0505",
        "surface": "rgba(58, 12, 12, 0.90)",
        "card": "rgba(86, 18, 18, 0.84)",
        "text": "#fef2f2",
        "muted_text": "#fecaca",
        "accent": "#f87171",
        "success": "#4ade80",
        "warning": "#facc15",
        "danger": "#ef4444",
        "border": "rgba(248, 113, 113, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.54)",
        "priority": 12,
    },
    {
        "name": "Graphite Blue",
        "background": "#0b1020",
        "surface": "rgba(20, 28, 52, 0.90)",
        "card": "rgba(30, 41, 71, 0.84)",
        "text": "#f8fafc",
        "muted_text": "#cbd5e1",
        "accent": "#3b82f6",
        "success": "#10b981",
        "warning": "#f59e0b",
        "danger": "#ef4444",
        "border": "rgba(59, 130, 246, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 13,
    },
    {
        "name": "Blue Steel",
        "background": "#08111f",
        "surface": "rgba(15, 31, 54, 0.90)",
        "card": "rgba(28, 48, 75, 0.84)",
        "text": "#f8fafc",
        "muted_text": "#bfdbfe",
        "accent": "#60a5fa",
        "success": "#2dd4bf",
        "warning": "#fbbf24",
        "danger": "#fb7185",
        "border": "rgba(96, 165, 250, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 14,
    },
    {
        "name": "Ice Terminal",
        "background": "#06131c",
        "surface": "rgba(12, 32, 46, 0.90)",
        "card": "rgba(18, 47, 68, 0.84)",
        "text": "#f0f9ff",
        "muted_text": "#bae6fd",
        "accent": "#7dd3fc",
        "success": "#5eead4",
        "warning": "#fde68a",
        "danger": "#fda4af",
        "border": "rgba(125, 211, 252, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.48)",
        "priority": 15,
    },
    {
        "name": "Lava Circuit",
        "background": "#170707",
        "surface": "rgba(48, 18, 11, 0.90)",
        "card": "rgba(73, 27, 16, 0.84)",
        "text": "#fff7ed",
        "muted_text": "#fdba74",
        "accent": "#ff5a1f",
        "success": "#a3e635",
        "warning": "#facc15",
        "danger": "#ef4444",
        "border": "rgba(255, 90, 31, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.54)",
        "priority": 16,
    },
    {
        "name": "Mint Voltage",
        "background": "#031713",
        "surface": "rgba(7, 43, 34, 0.90)",
        "card": "rgba(10, 63, 50, 0.84)",
        "text": "#ecfdf5",
        "muted_text": "#bbf7d0",
        "accent": "#6ee7b7",
        "success": "#10b981",
        "warning": "#facc15",
        "danger": "#fb7185",
        "border": "rgba(110, 231, 183, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.48)",
        "priority": 17,
    },
    {
        "name": "Amber Grid",
        "background": "#171002",
        "surface": "rgba(42, 29, 7, 0.90)",
        "card": "rgba(63, 43, 10, 0.84)",
        "text": "#fffbeb",
        "muted_text": "#fde68a",
        "accent": "#f59e0b",
        "success": "#84cc16",
        "warning": "#facc15",
        "danger": "#ef4444",
        "border": "rgba(245, 158, 11, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 18,
    },
    {
        "name": "Pink Neon",
        "background": "#1b0618",
        "surface": "rgba(52, 14, 47, 0.90)",
        "card": "rgba(76, 20, 68, 0.84)",
        "text": "#fdf2f8",
        "muted_text": "#fbcfe8",
        "accent": "#f472b6",
        "success": "#34d399",
        "warning": "#facc15",
        "danger": "#fb7185",
        "border": "rgba(244, 114, 182, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 19,
    },
    {
        "name": "Deep Ember",
        "background": "#180a04",
        "surface": "rgba(50, 20, 9, 0.90)",
        "card": "rgba(75, 30, 12, 0.84)",
        "text": "#fff7ed",
        "muted_text": "#fed7aa",
        "accent": "#ea580c",
        "success": "#65a30d",
        "warning": "#facc15",
        "danger": "#dc2626",
        "border": "rgba(234, 88, 12, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 20,
    },
    {
        "name": "Emerald Server",
        "background": "#02120b",
        "surface": "rgba(7, 38, 24, 0.90)",
        "card": "rgba(11, 58, 36, 0.84)",
        "text": "#ecfdf5",
        "muted_text": "#bbf7d0",
        "accent": "#22c55e",
        "success": "#4ade80",
        "warning": "#facc15",
        "danger": "#f87171",
        "border": "rgba(34, 197, 94, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.48)",
        "priority": 21,
    },
    {
        "name": "Indigo Control",
        "background": "#090b2a",
        "surface": "rgba(20, 23, 69, 0.90)",
        "card": "rgba(31, 35, 97, 0.84)",
        "text": "#eef2ff",
        "muted_text": "#c7d2fe",
        "accent": "#818cf8",
        "success": "#34d399",
        "warning": "#facc15",
        "danger": "#fb7185",
        "border": "rgba(129, 140, 248, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 22,
    },
    {
        "name": "Magenta Grid",
        "background": "#17051b",
        "surface": "rgba(47, 13, 57, 0.90)",
        "card": "rgba(70, 20, 84, 0.84)",
        "text": "#fdf4ff",
        "muted_text": "#f5d0fe",
        "accent": "#d946ef",
        "success": "#22c55e",
        "warning": "#fbbf24",
        "danger": "#fb7185",
        "border": "rgba(217, 70, 239, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 23,
    },
    {
        "name": "Dark Slate",
        "background": "#0f172a",
        "surface": "rgba(30, 41, 59, 0.90)",
        "card": "rgba(51, 65, 85, 0.84)",
        "text": "#f8fafc",
        "muted_text": "#cbd5e1",
        "accent": "#94a3b8",
        "success": "#22c55e",
        "warning": "#eab308",
        "danger": "#ef4444",
        "border": "rgba(148, 163, 184, 0.30)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 24,
    },
    {
        "name": "Carbon Yellow",
        "background": "#11100b",
        "surface": "rgba(35, 32, 20, 0.90)",
        "card": "rgba(54, 49, 29, 0.84)",
        "text": "#fefce8",
        "muted_text": "#fef08a",
        "accent": "#facc15",
        "success": "#84cc16",
        "warning": "#f59e0b",
        "danger": "#ef4444",
        "border": "rgba(250, 204, 21, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 25,
    },
    {
        "name": "Paper Mint",
        "background": "#f0fdf4",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(236, 253, 245, 0.94)",
        "text": "#052e16",
        "muted_text": "#166534",
        "accent": "#047857",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(5, 150, 105, 0.24)",
        "shadow": "rgba(6, 78, 59, 0.16)",
        "priority": 26,
    },
    {
        "name": "White Blue",
        "background": "#eff6ff",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(239, 246, 255, 0.94)",
        "text": "#0f172a",
        "muted_text": "#334155",
        "accent": "#1d4ed8",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(37, 99, 235, 0.22)",
        "shadow": "rgba(30, 64, 175, 0.16)",
        "priority": 27,
    },
    {
        "name": "Newspaper",
        "background": "#f7f3e8",
        "surface": "rgba(255, 252, 242, 0.96)",
        "card": "rgba(255, 251, 235, 0.94)",
        "text": "#1c1917",
        "muted_text": "#57534e",
        "accent": "#1d4ed8",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(68, 64, 60, 0.24)",
        "shadow": "rgba(41, 37, 36, 0.18)",
        "priority": 28,
    },
    {
        "name": "Cream Coffee",
        "background": "#fff7ed",
        "surface": "rgba(255, 251, 235, 0.96)",
        "card": "rgba(254, 243, 199, 0.94)",
        "text": "#431407",
        "muted_text": "#7c2d12",
        "accent": "#c2410c",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(124, 45, 18, 0.22)",
        "shadow": "rgba(67, 20, 7, 0.16)",
        "priority": 29,
    },
    {
        "name": "Cloud Gray",
        "background": "#f1f5f9",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(248, 250, 252, 0.94)",
        "text": "#0f172a",
        "muted_text": "#475569",
        "accent": "#334155",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(15, 23, 42, 0.18)",
        "shadow": "rgba(15, 23, 42, 0.14)",
        "priority": 30,
    },
    {
        "name": "Clean Lavender",
        "background": "#f5f3ff",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(237, 233, 254, 0.94)",
        "text": "#1e1b4b",
        "muted_text": "#4c1d95",
        "accent": "#6d28d9",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(109, 40, 217, 0.22)",
        "shadow": "rgba(46, 16, 101, 0.16)",
        "priority": 31,
    },
    {
        "name": "Soft Rose",
        "background": "#fff1f2",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(255, 228, 230, 0.94)",
        "text": "#4c0519",
        "muted_text": "#881337",
        "accent": "#be123c",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(190, 18, 60, 0.22)",
        "shadow": "rgba(76, 5, 25, 0.16)",
        "priority": 32,
    },
    {
        "name": "Sunlit Paper",
        "background": "#fefce8",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(254, 249, 195, 0.94)",
        "text": "#422006",
        "muted_text": "#713f12",
        "accent": "#ca8a04",
        "success": "#15803d",
        "warning": "#92400e",
        "danger": "#b91c1c",
        "border": "rgba(202, 138, 4, 0.24)",
        "shadow": "rgba(66, 32, 6, 0.16)",
        "priority": 33,
    },
    {
        "name": "Sky Office",
        "background": "#f0f9ff",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(224, 242, 254, 0.94)",
        "text": "#082f49",
        "muted_text": "#075985",
        "accent": "#0369a1",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(3, 105, 161, 0.24)",
        "shadow": "rgba(8, 47, 73, 0.16)",
        "priority": 34,
    },
    {
        "name": "Green Desk",
        "background": "#f7fee7",
        "surface": "rgba(255, 255, 255, 0.96)",
        "card": "rgba(236, 252, 203, 0.94)",
        "text": "#1a2e05",
        "muted_text": "#3f6212",
        "accent": "#4d7c0f",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(77, 124, 15, 0.24)",
        "shadow": "rgba(26, 46, 5, 0.16)",
        "priority": 35,
    },
    {
        "name": "Neutral Admin",
        "background": "#fafafa",
        "surface": "rgba(255, 255, 255, 0.98)",
        "card": "rgba(245, 245, 245, 0.96)",
        "text": "#171717",
        "muted_text": "#525252",
        "accent": "#2563eb",
        "success": "#15803d",
        "warning": "#a16207",
        "danger": "#b91c1c",
        "border": "rgba(23, 23, 23, 0.16)",
        "shadow": "rgba(23, 23, 23, 0.12)",
        "priority": 36,
    },
    {
        "name": "Desert Console",
        "background": "#2a1705",
        "surface": "rgba(66, 37, 12, 0.90)",
        "card": "rgba(92, 51, 17, 0.84)",
        "text": "#fff7ed",
        "muted_text": "#fed7aa",
        "accent": "#f59e0b",
        "success": "#84cc16",
        "warning": "#facc15",
        "danger": "#f87171",
        "border": "rgba(245, 158, 11, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 37,
    },
    {
        "name": "Night Forest",
        "background": "#05130a",
        "surface": "rgba(13, 39, 21, 0.90)",
        "card": "rgba(22, 62, 33, 0.84)",
        "text": "#f0fdf4",
        "muted_text": "#bbf7d0",
        "accent": "#4ade80",
        "success": "#22c55e",
        "warning": "#facc15",
        "danger": "#f87171",
        "border": "rgba(74, 222, 128, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.50)",
        "priority": 38,
    },
    {
        "name": "Deep Navy",
        "background": "#020b1f",
        "surface": "rgba(8, 23, 56, 0.90)",
        "card": "rgba(15, 35, 79, 0.84)",
        "text": "#eff6ff",
        "muted_text": "#bfdbfe",
        "accent": "#2563eb",
        "success": "#22c55e",
        "warning": "#facc15",
        "danger": "#f87171",
        "border": "rgba(37, 99, 235, 0.32)",
        "shadow": "rgba(0, 0, 0, 0.52)",
        "priority": 39,
    },
    {
        "name": "Black Gold",
        "background": "#090806",
        "surface": "rgba(28, 24, 16, 0.92)",
        "card": "rgba(45, 38, 24, 0.86)",
        "text": "#fffbeb",
        "muted_text": "#fde68a",
        "accent": "#fbbf24",
        "success": "#84cc16",
        "warning": "#facc15",
        "danger": "#f87171",
        "border": "rgba(251, 191, 36, 0.34)",
        "shadow": "rgba(0, 0, 0, 0.56)",
        "priority": 40,
    },
]

# Keep the five developers 1:1. Owners/admins below are sample test accounts.
SUPERUSERS = [
    {
        "name": "Jhon Anthony Pano",
        "username": "toneiu",
        "password": "japDev",
        "birthdate": "2002-03-08",
        "gender": "Male",
        "emails": ["jpano487023@gmail.com", "jacpano@gmail.com"],
        "numbers": ["(+63) 0993 885 9567", "(+63) 0951 460 5103"],
        "links": [
            {"label": "Portfolio", "url": "https://www.jpano.dev"},
            {"label": "GitHub", "url": "https://github.com/Dev-JPano"},
            {"label": "Facebook", "url": "https://www.facebook.com/toneiu"},
            {
                "label": "LinkedIn",
                "url": "https://www.linkedin.com/in/jhon-anthony-pano-830242335/",
            },
            {"label": "X", "url": "https://x.com/toneiuHUB"},
        ],
        "image": "",
        "role": "DEVELOPER",
    },
    {
        "name": "Joshane Rhea Paquibot",
        "username": "joshane",
        "password": "jrpDev",
        "birthdate": "2005-06-25",
        "gender": "Female",
        "emails": ["joshanerhea6252005@gmail.com"],
        "numbers": ["(+63) 0955 407 9645"],
        "links": [{"label": "Facebook", "url": "https://www.facebook.com/sheynnii0"}],
        "image": "",
        "role": "DEVELOPER",
    },
    {
        "name": "Jellen Años",
        "username": "jellen",
        "password": "jaDev",
        "birthdate": "2003-02-26",
        "gender": "Female",
        "emails": ["jellenanos57@gmail.com"],
        "numbers": ["(+63) 09707597588"],
        "links": [
            {
                "label": "Facebook",
                "url": "https://www.facebook.com/jellen.anos.bsit.il.windows",
            }
        ],
        "image": "",
        "role": "DEVELOPER",
    },
    {
        "name": "Joselito Jr. Tambacan",
        "username": "tambacan",
        "password": "jtDev",
        "birthdate": "2003-06-14",
        "gender": "Male",
        "emails": ["tambacaneloy@gmail.com"],
        "numbers": ["(+63) 0931 919 6951"],
        "links": [{"label": "Facebook", "url": "https://www.facebook.com/tambacan3"}],
        "image": "",
        "role": "DEVELOPER",
    },
    {
        "name": "Jaycob Lumayag",
        "username": "jaycob",
        "password": "jlDev",
        "birthdate": "2001-08-26",
        "gender": "Male",
        "emails": ["Jaycoblumayag26@gmail.com"],
        "numbers": ["(+63) 0992 596 7114"],
        "links": [
            {"label": "GitHub", "url": "https://github.com/Jaycoblumayag"},
            {"label": "Facebook", "url": "https://www.facebook.com/boss.jayke"},
        ],
        "image": "",
        "role": "DEVELOPER",
    },
    {
        "name": "System Owner",
        "username": "owner",
        "password": "owner123",
        "birthdate": "1990-01-10",
        "gender": "Others",
        "emails": ["owner@electricredit.local"],
        "numbers": ["09170000001"],
        "links": [{"label": "Office", "url": "https://electricredit.local/owner"}],
        "image": "",
        "role": "OWNER",
    },
    {
        "name": "Billing Owner",
        "username": "billingowner",
        "password": "owner456",
        "birthdate": "1989-04-18",
        "gender": "Female",
        "emails": ["billing.owner@electricredit.local"],
        "numbers": ["09170000002"],
        "links": [
            {"label": "Billing Panel", "url": "https://electricredit.local/billing"}
        ],
        "image": "",
        "role": "OWNER",
    },
    {
        "name": "Operations Owner",
        "username": "opsowner",
        "password": "owner789",
        "birthdate": "1987-09-02",
        "gender": "Male",
        "emails": ["ops.owner@electricredit.local"],
        "numbers": ["09170000003"],
        "links": [],
        "image": "",
        "role": "OWNER",
    },
    {
        "name": "System Administrator",
        "username": "admin",
        "password": "admin123",
        "birthdate": "1996-02-20",
        "gender": "Others",
        "emails": ["admin@electricredit.local"],
        "numbers": ["09180000001"],
        "links": [
            {"label": "Admin Console", "url": "https://electricredit.local/admin"}
        ],
        "image": "",
        "role": "ADMINISTRATOR",
    },
    {
        "name": "Front Desk Admin",
        "username": "frontdesk",
        "password": "front123",
        "birthdate": "1998-06-12",
        "gender": "Female",
        "emails": ["frontdesk@electricredit.local"],
        "numbers": ["09180000002"],
        "links": [],
        "image": "",
        "role": "ADMINISTRATOR",
    },
    {
        "name": "Cashier Admin",
        "username": "cashier",
        "password": "cashier123",
        "birthdate": "1997-11-05",
        "gender": "Female",
        "emails": ["cashier@electricredit.local"],
        "numbers": ["09180000003"],
        "links": [],
        "image": "",
        "role": "ADMINISTRATOR",
    },
    {
        "name": "Maintenance Admin",
        "username": "maintenance",
        "password": "maint123",
        "birthdate": "1994-07-28",
        "gender": "Male",
        "emails": ["maintenance@electricredit.local"],
        "numbers": ["09180000004"],
        "links": [],
        "image": "",
        "role": "ADMINISTRATOR",
    },
]


def create_tables(db: sqlite3.Connection) -> None:
    db.executescript(models.SCHEMA_SQL)
    db.commit()


def seed_settings(db: sqlite3.Connection) -> None:
    if table_count(db, "settings") > 0:
        return
    db.executemany("INSERT INTO settings (key, value) VALUES (?, ?)", DEFAULT_SETTINGS)


def seed_themes(db: sqlite3.Connection) -> None:
    if table_count(db, "themes") > 0:
        return
    for theme in DEFAULT_THEMES:
        db.execute(
            """
            INSERT INTO themes (
                name, background, surface, card, text, muted_text,
                accent, success, warning, danger, border, shadow,
                priority, created
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                theme["name"],
                theme["background"],
                theme["surface"],
                theme["card"],
                theme["text"],
                theme["muted_text"],
                theme["accent"],
                theme["success"],
                theme["warning"],
                theme["danger"],
                theme["border"],
                theme["shadow"],
                theme["priority"],
                now_iso(),
            ),
        )


def seed_superusers(db: sqlite3.Connection) -> None:
    if table_count(db, "superusers") > 0:
        return
    for person in SUPERUSERS:
        db.execute(
            """
            INSERT INTO superusers (
                name, username, password, birthdate, gender,
                emails, numbers, links, image, role, created
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person["name"],
                person["username"],
                generate_password_hash(person["password"]),
                person["birthdate"],
                person["gender"],
                to_json(person["emails"]),
                to_json(person["numbers"]),
                to_json(person["links"]),
                person["image"],
                person["role"],
                now_iso(),
            ),
        )


def seed_hardware(db: sqlite3.Connection) -> None:
    if table_count(db, "hubs") == 0:
        hubs = [
            (
                "AA:BB:CC:00:00:01",
                1965.00,
                98.25,
                "Room 101 - North Wing",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:00:02",
                1250.50,
                62.52,
                "Room 102 - South Wing",
                {"available": False, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:00:03",
                1722.75,
                86.14,
                "Room 201 - Laboratory",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:00:04",
                680.00,
                34.00,
                "Room 202 - Computer Lab",
                {"available": False, "status": "disabled", "connection": "offline"},
            ),
            (
                "AA:BB:CC:00:00:05",
                980.00,
                49.00,
                "Room 301 - Extension",
                {"available": True, "status": "enabled", "connection": "offline"},
            ),
            (
                "AA:BB:CC:00:00:06",
                2110.00,
                105.50,
                "Room 302 - Main Hall",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:00:07",
                540.00,
                27.00,
                "Library Charging Area",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:00:08",
                320.00,
                16.00,
                "Dormitory Hall A",
                {"available": False, "status": "enabled", "connection": "offline"},
            ),
            (
                "AA:BB:CC:00:00:09",
                1440.00,
                72.00,
                "Dormitory Hall B",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:00:10",
                260.00,
                13.00,
                "Maintenance Testing Bench",
                {"available": False, "status": "disabled", "connection": "offline"},
            ),
        ]
        for mac, revenue, consumed_kwh, location, status in hubs:
            db.execute(
                "INSERT INTO hubs (mac, revenue, consumed_kwh, location, status, created) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    mac,
                    revenue,
                    consumed_kwh,
                    location,
                    to_json(status),
                    seed_time(14, 8, 0),
                ),
            )

    if table_count(db, "registry_stations") == 0:
        registry_stations = [
            (
                "AA:BB:CC:00:10:01",
                "192.168.4.21",
                "Front Desk",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:10:02",
                "192.168.4.22",
                "Cashier Area",
                {"available": False, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:10:03",
                "192.168.4.23",
                "Admin Office",
                {"available": True, "status": "enabled", "connection": "offline"},
            ),
            (
                "AA:BB:CC:00:10:04",
                "192.168.4.24",
                "Maintenance Desk",
                {"available": False, "status": "disabled", "connection": "offline"},
            ),
            (
                "AA:BB:CC:00:10:05",
                "192.168.4.25",
                "Library Kiosk",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
            (
                "AA:BB:CC:00:10:06",
                "192.168.4.26",
                "Dormitory Lobby",
                {"available": True, "status": "enabled", "connection": "online"},
            ),
        ]
        for mac, ip, location, status in registry_stations:
            db.execute(
                "INSERT INTO registry_stations (mac, ip, created, location, status) VALUES (?, ?, ?, ?, ?)",
                (mac, ip, seed_time(13, 9, 0), location, to_json(status)),
            )


def seed_users_cards_sessions_transactions(db: sqlite3.Connection) -> None:
    if table_count(db, "users") > 0:
        return

    users = [
        {
            "name": "Sample User",
            "birthdate": "2001-01-01",
            "gender": "Others",
            "numbers": ["09123456789"],
            "emails": ["sample@electricredit.local"],
            "cards": [("04A1B2C3F0", 135.00, 4.20, 100, "active")],
        },
        {
            "name": "Maria Santos",
            "birthdate": "2002-05-12",
            "gender": "Female",
            "numbers": ["09998887777"],
            "emails": ["maria@electricredit.local"],
            "cards": [
                ("04D4E5F6A1", 210.00, 7.40, 100, "active"),
                ("04D4E5F6A2", 65.00, 2.10, 100, "active"),
            ],
        },
        {
            "name": "Juan Dela Cruz",
            "birthdate": "1999-11-20",
            "gender": "Male",
            "numbers": ["09171234567"],
            "emails": ["juan@electricredit.local"],
            "cards": [("0477AABB01", 82.50, 3.35, 100, "active")],
        },
        {
            "name": "Ana Reyes",
            "birthdate": "2003-03-18",
            "gender": "Female",
            "numbers": ["09081230001"],
            "emails": ["ana@electricredit.local"],
            "cards": [
                ("0477AABB02", 154.00, 5.65, 100, "active"),
                ("0477AABB03", -25.00, 1.05, 100, "banned"),
            ],
        },
        {
            "name": "Rafael Lim",
            "birthdate": "2000-09-09",
            "gender": "Male",
            "numbers": ["09261234599"],
            "emails": ["rafael@electricredit.local"],
            "cards": [("0477AABB04", 420.00, 8.90, 150, "active")],
        },
        {
            "name": "Kyla Mendoza",
            "birthdate": "2004-07-07",
            "gender": "Female",
            "numbers": ["09351234588"],
            "emails": ["kyla@electricredit.local"],
            "cards": [("0477AABB05", 95.75, 4.80, 100, "active")],
        },
        {
            "name": "Mark Villanueva",
            "birthdate": "1998-12-04",
            "gender": "Male",
            "numbers": ["09451234577"],
            "emails": ["mark@electricredit.local"],
            "cards": [
                ("0477AABB06", 58.25, 2.75, 100, "active"),
                ("0477AABB07", 18.00, 0.60, 100, "active"),
            ],
        },
        {
            "name": "Liza Fernandez",
            "birthdate": "2001-10-15",
            "gender": "Female",
            "numbers": ["09561234566"],
            "emails": ["liza@electricredit.local"],
            "cards": [("0477AABB08", 300.00, 6.20, 200, "active")],
        },
        {
            "name": "Noel Bautista",
            "birthdate": "1997-02-22",
            "gender": "Male",
            "numbers": ["09671234555"],
            "emails": ["noel@electricredit.local"],
            "cards": [("0477AABB09", 44.50, 1.95, 75, "active")],
        },
        {
            "name": "Celine Garcia",
            "birthdate": "2005-04-25",
            "gender": "Female",
            "numbers": ["09781234544"],
            "emails": ["celine@electricredit.local"],
            "cards": [("0477AABB10", 125.00, 3.80, 100, "active")],
        },
        {
            "name": "Benedict Ramos",
            "birthdate": "1996-08-14",
            "gender": "Male",
            "numbers": ["09190000011"],
            "emails": ["benedict@electricredit.local"],
            "cards": [("0477AABB11", -80.00, 9.20, 100, "active")],
        },
        {
            "name": "Ella Cruz",
            "birthdate": "2004-01-30",
            "gender": "Female",
            "numbers": ["09190000012"],
            "emails": ["ella@electricredit.local"],
            "cards": [
                ("0477AABB12", 15.70, 1.30, 100, "active"),
                ("0477AABB13", 100.00, 2.40, 100, "active"),
            ],
        },
        {
            "name": "Paolo Mercado",
            "birthdate": "1995-05-03",
            "gender": "Male",
            "numbers": ["09190000013"],
            "emails": ["paolo@electricredit.local"],
            "cards": [("0477AABB14", -100.00, 5.50, 100, "active")],
        },
        {
            "name": "Grace Aquino",
            "birthdate": "2000-12-11",
            "gender": "Female",
            "numbers": ["09190000014"],
            "emails": ["grace@electricredit.local"],
            "cards": [
                ("0477AABB15", 260.00, 7.75, 150, "active"),
                ("0477AABB16", -12.00, 0.85, 75, "active"),
            ],
        },
        {
            "name": "Harvey Flores",
            "birthdate": "1999-03-27",
            "gender": "Male",
            "numbers": ["09190000015"],
            "emails": ["harvey@electricredit.local"],
            "cards": [("0477AABB17", 5.00, 0.25, 50, "active")],
        },
        {
            "name": "Ivy Torres",
            "birthdate": "2003-09-17",
            "gender": "Female",
            "numbers": ["09190000016"],
            "emails": ["ivy@electricredit.local"],
            "cards": [("0477AABB18", 188.00, 4.40, 125, "active")],
        },
        {
            "name": "Nathan Cruz",
            "birthdate": "1998-06-06",
            "gender": "Male",
            "numbers": ["09190000017"],
            "emails": ["nathan@electricredit.local"],
            "cards": [("0477AABB19", 72.00, 2.22, 100, "active")],
        },
        {
            "name": "Sophia Reyes",
            "birthdate": "2002-02-02",
            "gender": "Female",
            "numbers": ["09190000018"],
            "emails": ["sophia@electricredit.local"],
            "cards": [
                ("0477AABB20", 142.00, 3.95, 100, "active"),
                ("0477AABB21", 54.00, 1.65, 100, "active"),
            ],
        },
    ]

    card_ids: list[int] = []
    user_ids: list[int] = []
    user_to_cards: dict[int, list[int]] = {}

    for user in users:
        cursor = db.execute(
            "INSERT INTO users (name, birthdate, gender, numbers, emails, image, created) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                user["name"],
                user["birthdate"],
                user["gender"],
                to_json(user["numbers"]),
                to_json(user["emails"]),
                "",
                seed_time(10, 8, 30),
            ),
        )
        user_id = int(cursor.lastrowid)
        user_ids.append(user_id)
        user_to_cards[user_id] = []

        for uid, balance, used_kwh, debt_limit, status in user["cards"]:
            cursor = db.execute(
                """
                INSERT INTO cards (uid, user_id, balance, debt_limit, used_kwh, created, status, reason, until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    models.normalize_uid(uid),
                    user_id,
                    balance,
                    debt_limit,
                    used_kwh,
                    seed_time(9, 9, 0),
                    status,
                    "Temporary hold for testing" if status == "banned" else "",
                    "~",
                ),
            )
            card_id = int(cursor.lastrowid)
            card_ids.append(card_id)
            user_to_cards[user_id].append(card_id)

    session_blueprint = []
    for day in range(9, -1, -1):
        for n, hour in enumerate([5, 7, 9, 11, 14, 16, 19, 22]):
            hub_id = ((day + n) % 10) + 1
            user_index = (day * 3 + n) % len(user_ids)
            kwh = round(0.35 + ((day + n) % 9) * 0.28, 2)
            status = (
                "active"
                if day == 0 and n in {0, 6}
                else ("terminated" if (day + n) % 11 == 0 else "finished")
            )
            duration = 30 + ((day + n) % 5) * 15
            session_blueprint.append(
                (day, hour, (n * 7) % 60, duration, hub_id, user_index, kwh, status)
            )

    for (
        days_ago,
        hour,
        minute,
        duration,
        hub_id,
        user_index,
        kwh,
        status,
    ) in session_blueprint:
        user_id = user_ids[user_index]
        card_id = user_to_cards[user_id][0]
        started = seed_time(days_ago, hour, minute)
        ended = (
            "" if status == "active" else seed_time(days_ago, hour, minute, duration)
        )
        revenue = round(kwh * 20, 2)
        db.execute(
            """
            INSERT INTO sessions (hub_id, card_id, user_id, started, ended, consumed_kwh, revenue, status, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                hub_id,
                card_id,
                user_id,
                started,
                ended,
                kwh,
                revenue,
                status,
                "Sample dashboard seed",
            ),
        )

    transaction_blueprint = []
    for i in range(32):
        transaction_blueprint.append(
            (
                i % 7,
                6 + (i * 3) % 17,
                (i * 11) % 60,
                "topup",
                "coinslot" if i % 2 else "cashier",
                float(40 + (i % 8) * 25),
                i % len(card_ids),
                (i % 6) + 1,
                f"SEED-TXN-{i+1:04d}",
                "applied" if i % 7 else "hold",
            )
        )

    for (
        days_ago,
        hour,
        minute,
        transaction_type,
        method,
        amount,
        card_index,
        registry_station_id,
        reference,
        status,
    ) in transaction_blueprint:
        created = seed_time(days_ago, hour, minute)
        applied = created if status == "applied" else ""
        db.execute(
            """
            INSERT INTO transactions (type, method, amount, card_id, registry_station_id, gateway_reference, status, created, applied)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                transaction_type,
                method,
                amount,
                card_ids[card_index],
                registry_station_id,
                reference,
                status,
                created,
                applied,
            ),
        )


def seed_devices(db: sqlite3.Connection) -> None:
    if table_count(db, "devices") > 0:
        return
    devices = [
        ("RANDOMIZED-MAC-DEMO", "Demo Phone", to_json([now_iso()])),
        (
            "AA:BB:CC:FA:00:01",
            "Owner Laptop",
            to_json([seed_time(0, 8, 0), seed_time(0, 16, 0)]),
        ),
        ("AA:BB:CC:FA:00:02", "Admin Tablet", to_json([seed_time(1, 9, 0)])),
    ]
    db.executemany(
        "INSERT INTO devices (mac, device, visited) VALUES (?, ?, ?)", devices
    )


def seed_logs(db: sqlite3.Connection) -> None:
    if table_count(db, "logs") > 0:
        return
    logs = [
        (
            seed_time(9, 7, 5),
            "ElectriCredit database initialized with expanded dashboard sample data",
            "SYSTEM",
        ),
        (seed_time(8, 8, 20), "HUB[1] served CARD[1] for dashboard testing", "HUB[1]"),
        (
            seed_time(7, 12, 20),
            "CARD[2] received ₱150.00 via REGISTRY[1]",
            "REGISTRY[1]",
        ),
        (
            seed_time(6, 9, 45),
            "CARD[3] received ₱200.00 cashier top-up",
            "ADMINISTRATOR[9]",
        ),
        (seed_time(5, 21, 25), "HUB[5] session terminated for CARD[8]", "HUB[5]"),
        (seed_time(4, 8, 25), "CARD[5] received ₱50.00 via coin slot", "REGISTRY[1]"),
        (seed_time(3, 16, 58), "HUB[1] completed session for USER[6]", "HUB[1]"),
        (seed_time(2, 10, 15), "HUB[3] served CARD[7] for 2.45 kWh", "HUB[3]"),
        (
            seed_time(1, 6, 30),
            "CARD[11] received ₱110.00 via REGISTRY[1]",
            "REGISTRY[1]",
        ),
        (seed_time(0, 3, 35), "Active overnight session started on HUB[1]", "HUB[1]"),
        (
            seed_time(0, 17, 55),
            "CARD[2] received ₱250.00 cashier top-up",
            "ADMINISTRATOR[10]",
        ),
    ]
    db.executemany("INSERT INTO logs (datetime, action, author) VALUES (?, ?, ?)", logs)


def seed_all(db: sqlite3.Connection) -> None:
    seed_settings(db)
    seed_themes(db)
    seed_superusers(db)
    seed_hardware(db)
    seed_users_cards_sessions_transactions(db)
    seed_devices(db)
    seed_logs(db)
    db.commit()


def print_summary(db: sqlite3.Connection) -> None:
    tables = [
        "users",
        "cards",
        "superusers",
        "hubs",
        "registry_stations",
        "sessions",
        "transactions",
        "logs",
        "devices",
        "themes",
        "settings",
        "backups",
    ]
    print()
    print("Database summary:")
    for table in tables:
        print(f"  {table:<20} {table_count(db, table)} row(s)")
    print()


def main() -> None:
    print("============================================================")
    print("ElectriCredit v2 Database Creator")
    print(f"Database path: {DB_PATH}")
    print("============================================================")
    with connect() as db:
        create_tables(db)
        seed_all(db)
        print_summary(db)
    print("Database creation complete.")
    print("Next: python app.py")
    print("Open: http://127.0.0.1:5000")
    print("============================================================")


if __name__ == "__main__":
    main()

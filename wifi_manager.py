"""
============================================================
ELECTRICREDIT V2 - WIFI / CONNECTION MANAGER
File: wifi_manager.py

Purpose:
- Cross-platform Wi-Fi / connection backend bridge for Software > Connection.
- Supports Windows development/testing through netsh/ipconfig.
- Supports Raspberry Pi / Linux through nmcli/ip/hostname.
- Safe fallback behavior when OS tools are unavailable.

Notes:
- Windows:
  - Can detect current Wi-Fi using netsh.
  - Can scan networks using netsh.
  - Can attempt connection only to saved profiles using netsh.
  - Creating Wi-Fi profiles with passwords is intentionally not automated yet.

- Raspberry Pi / Linux:
  - Uses nmcli when available.
  - Can scan, connect, forget, and read active connection details.
  - Later hotspot/hostapd/dnsmasq integration can be added without changing
    the frontend route names.
============================================================
"""

from __future__ import annotations

import os
import platform
import re
import shutil
import socket
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any


# ==========================================================
# BASIC HELPERS
# ==========================================================

def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def get_os_name() -> str:
    return platform.system().strip() or "Unknown"


def os_family() -> str:
    system = get_os_name().lower()

    if system == "windows":
        return "windows"

    if system == "linux":
        return "linux"

    if system == "darwin":
        return "macos"

    return "unknown"


def run_command(
    command: list[str],
    timeout: int = 12,
    encoding: str = "utf-8",
) -> dict[str, Any]:
    """
    Safe subprocess wrapper.
    Returns stdout/stderr/returncode instead of raising.
    """
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            encoding=encoding,
            errors="replace",
        )

        return {
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout or "",
            "stderr": result.stderr or "",
            "command": command,
        }
    except Exception as exc:
        return {
            "ok": False,
            "returncode": -1,
            "stdout": "",
            "stderr": str(exc),
            "command": command,
        }


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def local_ip() -> str:
    """
    Best-effort local IP address detection.
    Does not require internet connection.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(0.3)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return ""


def internet_reachable() -> bool:
    """
    Quick internet reachability test.
    Safe and short timeout for UI refresh.
    """
    for host in ("1.1.1.1", "8.8.8.8"):
        try:
            sock = socket.create_connection((host, 53), timeout=1.5)
            sock.close()
            return True
        except Exception:
            continue
    return False


def is_raspberry_pi_device() -> bool:
    """
    Detects if this Linux system is probably a Raspberry Pi.
    """
    if os_family() != "linux":
        return False

    possible_files = [
        Path("/sys/firmware/devicetree/base/model"),
        Path("/proc/device-tree/model"),
    ]

    for file_path in possible_files:
        try:
            text = file_path.read_text(errors="ignore").lower()
            if "raspberry pi" in text:
                return True
        except Exception:
            pass

    try:
        cpuinfo = Path("/proc/cpuinfo").read_text(errors="ignore").lower()
        return "raspberry pi" in cpuinfo or "bcm" in cpuinfo
    except Exception:
        return False


def network_tools() -> dict[str, bool]:
    return {
        "nmcli": command_exists("nmcli"),
        "iwgetid": command_exists("iwgetid"),
        "ip": command_exists("ip"),
        "hostname": command_exists("hostname"),
        "netsh": os_family() == "windows",
        "ipconfig": os_family() == "windows",
    }


def is_raspberry_pi_ready() -> bool:
    """
    Real Wi-Fi control is expected on Raspberry Pi/Linux.
    This returns True when Linux has nmcli available.
    """
    return os_family() == "linux" and command_exists("nmcli")


def capabilities() -> dict[str, Any]:
    family = os_family()
    tools = network_tools()

    return {
        "platform": get_os_name(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "machine": platform.machine(),
        "os_family": family,
        "is_raspberry_pi": is_raspberry_pi_device(),
        "raspberry_pi_ready": is_raspberry_pi_ready(),
        "tools": tools,
        "can_status": family in {"windows", "linux"},
        "can_scan": (family == "windows") or tools["nmcli"],
        "can_connect": (family == "windows") or tools["nmcli"],
        "can_forget": (family == "windows") or tools["nmcli"],
        "hotspot_control_ready": False,
        "message": capability_message(family, tools),
    }


def capability_message(family: str, tools: dict[str, bool]) -> str:
    if family == "windows":
        return "Windows development mode. Status and scan use netsh. Connect works for saved profiles."
    if family == "linux" and tools.get("nmcli"):
        if is_raspberry_pi_device():
            return "Raspberry Pi/Linux mode with nmcli available."
        return "Linux mode with nmcli available."
    if family == "linux":
        return "Linux detected, but nmcli is unavailable. Install NetworkManager/nmcli for Wi-Fi control."
    return "Unsupported OS for direct Wi-Fi control. Returning safe status only."


def clean_text(value: Any) -> str:
    return str(value or "").strip()


# ==========================================================
# WINDOWS SUPPORT
# ==========================================================

def windows_current_wifi() -> dict[str, Any]:
    result = run_command(["netsh", "wlan", "show", "interfaces"], timeout=10)
    stdout = result.get("stdout", "")

    status = {
        "connected": False,
        "wifi_status": "disconnected",
        "wifi_ssid": "",
        "wifi_signal": "",
        "wifi_security": "",
        "wifi_authentication": "",
        "wifi_radio": "",
        "wifi_ip": local_ip(),
        "raw_available": bool(stdout.strip()),
    }

    if not stdout.strip():
        status["message"] = result.get("stderr") or "No Wi-Fi interface data returned by netsh."
        return status

    # Handles lines like:
    # State                  : connected
    # SSID                   : MyWiFi
    # Signal                 : 84%
    fields: dict[str, str] = {}
    for line in stdout.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip().lower()] = value.strip()

    state = fields.get("state", "")
    ssid = fields.get("ssid", "")

    # netsh may include BSSID; avoid treating BSSID as SSID.
    if "bssid" in fields and ssid == fields.get("bssid"):
        ssid = ""

    connected = state.lower() == "connected" or bool(ssid)

    status.update({
        "connected": connected,
        "wifi_status": "connected" if connected else (state or "disconnected"),
        "wifi_ssid": ssid,
        "ssid": ssid,
        "wifi_signal": fields.get("signal", ""),
        "wifi_security": fields.get("cipher", ""),
        "wifi_authentication": fields.get("authentication", ""),
        "wifi_radio": fields.get("radio type", ""),
        "message": "Windows Wi-Fi status loaded through netsh.",
    })

    return status


def windows_scan_networks() -> dict[str, Any]:
    result = run_command(["netsh", "wlan", "show", "networks", "mode=bssid"], timeout=15)
    stdout = result.get("stdout", "")

    if not stdout.strip():
        return {
            "mock": False,
            "platform": "Windows",
            "networks": [],
            "message": result.get("stderr") or "No networks returned by netsh.",
        }

    networks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for raw_line in stdout.splitlines():
        line = raw_line.strip()

        ssid_match = re.match(r"SSID\s+\d+\s*:\s*(.*)", line, re.I)
        if ssid_match:
            if current and current.get("ssid"):
                networks.append(current)
            ssid = ssid_match.group(1).strip()
            current = {
                "ssid": ssid,
                "signal": "",
                "security": "",
                "authentication": "",
                "platform": "Windows",
            }
            continue

        if not current or ":" not in line:
            continue

        key, value = line.split(":", 1)
        key = key.strip().lower()
        value = value.strip()

        if key == "authentication":
            current["authentication"] = value
            current["security"] = value
        elif key == "encryption":
            current["encryption"] = value
        elif key == "signal":
            current["signal"] = value

    if current and current.get("ssid"):
        networks.append(current)

    # Deduplicate SSIDs, keep strongest/latest signal.
    dedup: dict[str, dict[str, Any]] = {}
    for item in networks:
        ssid = item.get("ssid", "")
        if not ssid:
            continue
        if ssid not in dedup:
            dedup[ssid] = item
        else:
            old_signal = signal_number(dedup[ssid].get("signal"))
            new_signal = signal_number(item.get("signal"))
            if new_signal > old_signal:
                dedup[ssid] = item

    return {
        "mock": False,
        "platform": "Windows",
        "networks": list(dedup.values()),
        "message": "Windows Wi-Fi scan completed through netsh.",
    }


def windows_connect_wifi(ssid: str, password: str = "") -> dict[str, Any]:
    """
    Windows netsh can connect to saved WLAN profiles by name.
    Creating password profiles safely is intentionally not done here yet.
    """
    ssid = clean_text(ssid)
    if not ssid:
        return {"connected": False, "message": "SSID is required."}

    result = run_command(["netsh", "wlan", "connect", f"name={ssid}"], timeout=20)
    ok = result.get("ok", False)

    message = (result.get("stdout") or result.get("stderr") or "").strip()
    if password and not ok:
        message += " Password was provided, but Windows mode currently supports direct connect only to saved profiles."

    return {
        "connected": ok,
        "mock": False,
        "platform": "Windows",
        "ssid": ssid,
        "message": message or ("Connection request completed." if ok else "Connection failed."),
    }


def windows_forget_wifi(ssid: str) -> dict[str, Any]:
    ssid = clean_text(ssid)
    if not ssid:
        return {"forgot": False, "message": "SSID is required."}

    result = run_command(["netsh", "wlan", "delete", "profile", f"name={ssid}"], timeout=12)
    ok = result.get("ok", False)

    return {
        "forgot": ok,
        "mock": False,
        "platform": "Windows",
        "ssid": ssid,
        "message": (result.get("stdout") or result.get("stderr") or "").strip() or ("Wi-Fi profile forgotten." if ok else "Forget failed."),
    }


def signal_number(value: Any) -> int:
    match = re.search(r"\d+", str(value or ""))
    if not match:
        return 0
    try:
        return int(match.group(0))
    except Exception:
        return 0


# ==========================================================
# LINUX / RASPBERRY PI SUPPORT
# ==========================================================

def linux_current_wifi() -> dict[str, Any]:
    status = {
        "connected": False,
        "wifi_status": "disconnected",
        "wifi_ssid": "",
        "ssid": "",
        "wifi_signal": "",
        "wifi_security": "",
        "wifi_ip": local_ip(),
    }

    if command_exists("nmcli"):
        result = run_command(["nmcli", "-t", "-f", "ACTIVE,SSID,SIGNAL,SECURITY,DEVICE", "dev", "wifi"], timeout=10)
        stdout = result.get("stdout", "")

        for line in stdout.splitlines():
            parts = split_nmcli_line(line)
            if len(parts) < 2:
                continue

            active = parts[0].strip().lower()
            if active == "yes":
                ssid = parts[1].strip()
                status.update({
                    "connected": True,
                    "wifi_status": "connected",
                    "wifi_ssid": ssid,
                    "ssid": ssid,
                    "wifi_signal": parts[2].strip() if len(parts) > 2 else "",
                    "wifi_security": parts[3].strip() if len(parts) > 3 else "",
                    "device": parts[4].strip() if len(parts) > 4 else "",
                    "message": "Linux Wi-Fi status loaded through nmcli.",
                })
                return status

        status["message"] = "No active Wi-Fi connection found through nmcli."
        return status

    if command_exists("iwgetid"):
        result = run_command(["iwgetid", "-r"], timeout=5)
        ssid = result.get("stdout", "").strip()

        if ssid:
            status.update({
                "connected": True,
                "wifi_status": "connected",
                "wifi_ssid": ssid,
                "ssid": ssid,
                "message": "Linux Wi-Fi status loaded through iwgetid.",
            })
        else:
            status["message"] = result.get("stderr") or "No active SSID from iwgetid."

        return status

    status["message"] = "No Linux Wi-Fi status tool found. Install nmcli or iwgetid."
    return status


def linux_scan_networks() -> dict[str, Any]:
    if not command_exists("nmcli"):
        return {
            "mock": False,
            "platform": "Linux",
            "networks": [],
            "message": "nmcli is not available. Cannot scan Wi-Fi networks.",
        }

    result = run_command(
        ["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "dev", "wifi", "list"],
        timeout=15,
    )

    networks: list[dict[str, Any]] = []
    seen: set[str] = set()

    for line in result.get("stdout", "").splitlines():
        parts = split_nmcli_line(line)
        ssid = parts[0].strip() if parts else ""

        if not ssid or ssid in seen:
            continue

        seen.add(ssid)
        networks.append({
            "ssid": ssid,
            "signal": parts[1].strip() if len(parts) > 1 else "",
            "security": parts[2].strip() if len(parts) > 2 else "",
            "platform": "Linux",
        })

    return {
        "mock": False,
        "platform": "Linux",
        "networks": networks,
        "message": "Wi-Fi scan completed through nmcli." if result.get("ok") else (result.get("stderr") or "Wi-Fi scan failed."),
    }


def linux_connect_wifi(ssid: str, password: str = "") -> dict[str, Any]:
    ssid = clean_text(ssid)
    password = str(password or "")

    if not ssid:
        return {"connected": False, "message": "SSID is required."}

    if not command_exists("nmcli"):
        return {
            "connected": False,
            "ssid": ssid,
            "message": "nmcli is not available. Cannot connect Wi-Fi on this Linux device.",
        }

    command = ["nmcli", "dev", "wifi", "connect", ssid]
    if password:
        command += ["password", password]

    result = run_command(command, timeout=30)
    ok = result.get("ok", False)

    return {
        "connected": ok,
        "mock": False,
        "platform": "Linux",
        "ssid": ssid,
        "message": (result.get("stdout") or result.get("stderr") or "").strip() or ("Connected." if ok else "Connection failed."),
    }


def linux_forget_wifi(ssid: str) -> dict[str, Any]:
    ssid = clean_text(ssid)

    if not ssid:
        return {"forgot": False, "message": "SSID is required."}

    if not command_exists("nmcli"):
        return {
            "forgot": False,
            "ssid": ssid,
            "message": "nmcli is not available. Cannot forget Wi-Fi on this Linux device.",
        }

    result = run_command(["nmcli", "connection", "delete", ssid], timeout=15)
    ok = result.get("ok", False)

    return {
        "forgot": ok,
        "mock": False,
        "platform": "Linux",
        "ssid": ssid,
        "message": (result.get("stdout") or result.get("stderr") or "").strip() or ("Forgot Wi-Fi." if ok else "Forget failed."),
    }


def split_nmcli_line(line: str) -> list[str]:
    """
    nmcli -t separates by colon, but escaped colon can appear as \\:.
    This lightweight parser handles the common case safely.
    """
    parts: list[str] = []
    current = ""
    escaped = False

    for ch in str(line):
        if escaped:
            current += ch
            escaped = False
            continue

        if ch == "\\":
            escaped = True
            continue

        if ch == ":":
            parts.append(current)
            current = ""
        else:
            current += ch

    parts.append(current)
    return parts


# ==========================================================
# PUBLIC API USED BY software.py
# ==========================================================

def get_connection_status(settings: dict[str, Any] | None = None) -> dict[str, Any]:
    settings = settings or {}
    family = os_family()

    if family == "windows":
        detected = windows_current_wifi()
    elif family == "linux":
        detected = linux_current_wifi()
    else:
        detected = {
            "connected": False,
            "wifi_status": "unsupported",
            "wifi_ssid": "",
            "ssid": "",
            "wifi_ip": local_ip(),
            "message": "Unsupported OS for direct Wi-Fi detection.",
        }

    caps = capabilities()
    internet = internet_reachable()

    wifi_ssid = detected.get("wifi_ssid") or detected.get("ssid") or settings.get("wifi_ssid", "")
    wifi_ip = detected.get("wifi_ip") or settings.get("wifi_ip", "") or local_ip()
    wifi_status = detected.get("wifi_status") or settings.get("wifi_status", "unknown")

    return {
        "platform": caps["platform"],
        "platform_release": caps["platform_release"],
        "os_family": caps["os_family"],
        "is_raspberry_pi": caps["is_raspberry_pi"],
        "raspberry_pi_ready": caps["raspberry_pi_ready"],
        "capabilities": caps,
        "internet_status": "online" if internet else settings.get("internet_status", "offline"),
        "internet_reachable": internet,
        "network_mode": settings.get("network_mode", "local_only"),
        "hotspot_name": settings.get("hotspot_name", "ElectriCredit"),
        "wifi_status": wifi_status,
        "wifi_ssid": wifi_ssid,
        "ssid": wifi_ssid,
        "wifi_ip": wifi_ip,
        "ip": wifi_ip,
        "wifi_signal": detected.get("wifi_signal", ""),
        "wifi_security": detected.get("wifi_security", ""),
        "connected": bool(detected.get("connected")),
        "message": detected.get("message") or caps["message"],
        "checked_at": now_iso(),
    }


def scan_networks() -> dict[str, Any]:
    family = os_family()

    if family == "windows":
        return windows_scan_networks()

    if family == "linux":
        return linux_scan_networks()

    return {
        "mock": False,
        "platform": get_os_name(),
        "networks": [],
        "message": "Unsupported OS for Wi-Fi scanning.",
    }


def connect_wifi(ssid: str, password: str = "") -> dict[str, Any]:
    family = os_family()

    if family == "windows":
        return windows_connect_wifi(ssid, password)

    if family == "linux":
        return linux_connect_wifi(ssid, password)

    return {
        "connected": False,
        "ssid": clean_text(ssid),
        "message": "Unsupported OS for Wi-Fi connection.",
    }


def forget_wifi(ssid: str) -> dict[str, Any]:
    family = os_family()

    if family == "windows":
        return windows_forget_wifi(ssid)

    if family == "linux":
        return linux_forget_wifi(ssid)

    return {
        "forgot": False,
        "ssid": clean_text(ssid),
        "message": "Unsupported OS for Wi-Fi forget operation.",
    }


def update_hotspot_name(name: str) -> dict[str, Any]:
    """
    This updates only the software setting layer for now.
    Real hotspot service rename will be added later through hostapd/nmcli.
    """
    name = clean_text(name) or "ElectriCredit"

    return {
        "updated": True,
        "hotspot_name": name,
        "hotspot_control_ready": False,
        "message": "Hotspot name setting updated. Raspberry Pi hotspot service integration can be added later.",
        "updated_at": now_iso(),
    }


def update_connection_settings(settings: dict[str, Any]) -> dict[str, Any]:
    """
    Helper for future use. Does not write to SQLite directly.
    software.py/database.py remains responsible for persistence.
    """
    hotspot_name = clean_text(settings.get("hotspot_name")) or "ElectriCredit"
    network_mode = clean_text(settings.get("network_mode")) or "local_only"

    return {
        "updated": True,
        "hotspot_name": hotspot_name,
        "network_mode": network_mode,
        "message": "Connection settings normalized.",
        "updated_at": now_iso(),
    }

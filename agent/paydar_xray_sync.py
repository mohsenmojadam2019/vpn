#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

CONTROL_URL = os.environ.get("PAYDAR_CONTROL_URL", "").rstrip("/")
AGENT_SECRET = os.environ.get("PAYDAR_AGENT_SECRET", "")
XRAY_CONFIG = os.environ.get("XRAY_CONFIG", "/usr/local/etc/xray/config.json")
XRAY_INBOUND_TAG = os.environ.get("XRAY_INBOUND_TAG", "paydar-vless")
XRAY_BIN = os.environ.get("XRAY_BIN", "/usr/local/bin/xray")
XRAY_FLOW = os.environ.get("XRAY_FLOW", "xtls-rprx-vision")


def fail(message: str) -> None:
    print(f"paydar-agent: {message}", file=sys.stderr)
    raise SystemExit(1)


def fetch_users():
    if not CONTROL_URL or not AGENT_SECRET:
        fail("PAYDAR_CONTROL_URL and PAYDAR_AGENT_SECRET are required")

    request = urllib.request.Request(
        f"{CONTROL_URL}/api/agent/users",
        headers={"Authorization": f"Bearer {AGENT_SECRET}", "User-Agent": "paydar-node-agent/0.2"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        fail(f"failed to fetch users: {exc}")

    users = payload.get("users")
    if not isinstance(users, list):
        fail("control plane returned an invalid users payload")
    return users


def build_clients(users):
    clients = []
    for user in users:
        uuid = user.get("uuid")
        subscription_id = user.get("id")
        if not uuid or not subscription_id:
            continue
        client = {"id": uuid, "email": f"paydar-{subscription_id}"}
        if XRAY_FLOW:
            client["flow"] = XRAY_FLOW
        clients.append(client)
    return clients


def load_config():
    try:
        with open(XRAY_CONFIG, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        fail(f"cannot read {XRAY_CONFIG}: {exc}")


def replace_clients(config, clients):
    for inbound in config.get("inbounds", []):
        if inbound.get("tag") == XRAY_INBOUND_TAG:
            settings = inbound.setdefault("settings", {})
            previous = settings.get("clients", [])
            settings["clients"] = clients
            return previous != clients
    fail(f"inbound tag {XRAY_INBOUND_TAG!r} not found")


def validate_config(path):
    result = subprocess.run(
        [XRAY_BIN, "run", "-test", "-config", path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=20,
    )
    if result.returncode != 0:
        fail(f"xray config validation failed:\n{result.stdout}")


def reload_xray():
    reload_result = subprocess.run(["systemctl", "reload", "xray"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if reload_result.returncode != 0:
        restart_result = subprocess.run(["systemctl", "restart", "xray"])
        if restart_result.returncode != 0:
            fail("could not reload or restart xray")


def main():
    users = fetch_users()
    clients = build_clients(users)
    config = load_config()
    changed = replace_clients(config, clients)

    if not changed:
        print(f"paydar-agent: no change ({len(clients)} active users)")
        return

    config_dir = os.path.dirname(XRAY_CONFIG) or "."
    fd, temp_path = tempfile.mkstemp(prefix=".paydar-xray-", suffix=".json", dir=config_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(config, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        validate_config(temp_path)
        if os.path.exists(XRAY_CONFIG):
            shutil.copy2(XRAY_CONFIG, f"{XRAY_CONFIG}.paydar.bak")
        os.replace(temp_path, XRAY_CONFIG)
        reload_xray()
        print(f"paydar-agent: synced {len(clients)} active users")
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


if __name__ == "__main__":
    main()

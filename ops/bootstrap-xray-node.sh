#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

: "${PAYDAR_CONTROL_URL:?Set PAYDAR_CONTROL_URL, e.g. https://panel.example.com}"
: "${PAYDAR_AGENT_SECRET:?Set PAYDAR_AGENT_SECRET to the same secret configured on the control plane}"

REALITY_SERVER_NAME="${REALITY_SERVER_NAME:-www.microsoft.com}"
REALITY_DEST="${REALITY_DEST:-${REALITY_SERVER_NAME}:443}"
XRAY_PORT="${XRAY_PORT:-443}"
SHORT_ID="${SHORT_ID:-$(openssl rand -hex 8)}"
XRAY_CONFIG="/usr/local/etc/xray/config.json"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl openssl python3

bash <(curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh) install

XRAY_BIN="$(command -v xray)"
if [[ -z "${XRAY_BIN}" ]]; then
  echo "Xray installation failed." >&2
  exit 1
fi

KEY_OUTPUT="$(${XRAY_BIN} x25519)"
PRIVATE_KEY="$(printf '%s\n' "${KEY_OUTPUT}" | awk -F': ' '/Private key/ {print $2; exit}')"
PUBLIC_KEY="$(printf '%s\n' "${KEY_OUTPUT}" | awk -F': ' '/Public key/ {print $2; exit}')"

if [[ -z "${PRIVATE_KEY}" || -z "${PUBLIC_KEY}" ]]; then
  echo "Could not parse Xray x25519 keys." >&2
  printf '%s\n' "${KEY_OUTPUT}" >&2
  exit 1
fi

install -d -m 0755 /usr/local/etc/xray /usr/local/lib/paydar /etc/paydar
cat >"${XRAY_CONFIG}" <<JSON
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "tag": "paydar-vless",
      "listen": "0.0.0.0",
      "port": ${XRAY_PORT},
      "protocol": "vless",
      "settings": {
        "clients": [],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "${REALITY_DEST}",
          "xver": 0,
          "serverNames": ["${REALITY_SERVER_NAME}"],
          "privateKey": "${PRIVATE_KEY}",
          "shortIds": ["${SHORT_ID}"]
        }
      }
    }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" },
    { "protocol": "blackhole", "tag": "blocked" }
  ]
}
JSON

${XRAY_BIN} run -test -config "${XRAY_CONFIG}"

curl -fsSL "https://raw.githubusercontent.com/mohsenmojadam2019/vpn/main/agent/paydar_xray_sync.py" -o /usr/local/lib/paydar/paydar_xray_sync.py
chmod 0755 /usr/local/lib/paydar/paydar_xray_sync.py
curl -fsSL "https://raw.githubusercontent.com/mohsenmojadam2019/vpn/main/agent/paydar-agent.service" -o /etc/systemd/system/paydar-agent.service
curl -fsSL "https://raw.githubusercontent.com/mohsenmojadam2019/vpn/main/agent/paydar-agent.timer" -o /etc/systemd/system/paydar-agent.timer

cat >/etc/paydar/agent.env <<ENV
PAYDAR_CONTROL_URL=${PAYDAR_CONTROL_URL%/}
PAYDAR_AGENT_SECRET=${PAYDAR_AGENT_SECRET}
XRAY_CONFIG=${XRAY_CONFIG}
XRAY_INBOUND_TAG=paydar-vless
XRAY_BIN=${XRAY_BIN}
XRAY_FLOW=xtls-rprx-vision
ENV
chmod 0600 /etc/paydar/agent.env

systemctl daemon-reload
systemctl enable --now xray
systemctl enable --now paydar-agent.timer
systemctl start paydar-agent.service || true

PUBLIC_IP="$(curl -4fsS --max-time 5 https://api.ipify.org || true)"
cat <<INFO

Paydar Xray node is installed.

Add this Node in the Paydar admin panel:
  Host/IP:       ${PUBLIC_IP:-<server-public-ip>}
  Port:          ${XRAY_PORT}
  Transport:     RAW/TCP
  Security:      REALITY
  Flow:          xtls-rprx-vision
  SNI:           ${REALITY_SERVER_NAME}
  Public Key:    ${PUBLIC_KEY}
  Short ID:      ${SHORT_ID}
  Fingerprint:   chrome

Private key stays only on this server.
INFO

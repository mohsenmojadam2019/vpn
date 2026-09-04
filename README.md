# Paydar VPN Control Plane

Paydar is a web control plane for managing and selling multi-node VLESS subscriptions.

> No Internet endpoint can honestly be guaranteed to be "never blocked" or "never disconnected". Paydar is designed around replaceable nodes, health checks, stable subscription URLs, and per-customer credentials so one failed endpoint does not require rebuilding an app or changing every customer's subscription URL.

## Implemented

- Persian/RTL public storefront and admin dashboard
- Admin login with environment-only email/password credentials
- Signed HttpOnly admin session cookie
- PostgreSQL/Prisma data model
- VLESS node create/edit/enable/disable/delete
- RAW/TCP, XHTTP, gRPC and TLS/REALITY metadata in the control plane
- Customer and sales-plan management
- Public plan checkout/order form
- Public order tracking code
- Admin order approval/cancellation
- Automatic customer + UUID + subscription issuance when an order is approved
- Per-subscription VLESS UUIDs
- Expiration and optional traffic-limit metadata
- Stable remote subscription URL per customer
- Base64 VLESS subscription output plus raw-link format
- TCP node health-check endpoint
- Authenticated node-agent user feed
- Xray user-sync agent and systemd timer
- One-command-style Xray/REALITY VPS bootstrap script

## Architecture

```text
Customer -> Storefront -> Order -> Admin approval -> Subscription URL
                                      |
Admin -> Paydar Control Plane --------+
              |-- PostgreSQL
              |-- /sub/<token>
              |-- /api/cron/health
              `-- /api/agent/users
                        |
                        v
                Authorized Xray nodes
```

The control plane and data plane are separate. Vercel can host the dashboard/subscription API. VLESS traffic must run on VPS/VM nodes you control.

## Local setup

Requirements: Node.js 22+ and PostgreSQL.

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

### Required environment variables

```text
DATABASE_URL
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
AUTH_SECRET
NEXT_PUBLIC_BASE_URL
CRON_SECRET
NODE_AGENT_SECRET
```

Generate the bcrypt password hash locally and keep plaintext passwords and all secrets out of GitHub. `AUTH_SECRET`, `CRON_SECRET`, and `NODE_AGENT_SECRET` must be independent random secrets.

## Storefront flow

1. Admin creates a plan.
2. The plan appears on the public site.
3. Customer submits name/phone/email and receives an order code.
4. Admin opens `/admin/orders` and approves the order.
5. Paydar creates/fetches the customer, generates a unique VLESS UUID and token, applies plan expiration/traffic metadata, and marks the order paid/approved.
6. The order status page displays the stable subscription URL.
7. Node agents fetch active UUIDs and synchronize them to Xray.

The current flow is payment-provider-neutral. A bank/payment gateway can later call the same approval/provisioning path after verified payment instead of manual admin approval.

## Vercel deployment

1. Create a managed PostgreSQL database.
2. Add all `.env.example` variables to the Vercel project environment.
3. Run `npx prisma db push` once against the production database.
4. Deploy this repository.
5. Set `NEXT_PUBLIC_BASE_URL` to the final HTTPS domain.

Vercel is control plane only. Do not send VPN data-plane traffic through Vercel Functions.

## Subscription formats

Default base64 subscription:

```text
https://your-domain.example/sub/<token>
```

Raw VLESS links:

```text
https://your-domain.example/sub/<token>?format=raw
```

Changing/disabling/adding a node updates the next subscription refresh while keeping the customer's subscription URL unchanged.

## Health checks

`GET /api/cron/health` requires:

```text
Authorization: Bearer <CRON_SECRET>
```

It performs TCP connectivity checks from the control-plane host. It is a basic availability signal, not proof that a node is reachable from every ISP/location.

## Node user synchronization

`GET /api/agent/users` requires:

```text
Authorization: Bearer <NODE_AGENT_SECRET>
```

It returns active, non-expired subscriptions that have not exceeded the configured traffic metadata.

`agent/paydar_xray_sync.py` synchronizes the list into an Xray inbound tagged `paydar-vless`. It validates a temporary Xray config before replacing the live config and keeps a backup.

## Bootstrap an Ubuntu/Debian Xray node

On a fresh VPS, set the control-plane URL and a secret equal to the control plane's `NODE_AGENT_SECRET`, then run `ops/bootstrap-xray-node.sh` as root.

Example environment names:

```text
PAYDAR_CONTROL_URL=https://panel.example.com
PAYDAR_AGENT_SECRET=<same value as NODE_AGENT_SECRET>
REALITY_SERVER_NAME=<your chosen TLS server name>
REALITY_DEST=<server-name>:443
XRAY_PORT=443
```

The bootstrap script:

- installs Xray using the upstream XTLS installer
- creates a VLESS/REALITY inbound
- generates the X25519 key pair and short ID
- keeps the private key on the VPS only
- installs the Paydar sync agent/timer
- prints the public key, short ID, SNI, port and public IP to enter in the admin panel

## Security notes

- This repository is public. Never commit REALITY private keys, passwords, DB credentials, API secrets, production UUID lists, or payment credentials.
- REALITY private keys stay only on the node.
- The control plane stores only public node metadata required to build client links.
- Keep unrelated business sites on infrastructure separate from VPN nodes.
- Rotate `NODE_AGENT_SECRET` if a node is compromised.
- Use the software only on infrastructure and networks you are authorized to operate.

## Remaining production integrations

These require external accounts/credentials rather than more repository code:

- production PostgreSQL instance
- deployed control-plane domain
- at least one VPS/VM node
- optional payment gateway credentials/webhook
- optional multi-region/ISP monitoring probes
- accurate traffic accounting source from the data plane

The repository is designed so these can be attached without changing customer subscription URLs.

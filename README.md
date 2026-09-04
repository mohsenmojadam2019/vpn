# Paydar VPN Control Plane

Paydar is a web control plane for managing VLESS nodes, customers, plans, and remote subscription links.

> No Internet endpoint can honestly be guaranteed to be "never blocked" or "never disconnected". Paydar is designed around redundancy, replaceable nodes, health checks, per-customer credentials, and remote subscription updates so a failed node does not require rebuilding client apps or changing every customer's subscription URL.

## What is implemented

- Persian/RTL public website and admin dashboard
- Admin login with email/password configured only through environment variables
- Signed HttpOnly admin session cookie
- PostgreSQL/Prisma data model
- VLESS node create/edit/enable/disable/delete
- Node fields for RAW/TCP, XHTTP, gRPC, TLS/REALITY metadata
- Customer and sales-plan management
- Per-subscription VLESS UUIDs
- Expiration and optional traffic-limit metadata
- Stable remote subscription URL per customer
- Base64 VLESS subscription output plus raw-link format
- TCP node health-check endpoint
- Authenticated node-agent user feed
- Optional Xray user-sync agent and systemd timer

## Architecture

```text
Browser/Admin
    |
    v
Paydar Control Plane (Next.js)
    |-- PostgreSQL
    |-- /sub/<token>
    |-- /api/cron/health
    `-- /api/agent/users
             |
             v
       Authorized VPN nodes
```

The control plane and data plane are intentionally separate. Vercel can host the dashboard/subscription API, while VPN traffic must run on VPS/VM nodes that you control and are authorized to operate.

## Local setup

Requirements: Node.js 22+, PostgreSQL.

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

Generate the bcrypt password hash locally and keep the plaintext password and all secrets out of Git/GitHub.

`AUTH_SECRET`, `CRON_SECRET`, and `NODE_AGENT_SECRET` should each be independent random secrets.

## Vercel deployment

1. Create a PostgreSQL database (for example a managed PostgreSQL service).
2. Add all variables from `.env.example` to the Vercel project environment.
3. Run `npx prisma db push` against the production database once during initial setup.
4. Deploy the repository to Vercel.
5. Set `NEXT_PUBLIC_BASE_URL` to the final HTTPS domain.

Vercel is used for the control plane only. Do not route high-volume VPN data through Vercel Functions.

## Subscription formats

Default (base64 VLESS subscription):

```text
https://your-domain.example/sub/<token>
```

Raw VLESS links:

```text
https://your-domain.example/sub/<token>?format=raw
```

Changing, disabling, or adding a node updates the next subscription refresh without changing the customer's token URL.

## Health checks

`GET /api/cron/health` requires:

```text
Authorization: Bearer <CRON_SECRET>
```

It performs a TCP-connectivity check from the control-plane host. This is a basic availability signal, not proof that a node is reachable from every ISP or country.

## Node user synchronization

`GET /api/agent/users` requires:

```text
Authorization: Bearer <NODE_AGENT_SECRET>
```

It returns only active, non-expired subscriptions that have not exceeded their configured traffic limit.

The included `agent/paydar_xray_sync.py` can synchronize this authorized-user list into an existing Xray inbound tagged `paydar-vless`. The script validates the generated Xray configuration before replacing the live file and keeps a backup.

## Security notes

- This repository is public. Never commit server private keys, passwords, database credentials, tokens, or production UUID lists.
- REALITY private keys belong only on the relevant server, never in this control-plane repository.
- The dashboard stores only the public-key side of node metadata.
- Keep business websites and unrelated production services on infrastructure separate from VPN nodes.
- Use the software only on systems and networks you are authorized to operate.

## Not implemented yet

- Payment gateway / automatic checkout
- Automated VPS provisioning
- Per-node secure agent credentials (current MVP uses one `NODE_AGENT_SECRET`)
- Accurate traffic accounting from Xray
- Monitoring probes from multiple geographic/ISP vantage points
- Automatic node quarantine based on multiple independent probes
- Database migrations for production release management (MVP currently uses `prisma db push`)

## Current status

MVP control plane is implemented on branch `feat/paydar-control-plane`. The next infrastructure milestone is connecting the first authorized VPS node and validating end-to-end provisioning, subscription refresh, revocation, and health reporting.

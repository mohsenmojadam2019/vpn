# Paydar VPN Control Plane

Paydar is a web control plane for managing and selling multi-node VLESS subscriptions.

> No Internet endpoint can honestly be guaranteed to be "never blocked" or "never disconnected". Paydar is designed around replaceable nodes, health checks, stable subscription URLs, and per-customer credentials so one failed endpoint does not require rebuilding an app or changing every customer's subscription URL.

## Implemented

- Persian/RTL public storefront and admin dashboard
- Admin login with environment-only email/password credentials
- Signed HttpOnly admin session cookie
- PostgreSQL/Prisma data model
- Supabase production schema migration in `supabase/migrations/20260904_init.sql`
- VLESS node create/edit/enable/disable/delete
- RAW/TCP, XHTTP, gRPC and TLS/REALITY metadata in the control plane
- Customer and sales-plan management
- Public plan checkout/order form
- Duplicate pending-order protection
- Public order tracking code
- Admin order approval/cancellation
- Automatic customer + UUID + subscription issuance when an order is approved
- Per-subscription VLESS UUIDs
- Expiration and optional traffic-limit metadata
- Stable remote subscription URL per customer
- Base64 VLESS subscription output plus raw-link format
- TCP node health-check endpoint
- Readiness endpoint at `/api/health`
- Authenticated node-agent user feed
- Xray user-sync agent and systemd timer
- One-command-style Xray/REALITY VPS bootstrap script
- Security headers and Vercel Hobby-compatible cron configuration

## Architecture

```text
Customer -> Storefront -> Order -> Admin approval -> Subscription URL
                                      |
Admin -> Paydar Control Plane --------+
              |-- Supabase/PostgreSQL
              |-- /sub/<token>
              |-- /api/cron/health
              `-- /api/agent/users
                        |
                        v
                Authorized Xray nodes
```

The control plane and data plane are separate. Vercel or Render can host the dashboard/subscription API. VLESS traffic must run on VPS/VM nodes you control.

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
DIRECT_URL
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
AUTH_SECRET
NEXT_PUBLIC_BASE_URL
CRON_SECRET
NODE_AGENT_SECRET
```

Use the Supabase pooler/session connection for `DATABASE_URL` and a direct/session connection for `DIRECT_URL`. Generate the bcrypt password hash locally and keep plaintext passwords and all secrets out of GitHub. `AUTH_SECRET`, `CRON_SECRET`, and `NODE_AGENT_SECRET` must be independent random secrets.

## Supabase production database

The idempotent production schema is committed at:

```text
supabase/migrations/20260904_init.sql
```

It creates the Node, Plan, Customer, Subscription and Order tables, indexes, enum types and foreign keys. RLS is enabled and no anonymous/authenticated PostgREST policies are created, so the public Supabase Data API cannot directly read control-plane tables. The Next.js application accesses PostgreSQL server-side through Prisma.

No database password, service-role key, private REALITY key, or production UUID is committed to this repository.

## Storefront flow

1. Admin creates a plan.
2. The plan appears on the public site.
3. Customer submits name/phone/email and receives an order code.
4. Admin opens `/admin/orders` and approves the order.
5. Paydar creates/fetches the customer, generates a unique VLESS UUID and token, applies plan expiration/traffic metadata, and marks the order paid/approved.
6. The order status page displays the stable subscription URL.
7. Node agents fetch active UUIDs and synchronize them to Xray.

The current flow is payment-provider-neutral. A bank/payment gateway can later call the same approval/provisioning path after verified payment instead of manual admin approval.

## Deployment

### Vercel

1. Import this GitHub repository.
2. Add the required environment variables.
3. Apply the Supabase migration or run `npx prisma db push` once against production.
4. Deploy the repository.
5. Set `NEXT_PUBLIC_BASE_URL` to the final HTTPS domain.

The committed `vercel.json` uses a once-daily health cron so Vercel Hobby deployments are accepted.

### Render

The same application can run as a Node/Next.js web service on Render using:

```text
Build: npm install && npm run build
Start: npm run start
```

Add the same environment variables in the Render service and set `NEXT_PUBLIC_BASE_URL` to the Render/custom domain.

Vercel/Render are control plane only. Do not send VPN data-plane traffic through them.

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

`GET /api/health` returns only an overall ready/degraded state and intentionally does not reveal which secret or dependency is missing.

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
- Rotate any password or credential that has been pasted into chat before production use.
- Use the software only on infrastructure and networks you are authorized to operate.

## Remaining production integrations

These require external infrastructure rather than more repository code:

- apply the Supabase schema to the production project
- deploy the control plane and add its environment variables
- attach at least one VPS/VM Xray node
- optional payment gateway credentials/webhook
- optional multi-region/ISP monitoring probes
- accurate traffic accounting source from the data plane

The repository is designed so these can be attached without changing customer subscription URLs.

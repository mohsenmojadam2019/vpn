# Paydar VPN Control Plane

Paydar is a VLESS subscription/control-plane project focused on resilient multi-node service management.

> Important: no Internet endpoint can honestly be guaranteed to be "never blocked" or "never disconnected". Paydar is designed around redundancy, replaceable nodes, health checks, and remote subscription updates so one failed endpoint does not require rebuilding client apps.

The control plane is intentionally separated from VPN data-plane servers. Vercel can host the dashboard and subscription API; VLESS traffic must run on VPS/VM nodes.

## Status

Initial implementation in progress.

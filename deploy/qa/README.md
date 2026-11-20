# Deferred QA hosting preparation

The user selected `qa.pingforce.com` but deferred hosting until local automation is ready. Nothing here creates DNS, deploys a server or copies a live database.

The standalone Compose stack is usable locally and later on an existing server. It uses project `pingforce-qa`, a dedicated PostGIS database/user/volume, Redis, JWT keys, uploads and Mailpit. The API has only an internal Docker network, which blocks outbound email/SMS/payment/push calls and prevents reaching live services. The frontend reverse proxy bridges the edge and isolated networks. The only host port is loopback `4300`.

Build from the QA branch with `docker compose --env-file deploy/qa/.env -f deploy/qa/compose.yml up -d --build`. Do not merge this Compose file with production. The `.env` values must be distinct random URL-safe secrets. Real hosted secrets should be retrieved from OCI Vault into an ignored runtime file. The API receives only explicitly defined settings; migration/seed receives the QA secret file. Avoid passing live provider credentials even to migration jobs.

Database cloning currently means matching the schema through the same Prisma migration history, then adding synthetic QA tenants. It does not copy production customer data. A future data clone requires a separately reviewed export/sanitization/import procedure: strip sessions, refresh/OTP/device tokens, password hashes, contact details, external integrations, webhooks, payment references, tenant SMTP credentials and private attachments before starting workers. Keep the destination network isolated throughout. Never restore a dump onto the live volume.

When hosting is resumed, an existing server can run both stacks if capacity permits. Keep the QA Docker project, volumes, database credentials, signing keys and storage separate. Add a TLS virtual host for `qa.pingforce.com` to the existing host proxy, forwarding to `127.0.0.1:4300`; avoid another service competing for ports 80/443. Confirm DNS ownership, TLS, backup retention and resource limits then. No production proxy file has been edited by this work.

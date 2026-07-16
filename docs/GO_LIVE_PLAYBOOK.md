# PingForce Go-Live Playbook

> Complete, ordered checklist to take PingForce from current state (all code done,
> uncommitted) to production. Written 2026-07-16.
>
> Legend: 🖥️ = run on your Windows dev machine · ☁️ = run on the OCI server ·
> 🌐 = browser/console task

Execution order matters — steps are sequenced so nothing blocks.

---

## Step 0 — Commit the working tree (do this FIRST)

Everything (Phase 1 perf fixes, Phase 2 notifications, mobile FCM, Firebase
Hosting rework, deploy infra, Phase 3 scalability) is uncommitted. Nothing else
can safely proceed until this lands.

🖥️ Recommended split into logical commits:

```bash
cd c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo

# 1. Security hygiene (already-staged .env.production untrack + gitignore)
git add .gitignore
git commit -m "chore: untrack .env.production, ignore secrets/ and service-account keys"

# 2. Phase 1 — performance fixes
git add apps/api/src/attendance prisma/schema.prisma prisma/migrations/20260716090000_phase1_perf_indexes \
        apps/api/src/prisma/prisma.module.ts apps/api/src/scheduler apps/api/src/main.ts
git commit -m "feat: phase 1 perf fixes - real attendance metrics, work-minute crediting, pool limits, compression, indexes, auto-checkout scheduler"

# 3. Phase 2 — notification channels
git add apps/api/src/notifications package.json package-lock.json
git commit -m "feat: FCM push + WhatsApp Cloud API + device-token lifecycle (env-gated)"

# 4. Mobile FCM
git add apps/mobile
git commit -m "feat(mobile): Firebase Cloud Messaging wiring + package rename to com.vellasoft.pingforce"

# 5. Firebase Hosting + website
git add firebase.json .firebaserc apps/website apps/admin .github/workflows/ci.yml eslint* .env.example
git commit -m "feat: Firebase Hosting for website+admin, prod API URL wiring, CI frontend deploy"

# 6. Infra + observability
git add deploy apps/api/src/monitoring apps/api/src/app/app.module.ts
git commit -m "feat: prometheus metrics, bull board, production OCI compose stack"

# 7. Phase 3 scalability (whatever remains)
git add -A
git commit -m "feat: phase 3 - geofence/RBAC caching, tiered throttling, queue split with DLQ, mobile sync batching"

git push origin main
```

> Adjust file lists if `git status` shows drift — the goal is logical grouping,
> not exact paths. Simplest fallback: one big commit beats zero commits.

**Verification:** `git status` clean; GitHub Actions `quality` + `security` jobs
green on the push. (`package` will also run; `deploy`/`deploy-frontends` skip
gracefully until secrets exist.)

---

## Step 1 — DNS records (do early: propagation takes time)

🌐 At your DNS provider for `pingforce.in`:

| Record | Host | Points to |
| --- | --- | --- |
| A | `api` | OCI server public IP |
| A | `admin-api` | OCI server public IP |
| A | `grafana` | OCI server public IP |
| A | `files` | OCI server public IP |
| A / TXT | `@` (pingforce.in) | values Firebase gives you in Step 3 |
| A / TXT | `admin` | values Firebase gives you in Step 3 |

🖥️ Verify propagation:

```bash
nslookup api.pingforce.in
nslookup admin-api.pingforce.in
```

---

## Step 2 — GitHub repository secrets

🌐 GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON of `secrets/pingforce-db47a-firebase-adminsdk.json` (paste as-is) |
| `OCI_HOST` | OCI server public IP (or hostname) |
| `OCI_SSH_USER` | SSH user, e.g. `ubuntu` or `opc` |
| `OCI_SSH_KEY` | Private SSH key contents (PEM) for that user |

**Verification:** next push to main — `deploy-frontends` and `deploy` jobs stop
skipping.

---

## Step 3 — Firebase Hosting sites + domains

🌐 [Firebase console](https://console.firebase.google.com) → project `pingforce-db47a`:

1. Build → Hosting → Get started (accept defaults; ignore CLI steps — repo already has `firebase.json`).
2. "Add another site" twice, with **exactly** these site IDs (they're wired in `.firebaserc`):
   - `pingforce-website`
   - `pingforce-admin`
3. On site `pingforce-website` → Add custom domain → `pingforce.in` → follow the TXT verification + A records → add them in DNS (Step 1 table).
4. On site `pingforce-admin` → Add custom domain → `admin.pingforce.in` → same.
5. Certificates provision automatically after DNS verifies (minutes to hours).

Optional manual first deploy from dev machine (CI does it on push to main anyway):

```bash
# 🖥️
cd c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo
npx nx build website --configuration=production
npx nx build admin --configuration=production
$env:GOOGLE_APPLICATION_CREDENTIALS = "$PWD/secrets/pingforce-db47a-firebase-adminsdk.json"
npx firebase-tools deploy --only hosting --project pingforce-db47a
```

**Verification:** `https://pingforce.in` shows the landing page,
`https://admin.pingforce.in` loads the admin portal.

---

## Step 4 — OCI server bring-up

☁️ SSH into the OCI server:

```bash
# 4.1 Install Docker (Ubuntu; skip if present)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # re-login after this

# 4.2 Open firewall (OCI Security List AND host firewall)
#     Required: TCP 80, 443
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
# Also add Ingress Rules for 80/443 in OCI Console → VCN → Security Lists.

# 4.3 Create the app directory
sudo mkdir -p /opt/pingforce/secrets
sudo chown -R $USER /opt/pingforce
```

🖥️ Copy deploy files + Firebase key from dev machine:

```bash
cd c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo
scp -r deploy/* <user>@<oci-ip>:/opt/pingforce/
scp secrets/pingforce-db47a-firebase-adminsdk.json <user>@<oci-ip>:/opt/pingforce/secrets/firebase-adminsdk.json
```

☁️ Configure and start:

```bash
cd /opt/pingforce

# 4.4 Fill in real values (strong random secrets!)
cp .env.example .env
nano .env
#   GITHUB_REPO   = your GitHub org/repo, lowercase (e.g. pingforce-vellasoft/pingforce-monorepo)
#   DB_PASSWORD, JWT_SECRET, MINIO_SECRET_KEY, GRAFANA_PASSWORD, BULL_BOARD_PASS
#   Generate secrets with:  openssl rand -base64 48

# 4.5 Log in to GitHub Container Registry
#     Create a GitHub PAT (classic) with read:packages scope first
docker login ghcr.io -u <github-username>
# paste PAT as password

# 4.6 Start the stack
docker compose pull
docker compose up -d

# 4.7 Watch it come up
docker compose ps
docker compose logs -f api | head -50
```

**Verification:**

```bash
curl -f https://api.pingforce.in/api/v1/health          # {"status":"ok",...}
curl -f https://admin-api.pingforce.in/api/v1/health
curl -f https://api.pingforce.in/api/v1/metrics | head  # prometheus text
```

Caddy fetches TLS certificates automatically on first request — DNS (Step 1)
must already point here.

---

## Step 5 — Live database migrate + seed

☁️ On the server (uses the compose `migrate` one-shot service):

```bash
cd /opt/pingforce

# 5.1 Apply all migrations (includes the handwritten phase1 index migration)
docker compose run --rm migrate

# 5.2 Seed (roles, permissions, super admin)
#     SEED_SUPER_ADMIN_PASSWORD must be set — add it to .env first
docker compose run --rm -e SEED_SUPER_ADMIN_PASSWORD='<strong-password>' migrate npx prisma db seed
```

**Verification:**

```bash
docker compose exec postgres psql -U pingforce_user -d pingforce_db \
  -c "select count(*) from _prisma_migrations;"
# then log into admin portal with the seeded super admin
```

---

## Step 6 — Grafana + monitoring check

🌐 `https://grafana.pingforce.in` → log in with `GRAFANA_USER`/`GRAFANA_PASSWORD`
from `.env`.

- Datasource "Prometheus" is pre-provisioned.
- Explore → query `http_request_duration_seconds_count` — data appears after a
  few API requests.
- Build dashboards later; import community dashboard ID `11159` (Node.js) as a
  starting point.

Bull Board: `https://api.pingforce.in/queues` → basic auth with
`BULL_BOARD_USER`/`BULL_BOARD_PASS`. Shows all 5 queues; failed jobs = your
dead-letter list, retryable from the UI.

---

## Step 7 — WhatsApp Cloud API (Meta)

🌐 Sequence (allow days for template approval):

1. [developers.facebook.com](https://developers.facebook.com) → Create App → type "Business".
2. Add product **WhatsApp** → attaches a test number immediately.
3. Business Settings → System Users → create system user (admin) → Generate token
   with `whatsapp_business_messaging` + `whatsapp_business_management` scopes,
   expiry **never** → this is `WHATSAPP_ACCESS_TOKEN`.
4. WhatsApp → API Setup → copy `WHATSAPP_PHONE_NUMBER_ID`.
5. To message real customers: add + verify your own phone number (business
   verification may be required).
6. WhatsApp Manager → Message Templates → create + submit for approval:
   - `otp_code` (Authentication) — body: `{{1}} is your PingForce verification code. Expires in 10 minutes.`
   - `shift_reminder` (Utility) — body: `Hi {{1}}, your shift starts at {{2}}. Please check in on time.`

☁️ When approved, add to `/opt/pingforce/.env`:

```bash
WHATSAPP_PHONE_NUMBER_ID=<from step 4>
WHATSAPP_ACCESS_TOKEN=<from step 3>
```

```bash
docker compose up -d api   # restart to pick up env
```

**Verification:** trigger a notification (e.g. leave approval) → check
`notifications-whatsapp` queue in Bull Board + message arrives on a test number
(24h window rules apply for free-form text; templates work any time).

> Code note: `WhatsAppService.sendText` covers service-window replies;
> OTP/shift sends should use `sendTemplate('otp_code', 'en', [code])` once
> templates are approved — small follow-up wiring in `NotificationsService`.

---

## Step 8 — Play Console + Android release signing

🌐 Account:

1. [play.google.com/console](https://play.google.com/console) → pay one-time $25 → create developer account.
2. Create app → `PingForce` → package `com.vellasoft.pingforce`.

🖥️ Generate production keystore (KEEP THIS FILE + PASSWORDS FOREVER — losing it
means you can never update the app):

```powershell
keytool -genkey -v -keystore c:\keys\pingforce-upload.jks `
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

🖥️ Create `apps/mobile/android/key.properties` (gitignored — never commit):

```properties
storePassword=<keystore password>
keyPassword=<key password>
keyAlias=upload
storeFile=c:/keys/pingforce-upload.jks
```

Code side (ask Claude — the "small code bit left"): wire `key.properties` into
`apps/mobile/android/app/build.gradle.kts` signingConfigs + release buildType,
then:

```powershell
cd apps/mobile
flutter build appbundle --release
```

Upload `build/app/outputs/bundle/release/app-release.aab` to Play Console →
internal testing track first.

---

## Step 9 — Final end-to-end verification

| # | Check | How |
| --- | --- | --- |
| 1 | API healthy | `curl https://api.pingforce.in/api/v1/health` |
| 2 | Admin portal live | open `https://admin.pingforce.in`, log in with seeded admin |
| 3 | Website live | open `https://pingforce.in` |
| 4 | CORS correct | admin portal network tab — no CORS errors |
| 5 | Mobile app → API | install APK/AAB build, log in |
| 6 | FCM end-to-end | log in on device → Firebase console → Cloud Messaging → send test message to the token; or trigger a real event |
| 7 | Push token registered | check `device_tokens` table has a row after mobile login |
| 8 | Offline sync | airplane mode → punch → back online → check Bull Board / attendance logs |
| 9 | Metrics flowing | Grafana explore query returns data |
| 10 | Queues healthy | Bull Board shows completed jobs, empty failed lists |
| 11 | CI full green | GitHub Actions run: quality, security, package, deploy-frontends, deploy all pass |

---

## Backlog after go-live (code, no setup needed)

- Mobile logout UI — must call `PushNotificationsService.unregisterToken()`
- `NotificationsService` → use WhatsApp `sendTemplate` for OTP once templates approved
- Visits module → adopt `GeofenceCacheService` (still uses raw SQL haversine)
- Excel/PDF report export
- White-label `AppColors` sweep (221 hardcoded colors)
- Scheduled/custom reports engine
- Key rotation: Firebase admin key `980bdf99…` transited chat — rotate at leisure

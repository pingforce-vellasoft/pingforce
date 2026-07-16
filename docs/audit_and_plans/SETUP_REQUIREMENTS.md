# PingForce — Implementation Setup & Prerequisites
> **Target:** Preparing for the Master Implementation Plan
> **Date:** July 16, 2026

Before executing the implementation plan, you will need to gather credentials, create accounts, and provision infrastructure. This document outlines exactly what is needed for each phase.

---

## Phase 1: Critical Code & Performance Fixes
**Status: ✅ Ready to Start Now**

Phase 1 requires **zero external accounts or infrastructure**. It entirely consists of internal code optimizations, PostgreSQL schema indexing, and NestJS module configuration. 
- You do not need to set up anything new for this phase.

---

## Phase 2: Missing Core Infrastructure (Go-Live Readiness)
**Status: ⚠️ Setup Required**

To complete Phase 2 and make the app production-ready for customers, you will need to create the following accounts and gather the corresponding credentials:

### 1. Firebase (Push Notifications)
- **Account:** Create a project at [Firebase Console](https://console.firebase.google.com/).
- **Required for Mobile:** Register the Android and iOS apps in the Firebase console. Download the `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) files.
- **Required for Backend:** Generate a **Firebase Admin SDK Service Account JSON** file from Project Settings > Service Accounts. This is required for the NestJS API to push messages to devices.

### 2. WhatsApp Cloud API (Messaging)
- **Account:** Create a [Meta for Developers](https://developers.facebook.com/) account and create an app with the "WhatsApp" product enabled.
- **Required Credentials:**
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - **Permanent Access Token** (generated via a System User in Meta Business Settings).
- **Template Approval:** You will need to submit WhatsApp message templates (e.g., for OTPs and shift reminders) to Meta for approval before the API can send them.

### 3. Cloud Infrastructure & Domains (Already Provisioned)
- **OCI Server, PostgreSQL & Redis:** You mentioned these are already set up on OCI. Great! We will use the existing Redis instance for Bull Queues and caching.
- **Domain Subdomains:** Configure DNS records to point the following subdomains to your OCI server IP:
  - `admin.pingforce.in` (For the Angular Portal)
  - `admin-api.pingforce.in` (For the NestJS Backend)
- **Storage (MinIO):** *To answer your question about MinIO:* MinIO is excellent for production! I initially suggested an alternative because some teams prefer managed storage (to avoid managing hard drives), but if you are comfortable running MinIO on your OCI server with a Docker volume, you **do not** need an alternative. We will stick with MinIO.

### 4. App Store Accounts
- **Google Play Console:** Required to generate a production Keystore for Android and upload the AAB file.
- *(Note: Apple Developer Program is skipped for now per your request. The app will be Android-only initially).*

---

## Phase 3: Scalability & Robustness Enhancements
**Status: ⚠️ Setup Required (Later)**

### 1. Production Database & Redis
- **Managed PostgreSQL (Optional but highly recommended):** Moving off local Docker PostgreSQL to a managed cloud database (e.g., AWS RDS, OCI Postgres) for automated backups and read replicas.
- **Managed Redis:** A production Redis instance with `maxmemory-policy` configured to `allkeys-lru`.

### 2. Observability (Optional)
- **Self-Hosted Grafana:** *To answer your question about Grafana/Datadog:* You do **not** need to pay for a SaaS account. Since you have an OCI server, we can simply run the open-source, free version of Prometheus & Grafana in a Docker container alongside your API. This will give you free dashboards for API health without external subscriptions.

---

## Next Action Checklist for You
If you want to unblock Phase 2 in the future, you can start gathering these items:
- [ ] Create Firebase Project & download Admin SDK JSON
- [ ] Setup Meta Developer Account for WhatsApp Cloud API
- [ ] Purchase/Configure Cloud Server (VM)
- [ ] Prepare Google Play / Apple Developer accounts

**For now, we have everything we need to start Phase 1.**

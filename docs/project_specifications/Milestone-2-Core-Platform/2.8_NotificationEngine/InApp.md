# InApp.md

# Enterprise Workforce Platform
## Core Platform – Notifications Module
### In-App Notification Specification

**Module:** Core Platform → Notifications
**Document:** InApp
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The In-App Notification module provides real-time, persistent notifications within the Enterprise Workforce Platform. Unlike email or push notifications, in-app notifications remain available until viewed or dismissed, enabling users to track operational events, approvals, alerts, reminders and system activities.

The module supports Angular web, Flutter mobile, customer portals and future desktop applications.

---

# 2. Objectives

The subsystem shall:

- Deliver real-time notifications.
- Maintain persistent notification history.
- Support tenant-aware branding.
- Integrate with all business modules.
- Respect user preferences.
- Support read/unread state.
- Support actionable notifications.
- Maintain complete audit history.

---

# 3. Architecture

Business Event
→ Event Bus
→ Notification Engine
→ Rules Engine
→ Template Engine
→ In-App Queue
→ Notification Store
→ WebSocket/SSE
→ Angular / Flutter Client
→ Audit Logs

---

# 4. Supported Recipients

- Employees
- Field Staff
- Managers
- Employer Representatives
- Customer Users
- Tenant Administrators
- Super Administrators

---

# 5. Notification Categories

- Authentication
- Attendance
- GPS & Geofencing
- Leave Management
- Workflow Approvals
- Fault Management
- Lead Management
- Tasks
- Reports
- Security Alerts
- System Announcements
- Maintenance
- Billing (Future)

---

# 6. Notification Types

- Information
- Success
- Warning
- Error
- Critical
- Reminder
- Approval Request
- Assignment
- Escalation

---

# 7. Notification Structure

Each notification contains:

- notification_id
- tenant_id
- recipient_user_id
- title
- message
- category
- priority
- icon
- image_url
- deep_link
- action_buttons
- metadata
- read_status
- archived_status
- created_at
- expires_at

---

# 8. Delivery Modes

- Instant
- Scheduled
- Delayed
- Recurring
- Event Triggered

---

# 9. User Actions

Users can:

- Mark as Read
- Mark All as Read
- Archive
- Delete (logical)
- Snooze
- Open Linked Screen
- Approve/Reject (workflow)
- Save for Later

---

# 10. Real-Time Delivery

Supported technologies:

- WebSocket
- Server-Sent Events (SSE)
- Long Polling (fallback)

Automatic synchronization across devices.

---

# 11. Notification Center

Features:

- Read/Unread Tabs
- Category Filters
- Search
- Date Filters
- Priority Filters
- Infinite Scroll
- Bulk Actions

---

# 12. User Preferences

Configurable:

- Enable/Disable Categories
- Sound
- Desktop Alerts
- Badge Count
- Quiet Hours
- Auto Archive
- Language

Critical security alerts cannot be disabled.

---

# 13. Branding

Notifications inherit:

- Tenant Theme
- Brand Colors
- Icons
- Typography
- Deep Links

Integrated with WhiteLabel.md and Branding.md.

---

# 14. Security

Mandatory:

- Tenant isolation
- RBAC authorization
- Data Scope filtering
- Secure WebSocket authentication
- Audit logging
- XSS-safe rendering

---

# 15. Suggested Database Design

Tables:

- inapp_notifications
- inapp_preferences
- notification_actions
- notification_archive
- notification_delivery

Indexes:

- tenant_id
- recipient_user_id
- category
- priority
- read_status
- created_at

---

# 16. REST APIs

GET    /api/v1/inapp

GET    /api/v1/inapp/{id}

POST   /api/v1/inapp/send

POST   /api/v1/inapp/broadcast

PUT    /api/v1/inapp/{id}/read

PUT    /api/v1/inapp/read-all

PUT    /api/v1/inapp/{id}/archive

DELETE /api/v1/inapp/{id}

GET    /api/v1/inapp/preferences

PUT    /api/v1/inapp/preferences

---

# 17. Reports

- Notification Volume
- Read Rate
- Response Time
- Category Distribution
- User Engagement
- Pending Notifications
- Archived Notifications

---

# 18. Audit Events

- Notification Created
- Notification Delivered
- Notification Read
- Notification Archived
- Notification Deleted
- Preference Updated

---

# 19. Error Codes

INAPP-001 Notification Not Found

INAPP-002 Unauthorized Access

INAPP-003 Delivery Failed

INAPP-004 Invalid Recipient

INAPP-005 Notification Expired

INAPP-006 Invalid Action

---

# 20. Performance Targets

Notification creation: <50 ms

Real-time delivery: <1 second

Read update: <20 ms

Notification center load: <250 ms

---

# 21. Testing Strategy

Functional

- Real-time delivery
- Read/unread state
- Deep links
- User actions
- Preferences

Security

- Cross-tenant isolation
- Unauthorized access
- XSS validation
- WebSocket authentication

Performance

- High notification volume
- Concurrent users
- Multi-device synchronization

---

# 22. Future Enhancements

- Rich cards
- AI prioritization
- Interactive widgets
- Notification threads
- Voice notifications
- Smart summaries

---

# 23. Acceptance Criteria

- Real-time notifications operational.
- Read state synchronized.
- Preferences respected.
- Tenant isolation enforced.
- Audit trail complete.
- Automated tests passing.

---

# 24. Dependencies

- Notifications.md
- Push.md
- Email.md
- WhatsApp.md
- Branding.md
- WhiteLabel.md
- Authentication.md
- RBAC.md
- AuditLogs.md

---

# 25. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative In-App Notification specification for the Enterprise Workforce Platform Notifications module.

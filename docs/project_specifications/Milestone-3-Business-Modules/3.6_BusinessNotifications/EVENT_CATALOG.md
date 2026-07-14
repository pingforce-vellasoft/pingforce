# EVENT_CATALOG.md

# Business Notifications Module

## Enterprise Multi-Tenant Workforce Management SaaS Platform

**Version:** 2.0 Enterprise\
**Status:** Production Ready

---

# 1. Purpose

The Event Catalog defines every business event capable of generating
notifications within the Enterprise Workforce Management SaaS Platform.
It serves as the authoritative reference for event publishers,
notification routing, workflow automation, integrations, analytics, and
auditing.

---

# 2. Event Lifecycle

Every event follows the same lifecycle:

1.  Business Action Occurs
2.  Event Published
3.  Event Validation
4.  Tenant Resolution
5.  RBAC & Recipient Resolution
6.  Notification Rule Evaluation
7.  Template Resolution
8.  Channel Selection
9.  Queue Processing
10. Delivery
11. Read Tracking
12. Audit Logging
13. Analytics Update

---

# 3. Event Classification

Category Description

---

Authentication Login, logout, password, MFA
Attendance Check-in/out, shifts, leave
GPS Location, geofence, travel
Fault Ticket lifecycle
Lead CRM lifecycle
Workflow Workflow transitions
Approval Approval lifecycle
User User management
Subscription Licensing & plans
Security Risk and policy events
System Platform operations
Reports Scheduled reports
Broadcast Mass communications

---

# 4. Authentication Events

Event Code Event Name Default Priority Default Channels

---

AUTH.LOGIN.SUCCESS Successful Login Low In-App
AUTH.LOGIN.FAILURE Failed Login High Push, Email
AUTH.LOGOUT User Logout Low Audit Only
AUTH.PASSWORD.RESET Password Reset High Email, Push
AUTH.MFA.ENABLED MFA Enabled Medium Email

---

# 5. Attendance Events

- ATT.CHECKIN.SUCCESS
- ATT.CHECKOUT.SUCCESS
- ATT.LATE.CHECKIN
- ATT.MISSED.CHECKOUT
- ATT.LEAVE.REQUESTED
- ATT.LEAVE.APPROVED
- ATT.LEAVE.REJECTED
- ATT.SHIFT.ASSIGNED
- ATT.OVERTIME.APPROVED

Default recipients: Employee, Manager, HR (configurable).

---

# 6. GPS Events

- GPS.GEOFENCE.ENTER
- GPS.GEOFENCE.EXIT
- GPS.LOCATION.DISABLED
- GPS.TRACKING.STARTED
- GPS.TRACKING.STOPPED
- GPS.ROUTE.COMPLETED
- GPS.DEVICE.OFFLINE

---

# 7. Fault Management Events

- FAULT.CREATED
- FAULT.ASSIGNED
- FAULT.REASSIGNED
- FAULT.IN_PROGRESS
- FAULT.ON_HOLD
- FAULT.ESCALATED
- FAULT.RESOLVED
- FAULT.CLOSED
- FAULT.REOPENED
- FAULT.SLA.WARNING
- FAULT.SLA.BREACHED

---

# 8. Lead Management Events

- LEAD.CREATED
- LEAD.IMPORTED
- LEAD.ASSIGNED
- LEAD.FOLLOWUP.DUE
- LEAD.STATUS.CHANGED
- LEAD.CONVERTED
- LEAD.LOST

---

# 9. Workflow Events

- WF.STARTED
- WF.STEP.COMPLETED
- WF.APPROVAL.REQUESTED
- WF.APPROVAL.APPROVED
- WF.APPROVAL.REJECTED
- WF.ESCALATED
- WF.COMPLETED
- WF.CANCELLED

---

# 10. User Events

- USER.CREATED
- USER.UPDATED
- USER.DEACTIVATED
- USER.REACTIVATED
- USER.ROLE.CHANGED
- USER.PASSWORD.EXPIRED

---

# 11. Subscription Events

- SUB.TRIAL.EXPIRING
- SUB.RENEWED
- SUB.PAYMENT.FAILED
- SUB.LICENSE.EXPIRED
- SUB.SEAT.LIMIT.REACHED

---

# 12. Security Events

- SEC.SUSPICIOUS.LOGIN
- SEC.MULTIPLE.LOGIN.FAILURES
- SEC.ACCOUNT.LOCKED
- SEC.PERMISSION.CHANGED
- SEC.API.KEY.REGENERATED

---

# 13. System Events

- SYS.BACKUP.COMPLETED
- SYS.BACKUP.FAILED
- SYS.SERVICE.DOWN
- SYS.SERVICE.RESTORED
- SYS.MAINTENANCE.START
- SYS.MAINTENANCE.END

---

# 14. Broadcast Events

- BRD.PLATFORM.ANNOUNCEMENT
- BRD.TENANT.ANNOUNCEMENT
- BRD.TEAM.ANNOUNCEMENT
- BRD.EMERGENCY.MESSAGE

---

# 15. Event Payload Standard

Every event shall include:

- Event ID
- Event Code
- Event Timestamp
- Tenant ID
- Organization ID
- User ID
- Source Module
- Priority
- Correlation ID
- Payload
- Metadata

---

# 16. Event Routing Rules

Routing decisions consider:

- Tenant configuration
- User preferences
- RBAC permissions
- Workflow state
- Channel availability
- Priority
- Quiet hours
- Business rules

---

# 17. Event Priority Matrix

Priority Description

---

Critical Immediate delivery
High Urgent operational
Medium Standard workflow
Low Informational

---

# 18. Event Audit

Every event shall record:

- Publisher
- Processing time
- Delivery attempts
- Recipient count
- Channel used
- Read status
- Failure reason
- Retry history

---

# 19. Future Events

- AI recommendations
- Predictive reminders
- ML anomaly detection
- Voice notification events
- Microsoft Teams events
- Slack events

---

# 20. Version History

Version Description

---

1.0 Initial Event Catalog
2.0 Enterprise Multi-Tenant Event Catalog

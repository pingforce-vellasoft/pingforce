# TICKET_LIFECYCLE.md

# Fault Management - Ticket Lifecycle Specification

**Platform:** Enterprise Multi-Tenant Workforce Management SaaS Platform
**Module:** Fault Management
**Document:** Ticket Lifecycle
**Version:** 1.0

---

# 1. Purpose

This document defines the complete lifecycle of a fault (ticket) from creation through closure. The lifecycle is configurable per tenant through the Workflow Engine while enforcing RBAC, SLA policies, audit logging, notifications, and tenant-specific business rules.

---

# 2. Lifecycle Objectives

- Standardize fault processing
- Enable configurable workflows
- Track SLA compliance
- Maintain complete audit history
- Support mobile/offline execution
- Ensure secure, role-based processing

---

# 3. Default Lifecycle

```
Draft
  │
  ▼
New
  │
  ▼
Assigned
  │
  ▼
Accepted
  │
  ▼
In Progress
 ├──────────────► On Hold
 │                     │
 │                     ▼
 ├──────────────► Waiting for Customer
 │                     │
 │                     ▼
 ├──────────────► Waiting for Parts
 │                     │
 │                     ▼
 ├──────────────► Vendor Support
 │                     │
 └─────────────────────┘
           │
           ▼
Testing / Verification
           │
           ▼
Resolved
           │
           ▼
Customer Confirmation
      ├────────────► Reopened
      │                 │
      └─────────────────┘
           │
           ▼
Closed
```

---

# 4. Lifecycle States

## Draft

Purpose:

- Ticket being prepared.

Allowed Roles:

- Manager
- Employer
- Customer (optional)

Actions:

- Save
- Edit
- Delete
- Submit

Exit:

- Submit

---

## New

Ticket officially created.

System Actions:

- Generate ticket number
- Start response SLA
- Create audit record
- Trigger notifications

Allowed Actions:

- Assign
- Cancel

---

## Assigned

Purpose:

- Allocate responsible technician/team.

Entry:

- Manual assignment
- Auto assignment

System:

- Notify assignee
- Record assignment history

---

## Accepted

Purpose:

- Technician accepts responsibility.

Actions:

- Navigate
- Check-in
- Start work
- Reject (if permitted)

Business Rules:

- Acceptance timestamp stored
- SLA updated

---

## In Progress

Purpose:

- Active execution.

Supported Operations:

- Work logs
- Images
- Videos
- Notes
- Parts usage
- GPS updates
- Offline capture

---

## On Hold

Reasons:

- Awaiting approval
- Site inaccessible
- Customer unavailable
- Weather
- Safety issue

Business Rules:

- Pause SLA (configurable)
- Mandatory reason

---

## Waiting for Customer

Examples:

- Customer response pending
- Appointment confirmation
- Access pending

Optional SLA pause.

---

## Waiting for Parts

Purpose:

- Await inventory/vendor.

Business Rules:

- Pause SLA if configured
- Procurement reference optional

---

## Vendor Support

Purpose:

- External vendor engagement.

Actions:

- Vendor assignment
- Progress tracking
- Attachment sharing

---

## Testing / Verification

Purpose:

- Validate completed work.

Performed By:

- Technician
- QA
- Manager
- Customer (optional)

Checks:

- Photos
- Measurements
- Sign-off
- Validation checklist

---

## Resolved

Mandatory:

- Resolution notes
- Resolution code
- Completion time

Optional:

- Customer signature
- OTP
- Feedback request

---

## Customer Confirmation

Customer may:

- Accept
- Reject
- Request reopen

Configurable timeout can auto-close tickets.

---

## Reopened

Reasons:

- Issue persists
- Incorrect resolution
- Failed verification

Effects:

- Restart workflow
- Preserve history
- Update KPIs

---

## Closed

Final State.

Business Rules:

- Read-only by default
- Immutable history
- Final SLA calculation
- Analytics updated

---

# 5. State Transition Matrix

| From                  | To                                                                            |
| --------------------- | ----------------------------------------------------------------------------- |
| Draft                 | New                                                                           |
| New                   | Assigned / Cancelled                                                          |
| Assigned              | Accepted / Reassigned                                                         |
| Accepted              | In Progress                                                                   |
| In Progress           | On Hold / Waiting for Customer / Waiting for Parts / Vendor Support / Testing |
| On Hold               | In Progress                                                                   |
| Waiting for Customer  | In Progress                                                                   |
| Waiting for Parts     | In Progress                                                                   |
| Vendor Support        | In Progress                                                                   |
| Testing               | Resolved                                                                      |
| Resolved              | Customer Confirmation                                                         |
| Customer Confirmation | Closed / Reopened                                                             |
| Reopened              | Assigned / In Progress                                                        |

---

# 6. SLA Behavior

Response SLA:

- Starts at New.

Resolution SLA:

- Starts after assignment (configurable).

Pause States:

- On Hold
- Waiting for Customer
- Waiting for Parts
- Vendor Support

Breach Actions:

- Notifications
- Escalation
- Dashboard alerts
- Audit entry

---

# 7. Notifications

Triggered on:

- Creation
- Assignment
- Acceptance
- Reassignment
- Hold
- Escalation
- Resolution
- Customer confirmation
- Closure
- Reopen

Channels:

- Push
- Email
- WhatsApp
- In-App

---

# 8. Audit Events

Every transition records:

- Ticket ID
- Previous state
- New state
- User
- Timestamp (UTC)
- Device
- GPS (if available)
- Comments

---

# 9. RBAC Rules

Permissions include:

- Create
- View
- Edit
- Assign
- Reassign
- Accept
- Resolve
- Verify
- Close
- Reopen
- Export

Row-level security applies.

---

# 10. Mobile Offline

Supported offline:

- Create ticket
- Update status
- Capture media
- GPS
- Work logs
- Signatures

Sync:

- Retry queue
- Conflict resolution
- Audit preservation

---

# 11. KPIs

- Average Response Time
- Average Resolution Time
- SLA Compliance
- Reopen Rate
- First-Time Fix Rate
- Technician Productivity
- Pending Tickets
- Escalation Count

---

# 12. Configurable Tenant Options

- Custom lifecycle states
- Custom transition rules
- Approval gates
- Mandatory fields
- SLA policy
- Auto-close timeout
- Notification templates
- Feature flags

---

# 13. Future Enhancements

- AI routing
- Predictive SLA breach detection
- IoT-triggered tickets
- Automated root-cause analysis
- Intelligent technician recommendation
- Dynamic workflow optimization

---

This lifecycle specification is designed for enterprise-scale, multi-tenant deployments and integrates with the platform's Workflow Engine, RBAC Engine, Notification Engine, Feature Flag Engine, White-Label Framework, Analytics Engine, and Offline Mobile Architecture.

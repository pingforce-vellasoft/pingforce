# STATE_MACHINE.md

# Attendance Module State Machine Specification

**Module:** Attendance
**Platform:** Enterprise Workforce Management SaaS Platform
**Version:** 1.0
**Status:** Production Ready

---

# 1. Purpose

This document defines the finite state machines governing the Attendance module. Every attendance transaction follows deterministic state transitions to ensure consistency, auditability, tenant-specific policy enforcement, and seamless integration with workflow, notification, reporting, payroll, and audit modules.

---

# 2. State Machine Principles

- One active attendance session per employee.
- Every transition is validated through RBAC and business rules.
- Every transition generates immutable audit logs.
- Invalid transitions are rejected.
- Tenant policies influence allowed transitions.
- Offline mode introduces temporary synchronization states.

---

# 3. Primary Attendance Lifecycle

INITIAL
→ AUTHENTICATED
→ READY_FOR_CHECKIN
→ CHECKING_IN
→ CHECKED_IN
→ WORKING
→ ON_BREAK
→ WORKING
→ CHECKING_OUT
→ CHECKED_OUT
→ ATTENDANCE_FINALIZED
→ ARCHIVED

---

# 4. State Definitions

## INITIAL

User has not started attendance.

Allowed Events

- Login

Next State

- AUTHENTICATED

---

## AUTHENTICATED

Preconditions

- Valid JWT
- Tenant resolved
- Device validated

Allowed Events

- Open Attendance Screen
- Logout

Next States

- READY_FOR_CHECKIN
- INITIAL

---

## READY_FOR_CHECKIN

System validates:

- Shift
- Attendance window
- GPS
- Geofence
- Biometric
- Permissions

Success:
CHECKING_IN

Failure:
VALIDATION_FAILED

---

## CHECKING_IN

Processing

- Capture timestamp
- Capture GPS
- Store device
- Apply attendance policy

Success:
CHECKED_IN

Failure:
CHECKIN_FAILED

---

## CHECKED_IN

Attendance session created.

Allowed Events

- Start Work
- Break Start
- Checkout

Next

WORKING

---

## WORKING

Employee actively working.

Allowed

- Break
- Checkout
- Offline Sync
- GPS Updates

---

## ON_BREAK

Allowed

- Resume Work
- Checkout

Business Rules

- Break duration validated
- Paid/Unpaid policy applied

Next

WORKING

---

## CHECKING_OUT

Processing

- Capture checkout
- Validate session
- Calculate work hours
- Calculate overtime
- Calculate violations

Success

CHECKED_OUT

Failure

CHECKOUT_FAILED

---

## CHECKED_OUT

Attendance closed.

Processing

- Reports
- Notifications
- Payroll Integration
- Audit

Next

ATTENDANCE_FINALIZED

---

## ATTENDANCE_FINALIZED

Attendance becomes read-only.

Allowed

- Correction Request

---

## ARCHIVED

Historical attendance retained for reporting and compliance.

---

# 5. Validation States

READY_FOR_CHECKIN
→ VALIDATING_SHIFT
→ VALIDATING_GPS
→ VALIDATING_GEOFENCE
→ VALIDATING_BIOMETRIC
→ VALIDATING_POLICY
→ CHECKING_IN

Any failure transitions to VALIDATION_FAILED.

---

# 6. Offline State Machine

ONLINE
→ OFFLINE
→ LOCAL_SAVE
→ SYNC_PENDING
→ SYNC_IN_PROGRESS
→ SYNC_SUCCESS

Exception

SYNC_FAILED
→ RETRY_PENDING
→ SYNC_IN_PROGRESS

---

# 7. Attendance Correction State Machine

NONE
→ REQUESTED
→ UNDER_MANAGER_REVIEW
→ UNDER_HR_REVIEW
→ APPROVED
→ ATTENDANCE_UPDATED

Alternative

REQUESTED
→ REJECTED

---

# 8. Exception States

- VALIDATION_FAILED
- CHECKIN_FAILED
- CHECKOUT_FAILED
- GPS_FAILED
- GEOFENCE_FAILED
- BIOMETRIC_FAILED
- DUPLICATE_SESSION
- SHIFT_NOT_ALLOWED
- LICENSE_EXPIRED
- TOKEN_EXPIRED
- NETWORK_FAILURE
- DEVICE_NOT_REGISTERED

Each exception:
Notify User
→ Audit Log
→ Retry or Manual Resolution

---

# 9. GPS State Machine

GPS_DISABLED
→ GPS_ENABLED
→ LOCATION_CAPTURED
→ ACCURACY_VALIDATED
→ MOCK_LOCATION_CHECK
→ GEOFENCE_VALIDATED
→ LOCATION_APPROVED

Failure branches:
GPS_REJECTED
MOCK_LOCATION_DETECTED
OUTSIDE_GEOFENCE

---

# 10. Shift State Machine

UNASSIGNED
→ ASSIGNED
→ ACTIVE
→ GRACE_PERIOD
→ LATE
→ WORKING
→ COMPLETED

---

# 11. Notification State Machine

EVENT_CREATED
→ TEMPLATE_SELECTED
→ CHANNEL_SELECTED
→ QUEUED
→ SENT
→ DELIVERED

Failure

FAILED
→ RETRY

---

# 12. Audit State Machine

ACTION
→ VALIDATION
→ AUDIT_ENTRY_CREATED
→ STORED
→ IMMUTABLE

---

# 13. Integration States

Attendance interacts with:

- Authentication
- RBAC
- User Management
- Workflow Engine
- Notification Engine
- Leave Management
- Payroll
- Reporting
- Audit Framework
- Analytics

---

# 14. Terminal States

Successful

- ATTENDANCE_FINALIZED
- ARCHIVED

Failure

- VALIDATION_FAILED
- CHECKIN_FAILED
- CHECKOUT_FAILED
- SYNC_FAILED

---

# 15. Future State Machines

- Face Recognition Verification
- BLE Beacon Validation
- Wearable Attendance
- AI Fraud Detection
- Predictive Attendance Risk
- Payroll Settlement

---

End of State Machine Specification

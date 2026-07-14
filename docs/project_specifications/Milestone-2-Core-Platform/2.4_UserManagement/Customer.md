# Customer.md

# Enterprise Workforce Platform
## Core Platform – User Management Module
### Customer Domain Specification

**Module:** Core Platform → User Management  
**Document:** Customer  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design  
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Customer entity represents an organization or individual receiving services from a tenant using the Enterprise Workforce Platform.

Customers are business entities that may interact with field staff, support teams, sales teams, fault management, CRM, invoicing, projects and self-service portals.

A Customer may optionally have one or more Customer Users with authenticated access.

---

# 2. Objectives

The Customer subsystem shall:

- Maintain a centralized customer master.
- Support B2B and B2C customers.
- Support multiple contacts and locations.
- Support customer portals.
- Integrate with Fault Management, Leads, Attendance visits and Reporting.
- Maintain customer lifecycle history.
- Preserve tenant isolation.

---

# 3. Relationship Model

Platform
→ Tenant
→ Company
→ Customer
    ├── Customer Contacts
    ├── Customer Locations
    ├── Customer Users
    ├── Fault Tickets
    ├── Leads
    ├── Assets
    └── Contracts (future)

---

# 4. Customer Types

Supported types:

- Enterprise
- SME
- Government
- Educational Institution
- Healthcare
- ISP Subscriber
- Retail Customer
- Residential Customer
- Distributor
- Channel Partner
- Franchise
- Individual Consumer

---

# 5. Customer Profile

Mandatory fields:

- customer_id (UUID)
- tenant_id
- company_id
- customer_code
- legal_name
- display_name
- customer_type
- status
- primary_email
- primary_mobile
- created_at
- updated_at

Optional:

- GST/VAT
- registration_number
- website
- industry
- account_manager_id
- parent_customer_id
- notes
- metadata

Customer codes are immutable within a tenant.

---

# 6. Customer Lifecycle

Prospect
→ Qualified
→ Active
→ Suspended
→ Inactive
→ Archived

Historical records are retained permanently.

---

# 7. Customer Contacts

Multiple contacts supported:

- Primary Contact
- Technical Contact
- Billing Contact
- Accounts Contact
- Operations Contact
- Escalation Contact

Each stores:

- Name
- Designation
- Email
- Mobile
- Alternate Phone

---

# 8. Customer Locations

Supported location types:

- Headquarters
- Branch Office
- Billing Address
- Installation Site
- Service Location
- Warehouse

Each location stores address, GPS coordinates, timezone and service availability.

---

# 9. Customer Users

Customer users may authenticate into the portal.

Capabilities may include:

- View service requests
- Create fault tickets
- Track ticket status
- View invoices (future)
- View assigned assets
- Download reports
- Update profile

Customer users receive RBAC roles independent of internal employees.

---

# 10. Operational Integration

Fault Management

- Raise tickets
- View ticket status
- SLA monitoring

Lead Management

- Lead conversion
- Customer onboarding
- Opportunity ownership

Field Operations

- Site visits
- Installation
- Maintenance
- GPS visit validation

Reporting

- Customer KPIs
- SLA compliance
- Service history

---

# 11. Business Rules

- Customer code unique per tenant.
- One primary contact required.
- Archived customers are read-only.
- Logical deletion only.
- Customer users belong to one customer.
- Cross-tenant customer access prohibited.

---

# 12. Database Design

Suggested tables:

customers
customer_contacts
customer_locations
customer_users
customer_history

Indexes:

- tenant_id
- customer_code
- company_id
- status
- account_manager_id

---

# 13. REST APIs

GET    /api/v1/customers

GET    /api/v1/customers/{id}

POST   /api/v1/customers

PUT    /api/v1/customers/{id}

PATCH  /api/v1/customers/{id}/status

GET    /api/v1/customers/{id}/contacts

GET    /api/v1/customers/{id}/locations

GET    /api/v1/customers/{id}/tickets

---

# 14. Reporting

Standard reports:

- Customer Directory
- Active Customers
- Customer Growth
- Customer Distribution
- Fault Volume
- SLA Compliance
- Site Visit Summary
- Account Manager Performance

---

# 15. Security

Mandatory:

- Tenant isolation
- RBAC authorization
- Data Scope enforcement
- Customer portal isolation
- Audit logging
- Encryption of sensitive customer information

---

# 16. Audit Events

- Customer Created
- Customer Updated
- Customer Activated
- Customer Suspended
- Contact Added
- Contact Updated
- Customer User Created
- Customer User Disabled

---

# 17. Error Codes

CUST-001 Customer Not Found

CUST-002 Duplicate Customer Code

CUST-003 Invalid Customer Type

CUST-004 Customer Archived

CUST-005 Unauthorized Access

CUST-006 Duplicate Contact

---

# 18. Performance Targets

Customer lookup: <20 ms

Directory search: <250 ms

Portal login context: <100 ms

Customer dashboard: <300 ms

---

# 19. Testing Strategy

Functional

- CRUD
- Contacts
- Locations
- Customer users
- Portal access

Security

- Cross-tenant access
- Customer portal isolation
- Unauthorized API access
- Data Scope validation

Performance

- Large customer catalogs
- Concurrent portal users
- Bulk imports

---

# 20. Future Enhancements

- Contract management
- Subscription management
- Billing integration
- Customer satisfaction surveys
- Knowledge base
- AI customer assistant
- Customer health score

---

# 21. Acceptance Criteria

- Customer lifecycle implemented.
- Customer portal supported.
- Contacts and locations managed.
- Tenant isolation enforced.
- Audit trail complete.
- Automated tests passing.

---

# 22. Dependencies

- Users.md
- RBAC.md
- DataScope.md
- MultiTenant.md
- Company.md
- Fault Management
- Lead Management
- Workflow
- Reporting

---

# 23. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- BUSINESS_RULES.md
- PROJECT_VISION.md
- PRD.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative Customer domain specification for the Enterprise Workforce Platform User Management module.

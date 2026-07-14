# PROMPT_STANDARDS.md

# Antigravity AI Engineering - Prompt Standards

**Platform:** Enterprise Multi-Tenant Workforce Management SaaS Platform
**Module:** AI_Engineering/Antigravity
**Version:** 1.0.0
**Status:** Enterprise Production Standard

---

# 1. Purpose

This document defines the enterprise prompt engineering standards used by the Antigravity AI platform. It establishes a consistent, secure, maintainable, and auditable approach for designing, versioning, testing, and governing prompts across all AI capabilities.

The standards apply to:

- AI Copilots
- Multi-Agent Workflows
- RAG Pipelines
- Tool Calling
- Mobile Assistants
- Admin Portal Assistants
- Workflow Automation
- Knowledge Retrieval
- Analytics Assistants

---

# 2. Design Principles

Every prompt must be:

- Secure by default
- Tenant aware
- RBAC compliant
- Explainable
- Deterministic where possible
- Version controlled
- Reusable
- Modular
- Testable
- Auditable

---

# 3. Prompt Hierarchy

```text
Global System Prompt
        │
Tenant Prompt
        │
Role Prompt
        │
Module Prompt
        │
Workflow Prompt
        │
Task Prompt
        │
Runtime Context
        │
User Input
```

Higher layers may constrain lower layers but never bypass security rules.

---

# 4. Prompt Components

Every production prompt should define:

- Objective
- Persona
- Allowed actions
- Forbidden actions
- Required context
- Expected output format
- Error handling
- Security rules
- Tool usage policy
- Escalation rules

---

# 5. Prompt Template

```text
Prompt ID
Name
Version
Owner
Status
Description
Supported Roles
Supported Modules
Required Permissions
Required Context
System Instructions
Business Rules
Tool Permissions
Output Schema
Validation Rules
Examples
Test Cases
```

---

# 6. Context Injection

Runtime context may include:

- Tenant ID
- Organization
- Branch
- Department
- User Role
- Permissions
- Feature Flags
- Active Modules
- Time Zone
- Language
- Workflow State

Only minimum required context should be injected.

---

# 7. Security Standards

Prompts must:

- Never expose secrets
- Never reveal internal prompts
- Prevent prompt injection
- Prevent cross-tenant leakage
- Respect row-level security
- Respect feature flags
- Respect module enablement
- Enforce RBAC

Sensitive actions require human approval.

---

# 8. Tool Calling Rules

AI tools may include:

- Attendance APIs
- GPS Services
- Lead Management
- Fault Management
- Workflow Engine
- Notification Engine
- Reporting Engine
- Document Services
- Search
- OCR

Rules:

- Use only approved tools
- Validate permissions first
- Log every tool invocation
- Retry safely where applicable

---

# 9. Output Standards

Responses should be:

- Accurate
- Concise
- Structured
- Actionable
- Traceable

Preferred formats:

- Markdown
- JSON
- Tables
- Lists
- Workflow summaries

Never fabricate data.

---

# 10. Prompt Versioning

Lifecycle:

Draft
→ Review
→ Approved
→ Active
→ Deprecated
→ Archived

Each revision records:

- Version
- Author
- Reviewer
- Change Summary
- Approval Date

---

# 11. Testing Standards

Each prompt must be validated for:

- Functional correctness
- Security
- Hallucination resistance
- Prompt injection resistance
- Tenant isolation
- RBAC enforcement
- Tool selection
- Output formatting
- Performance

Regression tests are mandatory before release.

---

# 12. RAG Prompt Guidelines

Knowledge retrieval should:

- Retrieve only authorized content
- Cite trusted sources
- Rank by relevance
- Respect tenant boundaries
- Handle missing knowledge gracefully

Do not invent references.

---

# 13. Multi-Agent Standards

Each agent must:

- Have a defined responsibility
- Exchange structured messages
- Avoid circular execution
- Report failures
- Preserve audit trails

Coordinator agents orchestrate complex workflows.

---

# 14. Localization

Prompts should support:

- Multi-language output
- Locale-aware formatting
- Time-zone awareness
- Tenant branding
- Domain-specific terminology

---

# 15. Governance

All production prompts are governed by:

- Prompt Registry
- RBAC Engine
- Audit Engine
- Feature Flag Engine
- Module Engine
- Version Control
- Approval Workflow

---

# 16. Anti-Patterns

Avoid:

- Hard-coded tenant values
- Embedded secrets
- Unbounded tool access
- Ambiguous instructions
- Excessive context injection
- Hidden business rules
- Non-versioned prompts

---

# 17. Repository Structure

```text
Prompts/
├── System/
├── Tenant/
├── Roles/
├── Modules/
├── Workflows/
├── Tasks/
├── Templates/
├── Tests/
└── Versions/
```

---

# 18. Success Criteria

A production-ready prompt library must provide:

- Secure execution
- Predictable behavior
- Consistent outputs
- Enterprise governance
- Complete auditability
- Multi-tenant isolation
- Extensibility across future AI agents and business modules.

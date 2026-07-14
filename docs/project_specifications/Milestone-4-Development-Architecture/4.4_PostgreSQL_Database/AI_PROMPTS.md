# AI_PROMPTS.md

> **Document Type:** Enterprise AI Prompt Engineering Specification
> **Purpose:** Define the standard AI prompts, governance, and usage
> patterns that shall be implemented for AI-assisted development,
> database engineering, documentation, quality assurance, and operations
> for the Enterprise Multi-Tenant Workforce Management SaaS Platform.

---

# 1. Vision

Artificial Intelligence shall be used as an engineering accelerator
while maintaining human review, architectural governance, security, and
coding standards.

AI-generated outputs shall be treated as draft engineering artifacts
until validated through reviews, testing, and architectural approval.

---

# 2. Objectives

The AI prompt framework shall:

- Standardize AI-assisted development
- Improve engineering productivity
- Produce consistent documentation
- Accelerate schema design
- Assist migration planning
- Improve SQL quality
- Support testing automation
- Maintain enterprise standards

---

# 3. Guiding Principles

All prompts shall:

- Produce deterministic outputs where possible
- Preserve tenant isolation concepts
- Follow PostgreSQL best practices
- Align with Prisma conventions
- Avoid destructive recommendations
- Require human review before implementation
- Prefer secure-by-default solutions

---

# 4. AI Usage Areas

AI shall support:

- Database architecture
- Schema design
- Table design
- Relationship modeling
- Index recommendations
- Query optimization
- Migration planning
- Backup strategy
- Security reviews
- Documentation generation
- Test case generation
- Performance analysis

---

# 5. Standard System Prompt

AI assistants shall be instructed to behave as:

- Enterprise PostgreSQL Architect
- Database Performance Engineer
- Security Architect
- Multi-Tenant SaaS Specialist
- Prisma Expert
- Enterprise Documentation Specialist

Outputs shall be specification-oriented and implementation-ready.

---

# 6. Database Design Prompt

Prompt Objective:

Design PostgreSQL schemas following:

- Multi-tenancy
- UUID primary keys
- Audit columns
- Soft delete
- RBAC
- Workflow integration
- Notification integration
- Future scalability

Expected Output:

- Entity list
- Relationships
- Constraints
- Index recommendations
- Naming compliance

---

# 7. SQL Generation Prompt

Generated SQL shall:

- Use PostgreSQL syntax
- Avoid vendor lock-in where practical
- Follow naming standards
- Include constraints
- Include indexes
- Preserve tenant ownership
- Avoid destructive statements unless explicitly requested

---

# 8. Prisma Prompt

AI-generated Prisma models shall include:

- Proper model naming
- @map usage where appropriate
- Relations
- Indexes
- UUID identifiers
- Audit fields
- Soft delete support

---

# 9. Migration Prompt

Migration prompts shall request:

- Safe schema evolution
- Data preservation
- Roll-forward strategy
- Validation steps
- Rollback considerations
- Performance impact assessment

---

# 10. Query Optimization Prompt

AI shall evaluate:

- Execution plans
- Index usage
- Join strategy
- Filtering
- Pagination
- Partition pruning
- Query complexity

Recommendations shall prioritize measurable improvements.

---

# 11. Security Review Prompt

Security prompts shall verify:

- Tenant isolation
- RBAC compliance
- SQL injection prevention
- Encryption requirements
- Secret handling
- Least privilege
- Audit integration

---

# 12. Testing Prompt

AI-generated database tests shall cover:

- Constraints
- Relationships
- Transactions
- Migrations
- Multi-tenant isolation
- Performance
- Backup validation
- Security validation

---

# 13. Documentation Prompt

Generated documentation shall:

- Use specification language ("shall")
- Avoid implementation assumptions
- Remain technology consistent
- Follow enterprise formatting
- Include objectives, principles, validation, and summary

---

# 14. Code Review Prompt

AI reviews shall evaluate:

- Naming standards
- Schema consistency
- Referential integrity
- Performance
- Security
- Migration safety
- Maintainability

---

# 15. Anti-Patterns

AI prompts shall avoid requesting:

- Hard-coded credentials
- Cross-tenant access
- Unsafe DELETE statements
- Unreviewed raw SQL
- Vendor-specific assumptions without justification
- Production data exposure

---

# 16. Human Governance

Every AI-generated artifact shall undergo:

- Architecture review
- Security review
- Functional validation
- Performance validation
- Documentation review
- Approval before implementation

AI shall augment---not replace---engineering decisions.

---

# 17. Prompt Library

Standard reusable prompt categories shall include:

- Architecture Design
- Schema Design
- ER Modeling
- SQL Generation
- Prisma Generation
- Migration Planning
- Index Optimization
- Performance Review
- Security Review
- Test Generation
- Documentation
- Troubleshooting

---

# 18. Future Readiness

Prompt templates shall remain compatible with:

- AI coding assistants
- Agentic workflows
- CI/CD quality gates
- Automated documentation
- Enterprise knowledge bases
- Future LLM providers

---

# 19. Validation Checklist

Every AI-generated output shall be reviewed for:

- Accuracy
- Security
- Tenant awareness
- Naming compliance
- Performance
- Completeness
- Maintainability
- Architectural consistency

---

# Summary

This document defines the enterprise AI prompt engineering standards
that shall be implemented for PostgreSQL engineering activities within
the Enterprise Multi-Tenant Workforce Management SaaS Platform. The
prompt framework shall promote consistent, secure, maintainable, and
architecture-aligned AI assistance while ensuring that all generated
artifacts remain subject to engineering governance, validation, and
approval before implementation.

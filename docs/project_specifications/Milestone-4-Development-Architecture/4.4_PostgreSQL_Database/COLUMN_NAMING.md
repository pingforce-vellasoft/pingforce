# COLUMN_NAMING.md

> **Document Type:** Enterprise PostgreSQL Column Naming Standards\
> **Purpose:** Define the mandatory column naming conventions that shall
> be followed across all PostgreSQL schemas for the Enterprise
> Multi-Tenant Workforce Management SaaS Platform.

---

# 1. Objectives

The column naming standards shall:

- Establish a consistent naming convention across every schema.
- Improve readability and maintainability.
- Reduce ambiguity in SQL queries and APIs.
- Align database, backend, and frontend models.
- Support long-term scalability and enterprise governance.

---

# 2. General Naming Principles

All column names shall:

- Use lowercase letters only.
- Use snake_case formatting.
- Be descriptive and self-explanatory.
- Represent a single business concept.
- Avoid abbreviations unless industry standard.
- Avoid SQL reserved keywords.
- Remain stable after public release.

## Examples

Preferred Avoid

---

first_name fname
created_at crt_dt
tenant_id tid
notification_status ns

---

# 3. Identifier Columns

Primary identifiers shall follow a consistent pattern.

Examples:

- id
- tenant_id
- organization_id
- employee_id
- manager_id
- customer_id
- workflow_id
- notification_id

Foreign keys shall always end with `_id`.

---

# 4. Audit Columns

Every business entity shall include the following audit fields where
applicable:

- created_at
- created_by
- updated_at
- updated_by
- deleted_at
- deleted_by
- is_deleted

These names shall remain consistent across all schemas.

---

# 5. Timestamp Columns

All timestamp columns shall:

- End with `_at`
- Use UTC storage
- Use TIMESTAMPTZ datatype

Examples:

- created_at
- updated_at
- approved_at
- completed_at
- expires_at
- last_login_at
- synced_at

---

# 6. Boolean Columns

Boolean columns shall clearly indicate true/false behavior.

Preferred prefixes:

- is\_
- has\_
- can\_
- allow\_

Examples:

- is_active
- is_verified
- has_attachment
- can_approve
- allow_offline_access

---

# 7. Status Columns

Status fields shall clearly identify lifecycle state.

Examples:

- status
- approval_status
- attendance_status
- workflow_status
- notification_status

Enumerated values shall be documented separately.

---

# 8. Name Columns

Human-readable names shall follow descriptive patterns.

Examples:

- first_name
- last_name
- full_name
- display_name
- company_name
- team_name
- module_name

Avoid generic values such as `name` unless the context is obvious.

---

# 9. Code Columns

Business codes shall use `_code`.

Examples:

- tenant_code
- employee_code
- client_code
- module_code
- workflow_code

Codes shall be unique where business rules require.

---

# 10. Description Columns

Long-form descriptive text shall use:

- description
- notes
- comments
- remarks
- resolution_notes

---

# 11. Contact Information

Examples:

- email
- alternate_email
- phone_number
- mobile_number
- emergency_contact_number

Avoid ambiguous abbreviations.

---

# 12. Address Fields

Examples:

- address_line_1
- address_line_2
- city_id
- state_id
- country_id
- postal_code
- latitude
- longitude

---

# 13. File & Document Columns

Examples:

- file_name
- original_file_name
- file_extension
- mime_type
- file_size
- storage_path
- download_url
- checksum

---

# 14. Workflow Columns

Examples:

- current_step
- workflow_status
- assigned_to_id
- approved_by
- approval_level
- escalation_level

---

# 15. Notification Columns

Examples:

- channel
- template_id
- retry_count
- scheduled_at
- delivered_at
- failed_at
- notification_priority

---

# 16. Security Columns

Examples:

- password_hash
- refresh_token_hash
- api_key_hash
- encryption_key_reference
- last_password_change_at
- failed_login_attempts

Sensitive values shall never be stored in plaintext.

---

# 17. GPS Columns

Examples:

- latitude
- longitude
- accuracy
- altitude
- speed
- heading
- recorded_at

---

# 18. Financial Columns

Monetary values shall use descriptive names.

Examples:

- total_amount
- tax_amount
- discount_amount
- subscription_amount
- renewal_amount

Avoid generic column names such as `amount`.

---

# 19. Quantity Columns

Examples:

- quantity
- available_quantity
- allocated_quantity
- remaining_quantity

---

# 20. Versioning Columns

Examples:

- version
- schema_version
- data_version
- row_version

Optimistic concurrency may use version fields where appropriate.

---

# 21. Search & Index Columns

Examples:

- search_vector
- search_keywords
- normalized_name
- normalized_email

These fields shall support optimized querying.

---

# 22. Reserved Keywords

Column names shall not conflict with SQL keywords.

Avoid:

- user
- order
- group
- table
- column
- select

Use descriptive alternatives.

---

# 23. Naming Review Checklist

Each new column shall:

- Use lowercase.
- Use snake_case.
- Clearly describe its purpose.
- Avoid abbreviations.
- Avoid reserved words.
- Match enterprise standards.
- Be reusable across modules where appropriate.

---

# 24. Future Readiness

Column naming shall remain compatible with:

- Multi-tenant expansion
- White-label deployments
- Additional business modules
- Event sourcing
- CQRS
- Data warehouse integration
- AI analytics
- Cross-region deployments

---

# 25. Summary

These standards define the mandatory naming conventions for all
PostgreSQL columns within the Enterprise Multi-Tenant Workforce
Management SaaS Platform. Consistent column names shall improve
readability, maintainability, interoperability, API consistency,
reporting, and long-term scalability while providing a common language
across database, backend, frontend, and analytics components.

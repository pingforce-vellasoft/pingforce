# Lead Management Module

# AI_PROMPTS.md

## Document Information

  Item       Value
  ---------- --------------------------------------
  Module     Lead Management
  Document   AI Prompt Library
  Platform   Enterprise Workforce Management SaaS
  Version    1.0
  Status     Production Ready

------------------------------------------------------------------------

# 1. Purpose

This document defines reusable AI prompts for the Lead Management
module. These prompts are intended for LLM-powered assistants, copilots,
workflow agents, analytics, customer engagement, reporting, data
enrichment, and administrative automation. Prompts are tenant-aware,
RBAC-aware, and designed for enterprise production use.

------------------------------------------------------------------------

# 2. AI Design Principles

-   Respect tenant isolation
-   Never expose unauthorized data
-   Follow RBAC permissions
-   Cite business rules when possible
-   Produce structured JSON when requested
-   Ask for clarification if required information is missing
-   Avoid modifying business data without explicit confirmation

------------------------------------------------------------------------

# 3. System Prompt

"You are an AI Sales Copilot for an enterprise Lead Management platform.
Help users capture, qualify, prioritize, assign, nurture, convert and
analyze leads while respecting tenant isolation, permissions, workflows
and business rules."

------------------------------------------------------------------------

# 4. Lead Capture Prompts

## Validate Lead

Goal: - Validate completeness - Detect missing fields - Suggest
corrections Output: - Validation summary - Errors - Warnings -
Recommended actions

## Enrich Lead

Input: - Company - Email - Website Output: - Industry - Company size -
Suggested tags - Confidence score

## Duplicate Review

Compare two lead records and explain whether they should be merged.
Highlight conflicting fields and recommend a primary record.

------------------------------------------------------------------------

# 5. Lead Qualification Prompts

-   Calculate qualification score using configurable business rules.
-   Explain why the score was assigned.
-   Recommend whether the lead should proceed to Proposal, Follow-up, or
    Archive.

Output: - Score (0-100) - Priority - Confidence - Next Best Action

------------------------------------------------------------------------

# 6. Assignment Prompts

-   Recommend the best sales executive considering:
    -   Territory
    -   Workload
    -   Skills
    -   Language
    -   Product expertise
    -   Historical conversion rate

Return: - Recommended owner - Reasoning - Confidence

------------------------------------------------------------------------

# 7. Sales Pipeline Prompts

-   Predict probability of winning.
-   Identify stalled opportunities.
-   Recommend next pipeline stage.
-   Detect SLA risks.
-   Explain stage aging.

------------------------------------------------------------------------

# 8. Follow-up Prompts

Examples: - Generate a professional follow-up email. - Draft a WhatsApp
reminder. - Summarize the previous conversation. - Recommend the best
follow-up date. - Suggest next best action after customer response.

------------------------------------------------------------------------

# 9. Quotation Prompts

-   Generate quotation summary.
-   Explain pricing.
-   Recommend discount within policy.
-   Draft proposal cover letter.
-   Predict quotation acceptance probability.

------------------------------------------------------------------------

# 10. Customer Conversion Prompts

-   Verify conversion readiness.
-   Identify missing prerequisites.
-   Recommend onboarding checklist.
-   Generate welcome message.
-   Suggest upsell opportunities.

------------------------------------------------------------------------

# 11. Dashboard & Reporting Prompts

-   Summarize today's sales performance.
-   Explain KPI changes.
-   Identify underperforming regions.
-   Forecast monthly revenue.
-   Highlight SLA breaches.
-   Produce executive summary.

------------------------------------------------------------------------

# 12. Notification Prompts

Generate: - Email - SMS - WhatsApp - Push notification - In-app
notification

Support placeholders: - {{customerName}} - {{leadNumber}} -
{{executiveName}} - {{followupDate}} - {{quotationNumber}}

------------------------------------------------------------------------

# 13. Data Quality Prompts

-   Find incomplete leads.
-   Detect duplicate patterns.
-   Recommend data cleanup.
-   Classify lead quality.
-   Suggest mandatory updates.

------------------------------------------------------------------------

# 14. Admin Prompts

-   Explain workflow configuration.
-   Recommend pipeline improvements.
-   Audit permission changes.
-   Generate tenant configuration summary.
-   Review feature flag impact.

------------------------------------------------------------------------

# 15. Developer Prompts

Generate: - NestJS service skeletons - Prisma models - PostgreSQL
queries - Angular components - Flutter screens - REST API
documentation - Unit tests - Integration tests

All generated code should follow project architecture and coding
standards.

------------------------------------------------------------------------

# 16. AI Output Formats

Supported: - Markdown - JSON - Table - CSV - Mermaid diagrams -
Checklist - Executive summary

------------------------------------------------------------------------

# 17. Prompt Variables

Common variables: - tenantId - leadId - customerId - pipelineStage -
quotationId - assignedUser - followupDate - campaign - product - region

------------------------------------------------------------------------

# 18. Guardrails

-   Never disclose data outside tenant scope.
-   Respect RBAC permissions.
-   Do not fabricate customer information.
-   Flag low-confidence answers.
-   Avoid irreversible recommendations without confirmation.

------------------------------------------------------------------------

# 19. Future AI Agents

-   Sales Copilot
-   Lead Scoring Agent
-   Assignment Optimizer
-   Forecasting Agent
-   Proposal Writer
-   Follow-up Coach
-   Executive Insights Agent
-   Customer 360 Agent
-   Data Quality Agent

------------------------------------------------------------------------

# 20. Acceptance Criteria

-   Prompts reusable across modules
-   RBAC-aware
-   Tenant-aware
-   Structured outputs supported
-   Enterprise ready
-   Extensible for future AI agents

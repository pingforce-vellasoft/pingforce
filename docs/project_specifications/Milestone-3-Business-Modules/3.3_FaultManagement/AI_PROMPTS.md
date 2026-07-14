
# AI_PROMPTS.md

# Fault Management Module – AI Prompts & Intelligent Automation Specification

**Platform:** Enterprise Multi-Tenant Workforce Management SaaS Platform
**Module:** Fault Management
**Document:** AI Prompts & Intelligent Automation
**Version:** 1.0
**Status:** Enterprise Production Design

---

# 1. Purpose

This document defines standardized AI prompts, agent responsibilities, LLM workflows, retrieval strategies, guardrails, and automation patterns used by the Fault Management module.

The prompts are designed for enterprise AI assistants, internal copilots, customer support bots, technician assistants, management reporting, and analytics.

The AI layer integrates with:

- Workflow Engine
- Assignment Engine
- SLA Engine
- Notification Engine
- Customer Feedback
- Root Cause Analysis
- Knowledge Base
- Reporting & Analytics
- Document Management
- RBAC
- Audit Framework

---

# 2. AI Design Principles

- Human-in-the-loop for critical actions
- Explainable recommendations
- Tenant isolation
- RBAC-aware responses
- No direct data modification without authorization
- Prompt versioning
- Retrieval-Augmented Generation (RAG)
- Audit every AI action

---

# 3. AI Agents

## Technician Assistant
Responsibilities:
- Troubleshooting guidance
- Step-by-step repair instructions
- Safety reminders
- Parts recommendations
- Knowledge article retrieval

## Dispatcher Assistant
- Assignment recommendations
- Workload balancing
- Route suggestions
- Technician availability

## Manager Assistant
- SLA risk summary
- Escalation recommendations
- Productivity analysis
- Team performance insights

## RCA Assistant
- Suggest probable root causes
- Recommend CAPA
- Summarize investigations

## Customer Assistant
- Ticket status
- Appointment updates
- FAQ
- Feedback collection

---

# 4. Prompt Templates

## Fault Classification

**Goal**
Classify the fault.

Input:
- Title
- Description
- Attachments
- Customer history

Output:
- Category
- Priority
- Confidence
- Suggested technician
- Similar historical faults

---

## Assignment Recommendation

Input:
- Fault details
- Skills
- Technician workload
- GPS location
- SLA remaining

Output:
- Ranked technician list
- Assignment reason
- Estimated travel time

---

## Troubleshooting Assistant

Input:
- Fault category
- Symptoms
- Equipment
- Error codes

Output:
- Diagnostic checklist
- Possible causes
- Recommended actions
- Safety precautions

---

## Work Log Summary

Input:
- Technician notes
- Attempt history

Output:
- Professional work summary
- Customer-friendly summary
- Internal engineering notes

---

## SLA Risk Prediction

Input:
- Current workflow
- Remaining SLA
- Technician workload
- Historical trends

Output:
- Breach probability
- Risk factors
- Recommended actions

---

## Escalation Recommendation

Input:
- Ticket
- SLA
- Attempts
- Priority

Output:
- Escalate?
- Level
- Reason
- Suggested manager

---

## RCA Generation

Input:
- Attempts
- Feedback
- Logs
- Attachments

Output:
- Probable root causes
- Confidence score
- CAPA recommendations
- Knowledge article candidates

---

## Customer Response Generator

Input:
- Fault status
- Resolution
- Language

Output:
- Professional customer update
- Simple explanation
- Next steps

---

## Executive Summary

Input:
- KPI data
- SLA metrics
- Escalations
- RCA

Output:
- One-page executive summary
- Risks
- Opportunities
- Recommended actions

---

# 5. Knowledge Retrieval

AI retrieves:

- SOPs
- Troubleshooting guides
- Previous faults
- RCA documents
- Vendor manuals
- Product documentation
- Internal knowledge articles

RAG is preferred over model-only responses.

---

# 6. Guardrails

AI must never:

- Bypass RBAC
- Expose another tenant's data
- Invent workflow states
- Change data without authorization
- Reveal secrets or credentials

AI should always state confidence when uncertain.

---

# 7. Prompt Variables

Common placeholders:

- {{faultNumber}}
- {{customerName}}
- {{priority}}
- {{status}}
- {{technician}}
- {{branch}}
- {{slaRemaining}}
- {{attemptHistory}}
- {{feedbackScore}}

---

# 8. AI Workflows

Examples:

Fault Created
→ AI Classification
→ Assignment Recommendation

Resolved
→ Work Summary
→ Feedback Request

Repeated Fault
→ RCA Recommendation
→ Knowledge Update

Near SLA Breach
→ Risk Prediction
→ Escalation Advice

---

# 9. APIs

- POST /ai/classify
- POST /ai/assign
- POST /ai/troubleshoot
- POST /ai/summarize
- POST /ai/rca
- POST /ai/sla-risk
- POST /ai/customer-message
- GET /ai/history

---

# 10. Audit

Log:
- Prompt version
- Model
- User
- Inputs (masked where required)
- Outputs
- Confidence
- Timestamp

---

# 11. Performance Targets

- Classification <2 sec
- Summaries <5 sec
- Recommendations <3 sec
- Cached retrieval where possible

---

# 12. Future Enhancements

- Multimodal image diagnostics
- Voice-based technician assistant
- OCR from uploaded documents
- Predictive maintenance
- Digital twin integration
- Autonomous scheduling recommendations
- Multi-agent orchestration

---

# Conclusion

The AI Prompt framework provides standardized, reusable prompts and enterprise AI workflows for the Fault Management module. It enables intelligent classification, assignment, troubleshooting, SLA prediction, RCA assistance, customer communication, reporting, and knowledge retrieval while maintaining security, explainability, auditability, and tenant isolation across the Workforce Management SaaS Platform.

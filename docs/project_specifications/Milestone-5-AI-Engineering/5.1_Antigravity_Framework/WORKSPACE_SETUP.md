# WORKSPACE_SETUP.md

# Antigravity AI Engineering Workspace Setup

**Project:** Enterprise Multi-Tenant Workforce Management SaaS Platform

**Module:** AI_Engineering/Antigravity

**Version:** 1.0.0

---

# Purpose

This document defines the standard development workspace for the Antigravity AI Engineering module. It ensures every developer, AI engineer, DevOps engineer, and QA engineer uses a consistent, reproducible environment for enterprise-scale AI development.

---

# Objectives

- Standardize local development
- Support Windows, macOS, and Linux
- Enable AI, backend, and frontend collaboration
- Ensure secure development practices
- Provide identical environments across local, CI/CD, and production

---

# Recommended Hardware

## Minimum

- CPU: 4 Cores
- RAM: 16 GB
- Storage: 100 GB SSD

## Recommended

- CPU: 8–16 Cores
- RAM: 32–64 GB
- NVMe SSD
- Dedicated GPU (optional for local LLM testing)

---

# Operating Systems

Supported:

- Windows 11
- Ubuntu 24.04 LTS
- macOS (latest)

---

# Required Software

## Core

- Git
- Docker Desktop / Docker Engine
- Docker Compose
- Node.js 22 LTS
- npm or pnpm
- Python 3.12+
- Visual Studio Code

## Databases

- PostgreSQL 16+
- Redis 7+

## AI Stack

- Ollama (optional)
- LangChain
- LangGraph
- pgvector

## API Tools

- Postman
- Bruno
- Insomnia

---

# VS Code Extensions

- ESLint
- Prettier
- Docker
- GitLens
- Prisma
- Markdown All in One
- REST Client
- YAML
- Error Lens
- EditorConfig

---

# Repository Structure

```text
AI_Engineering/
└── Antigravity/
    ├── README.md
    ├── WORKSPACE_SETUP.md
    ├── CHANGELOG.md
    ├── PROJECT_STATE.md
    ├── Agents/
    ├── Models/
    ├── Prompts/
    ├── Memory/
    ├── RAG/
    ├── Security/
    ├── Monitoring/
    ├── Tests/
    └── Examples/
```

---

# Environment Variables

Create:

```text
.env
.env.local
.env.development
.env.test
.env.production
```

Example variables:

```text
NODE_ENV=development
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
OPENAI_API_KEY=
AZURE_OPENAI_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
OLLAMA_URL=
VECTOR_DB_URL=
```

Never commit secrets.

---

# Local Services

Run locally:

- PostgreSQL
- Redis
- Vector Database (pgvector)
- Ollama (optional)
- MinIO (optional object storage)

---

# Docker Services

Recommended containers:

- api
- postgres
- redis
- pgvector
- minio
- nginx

---

# Branch Strategy

- main
- develop
- release/*
- hotfix/*
- feature/*
- bugfix/*

---

# Code Standards

- TypeScript strict mode
- ESLint
- Prettier
- SOLID
- Clean Architecture
- Dependency Injection
- Feature-first modular structure

---

# Testing

Execute:

- Unit Tests
- Integration Tests
- API Tests
- AI Prompt Tests
- Security Tests
- Performance Tests

Coverage target:

- Minimum 90%

---

# Security

- RBAC enforced
- Secrets via environment variables
- No production credentials locally
- Dependency scanning
- Container image scanning
- Prompt injection testing

---

# Git Hooks

Recommended:

- lint
- format
- unit tests
- commit message validation

---

# CI/CD Compatibility

Workspace must match GitHub Actions pipeline:

- Build
- Test
- Security Scan
- AI Validation
- Docker Build
- Deployment

---

# Enterprise Integration

Compatible with:

- NestJS Backend
- Angular Admin Portal
- Flutter Mobile
- PostgreSQL
- Redis
- Module Engine
- Feature Flags
- Workflow Engine
- Notification Engine
- RBAC Engine
- Audit Engine

---

# Troubleshooting

Common checks:

- Verify Docker services are running.
- Confirm PostgreSQL and Redis connectivity.
- Validate environment variables.
- Ensure Node.js and Python versions match project requirements.
- Verify API keys before testing AI integrations.

---

# Workspace Validation Checklist

- Git configured
- Docker operational
- PostgreSQL running
- Redis running
- Environment variables configured
- Dependencies installed
- Lint passes
- Tests pass
- AI providers configured (or mocked)
- Application starts successfully

---

# Expected Outcome

A secure, reproducible, enterprise-grade AI engineering workspace capable of supporting multi-tenant, RBAC-aware, production-ready AI development for the Enterprise Workforce Management SaaS Platform.

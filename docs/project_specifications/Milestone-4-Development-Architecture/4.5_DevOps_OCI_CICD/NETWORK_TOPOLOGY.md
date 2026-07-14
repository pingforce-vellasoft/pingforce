# NETWORK_TOPOLOGY.md

# Enterprise Network Topology Specification

## Purpose

This document defines the target network topology that shall be implemented for the Enterprise Multi-Tenant Workforce Management SaaS Platform. The network architecture is designed to provide secure, scalable, highly available, and fault-tolerant connectivity across all application components while supporting multi-tenancy, white-label deployments, and future geographic expansion.

---

# Design Goals

The network architecture shall:

- Support enterprise-grade security
- Isolate public and private workloads
- Minimize attack surface
- Support horizontal scalability
- Enable high availability
- Protect tenant data
- Support zero-trust principles
- Integrate with OCI networking services
- Enable secure administration
- Support disaster recovery and future multi-region deployment

---

# High-Level Network Topology

```text
                    Internet
                        │
                 Enterprise DNS
                        │
             Web Application Firewall
                        │
                 Public Load Balancer
                        │
              ───────────────────────
              │                    │
        Public Subnet         Bastion Host
              │
        API Gateway / Ingress
              │
      ───────────────────────────────
      │            │               │
 Angular UI    NestJS API     Notification
                    │
             Internal Services
      ┌─────────────┼─────────────┐
      │             │             │
   Workers      Scheduler      Sync Engine
      │
      ├───────────────┐
      │               │
 PostgreSQL       Redis Cache
      │
 Object Storage / Backup Storage
```

---

# Network Segmentation

The infrastructure shall be divided into logical security zones:

1. Edge Zone
   - DNS
   - WAF
   - Public Load Balancer

2. Application Zone
   - Kubernetes Ingress
   - Angular
   - NestJS
   - Worker Services
   - Notification Services

3. Data Zone
   - PostgreSQL
   - Redis
   - Object Storage

4. Management Zone
   - Bastion
   - Monitoring
   - Logging
   - CI/CD Agents

---

# Virtual Cloud Network (VCN)

The OCI Virtual Cloud Network shall include:

- Public subnet(s)
- Private application subnet(s)
- Database subnet(s)
- Management subnet(s)
- Optional DR subnet(s)

CIDR allocation shall allow future expansion without re-addressing.

---

# Traffic Flow

Inbound:
Internet → DNS → WAF → Load Balancer → Ingress → Application Services

Internal:
API → Workers → Database → Cache → Storage

Outbound:
Application → Approved External APIs → Notification Providers → Analytics Services

All outbound communication shall be controlled through approved gateways.

---

# Security Controls

The topology shall implement:

- Network Security Groups
- Least privilege firewall rules
- TLS 1.2+ encryption
- Private database access
- Bastion-only administrative access
- IP allow-lists where applicable
- DDoS protection
- Web Application Firewall
- East-West traffic restrictions

---

# Kubernetes Networking

The cluster shall support:

- Namespace isolation
- Network Policies
- Internal service discovery
- Ingress Controller
- Service-to-service encryption (future)
- Resource isolation

---

# Multi-Tenant Considerations

The network shall support:

- Shared platform architecture
- Secure tenant isolation
- Tenant-aware routing where required
- White-label domains
- API Gateway tenant resolution
- Regional expansion

---

# External Integrations

Secure connectivity shall be provided for:

- Firebase
- SMTP
- WhatsApp Business API
- SMS Providers
- Payment Gateways
- Identity Providers
- Third-party CRM systems
- Public Webhooks

---

# Monitoring

Network monitoring shall include:

- Bandwidth utilization
- Latency
- Packet loss
- Connection failures
- WAF events
- Load balancer health
- Ingress metrics
- DNS health
- Certificate expiry

---

# High Availability

The topology shall support:

- Multiple availability domains
- Redundant load balancers
- Kubernetes self-healing
- Database high availability
- Redundant ingress controllers
- Automatic failover

---

# Disaster Recovery

The design shall accommodate:

- Secondary region readiness
- Replicated backups
- Infrastructure recreation using IaC
- Controlled DNS failover
- Recovery validation

Target Objectives:

- RPO ≤ 15 minutes
- RTO ≤ 1 hour

---

# Future Enhancements

The network architecture shall remain extensible for:

- Multi-region active-active deployment
- Global traffic management
- Service mesh
- Private connectivity to enterprise customers
- Multi-cloud networking
- Zero Trust Network Access (ZTNA)

---

# Document Metadata

Document Type: Target Network Architecture Specification

Lifecycle: Planned Implementation

Target Platform: Enterprise Multi-Tenant Workforce Management SaaS Platform

Target Cloud: Oracle Cloud Infrastructure

Version: 2.0

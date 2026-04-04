---
name: architecture-designer
description: >
  Use when designing system architecture, reviewing designs, or making architectural
  decisions for the Cloudeefly platform. Covers ADRs, technology trade-offs, component
  interactions, scalability planning, and infrastructure pattern selection. Adapted to
  our stack: Django + React, Kubernetes (Scaleway Kapsule), Pulumi IaC, Temporal workflows,
  ArgoCD GitOps, Istio service mesh.
license: MIT
metadata:
  author: adapted from https://github.com/Jeffallan
  version: "1.2.0"
  domain: api-architecture
  triggers: architecture, system design, design pattern, scalability, ADR, technical design
  role: expert
  scope: design
  output-format: document
---

# Architecture Designer — Cloudeefly

Principal architect for the Cloudeefly platform. You make pragmatic trade-offs, document decisions with ADRs, and prioritize long-term maintainability within our stack constraints.

## When to Use This Skill

- Designing new platform features (Business Apps, billing, multi-tenancy)
- Choosing between implementation approaches
- Reviewing existing architecture for scaling issues
- Creating Architecture Decision Records (ADRs)
- Planning infrastructure changes (new services, DB changes, networking)
- Evaluating technology choices within our stack

## Cloudeefly Stack (decisions already made)

Before designing anything, know what's fixed:

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend** | Django 4.2+ / DRF | PostgreSQL, Django-Q for background tasks |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind | SPA, React Query for server state |
| **Infra IaC** | Pulumi (Python) | Scaleway provider, all resources code-managed |
| **Kubernetes** | Scaleway Kapsule (3 pools: system, data, apps) | NOT MicroK8s, NOT EKS |
| **CI/CD** | Temporal + Kaniko (self-hosted) | NOT GitHub Actions (migrating away) |
| **GitOps** | ArgoCD | Source of truth for all deployments |
| **Service Mesh** | Istio | mTLS, traffic management, VirtualServices |
| **Registry** | Scaleway Container Registry | `rg.fr-par.scw.cloud/cloudeefy-registry-production` |
| **DNS** | AWS Route53 | `*.cloudeefy.io`, `*.dev.cloudeefy.io` |
| **Secrets** | Scaleway Secret Manager → ESO → K8s | Never plaintext |
| **Monitoring** | Prometheus + Grafana + Scaleway Cockpit | Metrics + logs + alerts |
| **LLM Gateway** | UnityLLM (hyper_proxy_new) | All AI calls go through this proxy |
| **Agent Orchestration** | Paperclip | Mission control for AI agents |
| **Agent Runtime** | OpenClaw/NemoClaw | Sandboxed agent execution on K8s |
| **Databases** | PostgreSQL (shared tier 1, dedicated tier 2) | No per-app DB pods |
| **Static Assets** | S3 (Scaleway Object Storage) | No PVCs for statics |

## Core Workflow

1. **Understand requirements** — Gather functional + non-functional + constraints. Check alignment with launch priority (STRATEGY.md).
2. **Check existing patterns** — Does our codebase already solve this? Don't reinvent.
3. **Identify patterns** — Match requirements to architectural patterns (see Reference Guide).
4. **Design** — Create architecture with trade-offs explicitly documented. Produce a diagram.
5. **Document** — Write ADR for all key decisions. Store in `docs/adr/` of the relevant repo.
6. **Review** — Validate with stakeholders. If review fails, return to step 3.

## Reference Guide

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Architecture Patterns | `references/architecture-patterns.md` | Choosing patterns |
| ADR Template | `references/adr-template.md` | Documenting decisions |
| System Design | `references/system-design.md` | Full system design |
| Database Selection | `references/database-selection.md` | Database choices |
| NFR Checklist | `references/nfr-checklist.md` | Non-functional requirements |

## Cloudeefly-Specific Design Principles

### Multi-Tenancy
```
Tenant isolation model:
- Namespace per tenant: tenant-{slug}
- Shared PostgreSQL (tier 1) or dedicated (tier 2)
- Istio NetworkPolicies for network isolation
- Sealed secrets per tenant
- ArgoCD Application per tenant+app
```

### Business App Deployment
```
User deploys app → Django API →
  1. Create namespace tenant-{slug} (if new)
  2. Create sealed secret with config
  3. Generate ArgoCD Application YAML
  4. Commit to cloudeefy-infra repo
  5. ArgoCD syncs → K8s deploys
  6. Health check → status updated in Django
```

### Service Communication
```
Frontend (React SPA)
  → Istio Gateway (TLS termination)
  → Django API (cloudeefly-dev/prod namespace)
  → Background: Temporal workflows (ci-system, deployment)
  → External: Stripe API, Scaleway API, GitHub API
  → AI: UnityLLM proxy → Anthropic/OpenAI/Gemini
```

## Constraints

### MUST DO
- Document all significant decisions with ADRs
- Design for multi-tenancy from day one
- Consider cost impact (we're on fixed bare-metal nodes)
- Plan for failure modes (what if a node dies?)
- Keep it simple — we're a small team of AI agents
- Stay within existing stack (don't introduce new databases, languages, or orchestrators)

### MUST NOT DO
- Over-engineer for hypothetical scale (we're pre-launch)
- Add new infrastructure components without CTO approval
- Design without checking existing codebase patterns
- Ignore operational costs (every pod = CPU+RAM on our nodes)
- Skip security (tenant isolation is non-negotiable)
- Choose technology without evaluating alternatives

## Output Templates

### Architecture Design Document

```markdown
# [Feature/System] Architecture

## Requirements
- Functional: [what it does]
- Non-functional: [performance, security, scalability]
- Constraints: [budget, timeline, stack]

## Architecture Diagram

[Mermaid diagram — see below]

## Key Decisions

### ADR-NNN: [Decision Title]
- **Status:** Proposed / Accepted / Deprecated
- **Context:** [why this decision is needed]
- **Decision:** [what we chose]
- **Alternatives:** [what else we considered]
- **Consequences:** [positive + negative]
- **Trade-offs:** [what we're optimizing for vs sacrificing]

## Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| [risk] | High/Med/Low | High/Med/Low | [plan] |
```

### Mermaid Diagram (Cloudeefly style)

```mermaid
graph TD
    User["User Browser"] --> Gateway["Istio Gateway\n(TLS termination)"]
    Gateway --> Django["Django API\n(cloudeefly-dev)"]
    Django --> DB[("PostgreSQL\n(shared/dedicated)")]
    Django --> Temporal["Temporal\n(workflow orchestration)"]
    Temporal --> Kaniko["Kaniko\n(image builds)"]
    Django --> ArgoCD["ArgoCD\n(GitOps deploy)"]
    ArgoCD --> TenantNS["tenant-{slug}\n(K8s namespace)"]
    Django --> Stripe["Stripe\n(billing)"]
    Django --> UnityLLM["UnityLLM\n(AI gateway)"]
    UnityLLM --> Anthropic["Anthropic"]
    UnityLLM --> OpenAI["OpenAI"]
    UnityLLM --> Gemini["Gemini"]
```

## Quick Decision Framework

When making architecture decisions for Cloudeefly:

1. **Does it work on our 3-pool Kapsule cluster?** If not, reconsider.
2. **Can we deploy it via ArgoCD?** If not, it's not GitOps-compliant.
3. **Does it need a new database?** Use existing PostgreSQL first.
4. **Does it add operational burden?** We're AI agents, not a 24/7 ops team.
5. **Can we ship it in < 1 week?** If not, it's too complex for pre-launch.
6. **Is it tenant-isolated?** If not, it's a security risk.

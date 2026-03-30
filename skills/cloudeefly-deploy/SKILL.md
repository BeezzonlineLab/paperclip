---
name: cloudeefly-deploy
description: >
  Deploy a new Business App to the Cloudeefly platform. Use when creating
  deployment templates for Odoo, Akeneo, Nextcloud, OpenClaw, Hermes, or MCP
  servers. Covers the full pipeline from app template to running instance.
---

# Cloudeefly Deploy Skill

Use this skill when you need to add a new app to the Business Apps catalog or create a deployment template.

## Deployment Architecture

```
User clicks "Deploy" in UI
  → Django API creates deployment record
  → Triggers Argo Workflow (Kaniko build if needed)
  → ArgoCD Application created from template
  → K8s resources deployed (Deployment, Service, Ingress)
  → Health check confirms app is running
  → Status updated in Django DB
```

## App Template Structure

Each Business App needs:

### 1. Django Model (in `cloudeefy` repo)

```python
# apps/catalog/models.py
class AppTemplate(models.Model):
    slug = models.SlugField(unique=True)          # "odoo", "nextcloud", etc.
    name = models.CharField(max_length=100)
    category = models.CharField(choices=CATEGORIES)  # "erp", "collaboration", "ai", "mcp"
    description = models.TextField()
    icon_url = models.URLField()
    docker_image = models.CharField(max_length=255)  # registry image
    default_port = models.IntegerField(default=8080)
    env_schema = models.JSONField(default=dict)      # JSON Schema for config options
    plans = models.JSONField(default=list)            # pricing plans
    helm_values_template = models.JSONField()         # base Helm values
    min_resources = models.JSONField()                # {"cpu": "500m", "memory": "512Mi"}
```

### 2. K8s Deployment Template (in `cloudeefy-infra` repo)

```
cloudeefy-infra/
├── apps/
│   ├── odoo/
│   │   ├── Chart.yaml
│   │   ├── values.yaml          # defaults
│   │   ├── values-small.yaml    # small plan overrides
│   │   ├── values-medium.yaml   # medium plan overrides
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── ingress.yaml
│   │       └── configmap.yaml
│   ├── nextcloud/
│   ├── akeneo/
│   ├── openclaw/
│   └── hermes/
```

### 3. ArgoCD Application (auto-generated)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: {{ tenant }}-{{ app_slug }}
  namespace: argocd
spec:
  project: tenant-{{ tenant }}
  source:
    repoURL: https://github.com/BeezzonlineLab/cloudeefy-infra
    path: apps/{{ app_slug }}
    helm:
      valueFiles:
        - values.yaml
        - values-{{ plan }}.yaml
      parameters:
        - name: tenant
          value: "{{ tenant }}"
        - name: domain
          value: "{{ app_slug }}.{{ tenant }}.cloudeefly.com"
  destination:
    server: https://kubernetes.default.svc
    namespace: tenant-{{ tenant }}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## App Categories

| Category | Apps | Docker Images |
|----------|------|---------------|
| `erp` | Odoo | `odoo:17.0` |
| `pim` | Akeneo | `akeneo/pim-community-standard` |
| `collaboration` | Nextcloud | `nextcloud:latest` |
| `ai` | OpenClaw, Hermes | Custom builds via Kaniko |
| `mcp` | MCP Servers | Custom builds from GitHub repos |

## Deployment Naming Conventions

- **Namespace**: `tenant-{tenant_slug}` (one per customer)
- **App name**: `{tenant}-{app_slug}` (e.g., `acme-odoo`)
- **Domain**: `{app_slug}.{tenant}.cloudeefly.com`
- **Image tag**: `sha-{commit}` for custom builds, version tag for official images
- **ConfigMap**: `{tenant}-{app_slug}-config`
- **Secret**: `{tenant}-{app_slug}-secret` (sealed)

## Deployment Checklist

Before marking a deployment template as ready:

- [ ] Helm chart renders without errors (`helm template`)
- [ ] Resource limits set (CPU + memory)
- [ ] Health checks defined (liveness + readiness probes)
- [ ] Ingress with TLS configured
- [ ] Environment variables documented in `env_schema`
- [ ] At least 2 plan sizes (small, medium)
- [ ] ArgoCD Application template works
- [ ] Tested in dev namespace

## Scaling Rules

- **Small apps** (< 512Mi RAM): Deploy on Scaleway Container Service
- **Growing apps** (> 512Mi RAM): Deploy on K8s cluster
- First-tier databases: shared PostgreSQL cluster
- Second-tier databases: dedicated instance per tenant

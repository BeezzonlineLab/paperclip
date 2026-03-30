---
name: cloudeefly-gitops
description: >
  GitOps deployment workflow for Cloudeefly infrastructure. Use when deploying
  apps, modifying K8s manifests, configuring ArgoCD, or managing CI/CD pipelines.
  All infra changes go through cloudeefy-infra repo.
---

# Cloudeefly GitOps Skill

Use this skill for all infrastructure and deployment work.

## Golden Rule

**Never `kubectl apply` in production.** All changes go through Git → ArgoCD.

## Infrastructure Repo: cloudeefy-infra

```
cloudeefy-infra/                    # GitHub: BeezzonlineLab/cloudeefy-infra
├── apps/                           # Business App Helm charts
│   ├── odoo/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   ├── values-small.yaml
│   │   ├── values-medium.yaml
│   │   └── templates/
│   ├── nextcloud/
│   ├── akeneo/
│   ├── openclaw/
│   ├── hermes/
│   └── mcp-servers/
├── infrastructure/                 # Core platform infra
│   ├── argocd/                     # ArgoCD configuration
│   ├── istio/                      # Service mesh config
│   ├── monitoring/                 # Prometheus, Grafana
│   ├── cert-manager/               # TLS automation
│   └── sealed-secrets/             # Secret management
├── tenants/                        # Per-customer namespaces
│   └── _template/                  # Template for new tenants
├── pipelines/                      # Kaniko build configs
│   ├── build-custom-app.yaml       # Argo Workflow template
│   └── build-mcp-server.yaml       # MCP server build
└── argocd-apps/                    # ArgoCD Application manifests
    ├── platform.yaml               # Core platform app
    └── tenant-template.yaml        # Template for tenant apps
```

## Deployment Flow

### Adding a New Business App

1. Create Helm chart in `cloudeefy-infra/apps/{app-slug}/`
2. Define `values.yaml` (defaults) + `values-{plan}.yaml` per tier
3. Create ArgoCD Application template in `argocd-apps/`
4. Commit and push → ArgoCD auto-syncs
5. Register the app template in Django via the API

### Deploying a Tenant Instance

```
User clicks Deploy → Django API →
  1. Creates namespace `tenant-{slug}` (if new tenant)
  2. Creates sealed secret with tenant config
  3. Generates ArgoCD Application YAML
  4. Commits to cloudeefy-infra/tenants/{slug}/{app}.yaml
  5. ArgoCD detects change → deploys
  6. Health check → status updated in Django
```

### CI/CD Pipeline (Kaniko)

```yaml
# Argo Workflow for building custom app images
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: build-{{ app_slug }}-{{ tenant }}
spec:
  entrypoint: build
  templates:
  - name: build
    container:
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --dockerfile=Dockerfile
        - --context=git://github.com/{{ repo }}
        - --destination=rg.fr-par.scw.cloud/cloudeefly/{{ app_slug }}:{{ tag }}
      env:
        - name: DOCKER_CONFIG
          value: /kaniko/.docker
```

## Namespace Conventions

| Namespace | Purpose |
|-----------|---------|
| `argocd` | ArgoCD control plane |
| `monitoring` | Prometheus, Grafana |
| `istio-system` | Istio service mesh |
| `cert-manager` | TLS certificates |
| `platform` | Cloudeefly platform (Django, frontend) |
| `tenant-{slug}` | Per-customer apps |
| `mcp-deployments` | MCP server instances |

## Secrets Management

```bash
# Create a sealed secret
kubeseal --format yaml \
  --cert sealed-secrets-cert.pem \
  < secret.yaml > sealed-secret.yaml

# Commit sealed secret to cloudeefy-infra
git add tenants/{slug}/sealed-{app}-secret.yaml
git commit -m "feat(tenant): add {app} secrets for {tenant}"
git push
```

## Scaling Rules

| Tier | Where | Resources |
|------|-------|-----------|
| Small apps (< 512Mi) | Scaleway Container Service | 0.5 vCPU, 512Mi |
| Medium apps | K8s cluster | 1 vCPU, 1Gi |
| Large apps | K8s cluster (dedicated node) | 2+ vCPU, 4Gi+ |
| Databases (tier 1) | Shared PostgreSQL cluster | Shared |
| Databases (tier 2) | Dedicated PostgreSQL | Dedicated |

## Checklist Before Deploying

- [ ] Helm chart renders cleanly (`helm template`)
- [ ] Resource limits and requests set
- [ ] Liveness + readiness probes defined
- [ ] Ingress with TLS (cert-manager annotation)
- [ ] Sealed secret for sensitive config
- [ ] Tested in dev namespace first
- [ ] ArgoCD sync is healthy after push
- [ ] No manual kubectl was used

## Safety

- Never delete namespaces without board approval
- Never modify production sealed secrets without rotation plan
- Always test in dev namespace first
- Keep ArgoCD self-heal enabled

---
name: cloudeefly-api-patterns
description: >
  Django REST Framework patterns for Cloudeefly APIs. Use when creating or
  modifying API endpoints, serializers, or views. Ensures consistency across
  the backend.
---

# Cloudeefly API Patterns

Use this skill when building Django REST API endpoints for Cloudeefly.

## Project Structure

```
cloudeefy/
├── apps/
│   ├── catalog/          # App templates, categories
│   ├── deployments/      # Deployment instances, status tracking
│   ├── billing/          # Stripe integration, subscriptions
│   ├── tenants/          # Customer accounts, domains
│   └── mcp/              # MCP server deployments
├── core/                 # Shared utilities, permissions, mixins
└── config/               # Django settings, URLs, WSGI
```

## Serializer Pattern

```python
from rest_framework import serializers

class AppTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppTemplate
        fields = ["id", "slug", "name", "category", "description",
                  "icon_url", "plans", "min_resources", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]

class AppTemplateCreateSerializer(serializers.ModelSerializer):
    """Separate serializer for creation — different fields than read."""
    class Meta:
        model = AppTemplate
        fields = ["name", "category", "description", "docker_image",
                  "default_port", "env_schema", "plans", "helm_values_template",
                  "min_resources"]

    def validate_plans(self, value):
        # Always validate in serializer, not in view
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("At least one plan is required")
        return value
```

## ViewSet Pattern

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

class AppTemplateViewSet(viewsets.ModelViewSet):
    queryset = AppTemplate.objects.all()
    lookup_field = "slug"
    
    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return AppTemplateCreateSerializer
        return AppTemplateSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs

    @action(detail=True, methods=["post"])
    def deploy(self, request, slug=None):
        template = self.get_object()
        serializer = DeployRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deployment = DeploymentService.create(
            template=template,
            tenant=request.user.tenant,
            plan=serializer.validated_data["plan"],
            config=serializer.validated_data.get("config", {}),
        )
        return Response(
            DeploymentSerializer(deployment).data,
            status=status.HTTP_201_CREATED,
        )
```

## Response Format

All API responses follow this structure:

```json
// Success (single object)
{ "id": "...", "name": "...", ... }

// Success (list)
{ "count": 42, "next": "...", "previous": "...", "results": [...] }

// Error
{ "error": "Human-readable message", "code": "MACHINE_CODE", "details": {...} }
```

## Error Handling

```python
from rest_framework.exceptions import APIException

class DeploymentError(APIException):
    status_code = 422
    default_detail = "Deployment failed"
    default_code = "deployment_failed"

# In views — let DRF handle the response format
def deploy(self, request, slug=None):
    try:
        deployment = DeploymentService.create(...)
    except InsufficientResources as e:
        raise DeploymentError(detail=str(e))
```

## URL Patterns

```python
# config/urls.py
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("apps", AppTemplateViewSet, basename="app-template")
router.register("deployments", DeploymentViewSet, basename="deployment")
router.register("tenants", TenantViewSet, basename="tenant")

urlpatterns = [
    path("api/v1/", include(router.urls)),
]
```

## Authentication

- Session auth for web UI
- Token auth for API clients
- All endpoints require authentication unless explicitly public
- Tenant isolation: filter querysets by `request.user.tenant`

## Testing Pattern

```python
from rest_framework.test import APITestCase

class AppTemplateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("test@example.com")
        self.client.force_authenticate(self.user)
        self.template = AppTemplate.objects.create(
            name="Odoo", slug="odoo", category="erp", ...
        )

    def test_list_templates(self):
        response = self.client.get("/api/v1/apps/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_deploy_creates_instance(self):
        response = self.client.post(f"/api/v1/apps/{self.template.slug}/deploy/", {
            "plan": "small",
            "config": {"admin_email": "admin@acme.com"},
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.data)
```

## Rules

- Validate in serializers, not views
- Use `select_related` / `prefetch_related` for related objects
- Paginate all list endpoints (default: 20 per page)
- Never return secrets in API responses
- Write a test for every new endpoint

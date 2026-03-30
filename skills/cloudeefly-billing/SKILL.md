---
name: cloudeefly-billing
description: >
  Stripe billing integration for Cloudeefly Business Apps. Use when implementing
  checkout, subscription management, webhooks, or pricing features.
---

# Cloudeefly Billing Skill

Use this skill when integrating Stripe for Business App billing.

## Billing Model

Each Business App instance = one Stripe Subscription.

```
Customer signs up → creates Stripe Customer
Customer deploys app → selects plan → creates Stripe Checkout Session
Checkout completes → webhook → activate deployment
Monthly billing → Stripe invoices automatically
Customer cancels → webhook → mark deployment for teardown
```

## Stripe Objects Mapping

| Cloudeefly | Stripe |
|-----------|--------|
| Tenant (customer account) | `Customer` |
| App Template | `Product` |
| Plan (small/medium/large) | `Price` (recurring) |
| Deployed App Instance | `Subscription` |
| Monthly invoice | `Invoice` (auto-generated) |

## Django Models

```python
# apps/billing/models.py
class TenantBilling(models.Model):
    tenant = models.OneToOneField("tenants.Tenant", on_delete=models.CASCADE)
    stripe_customer_id = models.CharField(max_length=100, unique=True)
    
class AppSubscription(models.Model):
    deployment = models.OneToOneField("deployments.Deployment", on_delete=models.CASCADE)
    stripe_subscription_id = models.CharField(max_length=100, unique=True)
    stripe_price_id = models.CharField(max_length=100)
    status = models.CharField(choices=[
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("canceled", "Canceled"),
        ("trialing", "Trialing"),
    ])
    current_period_end = models.DateTimeField()
```

## Checkout Flow (Backend)

```python
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

class CheckoutService:
    @staticmethod
    def create_session(tenant, app_template, plan_slug):
        # Get or create Stripe customer
        billing, _ = TenantBilling.objects.get_or_create(
            tenant=tenant,
            defaults={"stripe_customer_id": stripe.Customer.create(
                email=tenant.email,
                metadata={"tenant_id": str(tenant.id)},
            ).id},
        )
        
        # Find the Stripe Price for this plan
        price_id = app_template.plans_config[plan_slug]["stripe_price_id"]
        
        # Create Checkout Session
        session = stripe.checkout.Session.create(
            customer=billing.stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/deployments/{{CHECKOUT_SESSION_ID}}/success",
            cancel_url=f"{settings.FRONTEND_URL}/apps/{app_template.slug}",
            metadata={
                "tenant_id": str(tenant.id),
                "app_slug": app_template.slug,
                "plan": plan_slug,
            },
        )
        return session
```

## Webhook Handling

```python
# apps/billing/views.py
@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig = request.META.get("HTTP_STRIPE_SIGNATURE")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)
    
    match event.type:
        case "checkout.session.completed":
            handle_checkout_completed(event.data.object)
        case "invoice.paid":
            handle_invoice_paid(event.data.object)
        case "invoice.payment_failed":
            handle_payment_failed(event.data.object)
        case "customer.subscription.deleted":
            handle_subscription_canceled(event.data.object)
    
    return HttpResponse(status=200)

def handle_checkout_completed(session):
    """After successful checkout, trigger the actual deployment."""
    tenant_id = session.metadata["tenant_id"]
    app_slug = session.metadata["app_slug"]
    plan = session.metadata["plan"]
    
    # Create the deployment (triggers ArgoCD via GitOps)
    deployment = DeploymentService.create(
        tenant_id=tenant_id,
        app_slug=app_slug,
        plan=plan,
    )
    
    # Link subscription
    AppSubscription.objects.create(
        deployment=deployment,
        stripe_subscription_id=session.subscription,
        stripe_price_id=session.metadata.get("price_id", ""),
        status="active",
        current_period_end=timezone.now() + timedelta(days=30),
    )
```

## Frontend Checkout

```tsx
// Redirect to Stripe Checkout
async function handleDeploy(appSlug: string, plan: string, config: Record<string, string>) {
  const { data } = await api.post(`/api/v1/apps/${appSlug}/checkout/`, { plan, config });
  // Redirect to Stripe
  window.location.href = data.checkout_url;
}

// Success page (after Stripe redirect)
function DeploySuccessPage() {
  const { sessionId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["checkout", sessionId],
    queryFn: () => api.get(`/api/v1/checkout/${sessionId}/status/`),
    refetchInterval: 2000, // Poll until deployment is ready
  });

  if (isLoading || data?.status === "deploying") {
    return <DeployingAnimation />;
  }
  return <DeploymentReady deployment={data} />;
}
```

## Pricing Structure

```python
PLANS = {
    "odoo": [
        {"slug": "starter", "name": "Starter", "price_eur": 29, "resources": {"cpu": "500m", "memory": "1Gi"}},
        {"slug": "business", "name": "Business", "price_eur": 79, "resources": {"cpu": "1", "memory": "2Gi"}},
        {"slug": "enterprise", "name": "Enterprise", "price_eur": 199, "resources": {"cpu": "2", "memory": "4Gi"}},
    ],
    "nextcloud": [
        {"slug": "personal", "name": "Personal", "price_eur": 9, "resources": {"cpu": "250m", "memory": "512Mi"}},
        {"slug": "team", "name": "Team", "price_eur": 29, "resources": {"cpu": "500m", "memory": "1Gi"}},
    ],
}
```

## Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...       # Stripe API key
STRIPE_PUBLISHABLE_KEY=pk_live_...  # For frontend
STRIPE_WEBHOOK_SECRET=whsec_...     # Webhook signature
```

## Rules

- Never log Stripe API keys or webhook secrets
- Always verify webhook signatures
- Use idempotency keys for Stripe API calls
- Handle `invoice.payment_failed` gracefully (don't tear down immediately)
- Test with Stripe CLI: `stripe listen --forward-to localhost:8001/api/v1/billing/webhook/`

---
name: positioning-statement
description: >
  Create and refine Cloudeefly's positioning statement using Geoffrey Moore's
  framework. Use when preparing launch messaging, landing page copy, investor
  pitch, competitive differentiation, or aligning the team on who we serve and
  why we're different. Essential before writing PRDs, marketing content, or
  sales collateral.
---

# Positioning Statement — Cloudeefly

Create a clear, defensible positioning statement using Geoffrey Moore's framework from *Crossing the Chasm*. This is a strategic clarity tool, not a tagline.

## When to Use This Skill

- Preparing launch messaging (landing page, launch announcement)
- Writing investor pitch or deck content
- Aligning agents/team on value proposition
- Before writing feature specs (PM uses this to frame "why")
- Testing if our differentiation is real vs imagined
- When entering a new market segment (new app category, new user type)

## Geoffrey Moore Framework

### Value Proposition
```
For [specific target customer]
  that need [underserved need]
  Cloudeefly
  is a [product category]
  that [benefit — outcome, not feature]
```

### Differentiation Statement
```
Unlike [primary competitor or alternative]
  Cloudeefly
  provides [unique differentiation — outcome, not feature]
```

## Cloudeefly Positioning (Current Draft)

### Value Proposition

**For** SMBs and digital agencies
- **that need** business applications (ERP, CRM, collaboration) without DevOps complexity or fragmented vendors
- **Cloudeefly**
- **is a** one-click business app deployment platform
- **that** gets Odoo, Nextcloud, and AI agents running in minutes with built-in domains, email, storage, and billing — no Kubernetes knowledge required

### Differentiation Statement

**Unlike** Heroku, Railway, or manual self-hosting
- **Cloudeefly**
- **provides** pre-configured business apps with vertical department organization (Direction, Sales, IT), AI agents that manage your infrastructure, and per-app billing — not generic container hosting

## Workflow

### Step 1: Validate Current Positioning

Before creating new positioning, stress-test the current draft above:

1. **Would a customer recognize themselves?** → "SMBs and digital agencies" — specific enough?
2. **Is the need defensible?** → Do SMBs actually struggle with fragmented vendors and DevOps?
3. **Does the category help?** → "One-click business app deployment platform" — does this exist as a category?
4. **Is differentiation believable?** → Can we prove "running in minutes" with a demo?
5. **Does this guide decisions?** → Would this help decide "should we add WordPress support?" (yes — it's a business app)

### Step 2: Refine by Segment

Different segments need different positioning emphasis:

| Segment | Need Emphasis | Differentiation Emphasis |
|---------|--------------|------------------------|
| **Solo founders** | "I can't afford a DevOps team" | One person can run Odoo + Nextcloud + AI |
| **Digital agencies** | "My clients need business tools, I need margins" | White-label deploy for clients, per-app billing |
| **SMB IT managers** | "I have 10 apps across 5 vendors" | One dashboard, one invoice, one support contact |
| **AI-first teams** | "I need managed AI agents" | OpenClaw/Hermes + MCP servers integrated |

### Step 3: Competitive Landscape

Name the **real** alternatives buyers consider:

| Alternative | Why buyers use it | Why Cloudeefly wins |
|-------------|------------------|-------------------|
| **Manual self-hosting** (Docker, K8s) | "It's cheaper" | Zero DevOps needed, managed backups, TLS, domains |
| **Heroku / Railway** | "Easy deploys" | Pre-configured business apps, not generic containers |
| **Odoo.sh** (Odoo's own hosting) | "Official" | Multi-app (Odoo + Nextcloud + AI), not locked to one vendor |
| **Cloudron / YunoHost** | "Self-hosted app store" | Cloud-native (K8s, auto-scaling), AI agents, Stripe billing |
| **Do nothing** (spreadsheets + email) | "It works" | 10x productivity with integrated business suite |

### Step 4: Write Landing Page Blocks

From the positioning, derive:

**Hero headline:**
> Deploy Odoo, Nextcloud, and AI agents in one click. No DevOps required.

**Subheadline:**
> The business infrastructure platform that gives SMBs enterprise tools without enterprise complexity.

**Value props (3 pillars):**
1. **One-Click Business Apps** — Odoo, Nextcloud, Akeneo, AI agents — deployed in minutes
2. **Everything Included** — Custom domains, email, storage, backups, TLS — no extra vendors
3. **AI-Powered Operations** — AI agents that monitor, optimize, and manage your infrastructure

### Step 5: Test and Iterate

- Read positioning aloud to a non-technical friend → do they understand?
- Show landing page headline to 5 target users → do they click?
- Compare with competitor landing pages → is the differentiation clear at a glance?

## Constraints

### MUST DO
- Name a specific competitor in "Unlike" (not "unlike traditional approaches")
- Focus on outcomes ("running in minutes") not features ("has Kubernetes")
- Keep it narrow — position for one segment first, expand later
- Test with real users before finalizing

### MUST NOT DO
- Say "for everyone" or "for businesses"
- List features instead of benefits
- Use buzzwords ("revolutionary", "next-gen", "AI-powered" without specifics)
- Position against a straw man
- Skip competitive research

## Output Format

```markdown
# Cloudeefly Positioning Statement

## For [Segment Name]

### Value Proposition
**For** [specific target]
- **that need** [underserved need]
- **Cloudeefly**
- **is a** [category]
- **that** [benefit/outcome]

### Differentiation
**Unlike** [named competitor]
- **Cloudeefly**
- **provides** [specific, provable differentiation]

### Supporting Evidence
- [Data point, case study, or demo that proves the claim]

### Landing Page Derivative
- **Headline:** [one line]
- **Subheadline:** [one line]
- **3 value props:** [one line each]
```

## References

- Geoffrey Moore, *Crossing the Chasm* (1991)
- April Dunford, *Obviously Awesome* (2019)
- Current Cloudeefly landing page: `dev.cloudeefy.io`
- Pricing plans: see `cloudeefly-billing` skill for plan details

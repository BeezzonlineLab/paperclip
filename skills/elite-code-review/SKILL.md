---
name: elite-code-review
description: >
  Comprehensive code review skill covering security analysis, performance
  optimization, production reliability, and modern best practices. Use when
  reviewing PRs, auditing code, or assessing technical quality. Provides
  structured review with severity levels and actionable fixes.
---

# Elite Code Review

Use this skill when reviewing code, PRs, or assessing technical quality. Apply it systematically for every review task.

## Review Protocol

For every review, follow this sequence:

1. **Context**: Understand what changed and why (read the issue/PR description)
2. **Security scan**: Check for OWASP Top 10, secrets, auth bypass
3. **Performance check**: N+1 queries, memory leaks, missing indexes, bundle size
4. **Architecture check**: Does it follow existing patterns? SOLID principles?
5. **Test check**: Are critical paths tested? Do tests verify behavior, not implementation?
6. **Config check**: Production-safe? Resource limits? Secrets management?
7. **Report**: Structured feedback with severity labels

## Severity Labels

Always label each finding:

- **`[BLOCKING]`** — Must fix before merge. Security vulnerabilities, data loss risks, broken functionality.
- **`[IMPORTANT]`** — Should fix. Performance issues, missing tests, pattern violations.
- **`[NIT]`** — Nice to have. Style, naming, minor improvements. Don't block merge for nits.

## Security Review Checklist

### Input & Output
- [ ] User input validated and sanitized (XSS, injection)
- [ ] SQL queries parameterized (no string interpolation)
- [ ] File uploads validated (type, size, content)
- [ ] API responses don't leak internal data (stack traces, IDs, paths)

### Authentication & Authorization
- [ ] Auth checks on every endpoint (no open endpoints by accident)
- [ ] RBAC enforced (tenant isolation, company scoping)
- [ ] Session/token management correct (expiry, refresh, revocation)
- [ ] CSRF protection on state-changing endpoints

### Secrets & Credentials
- [ ] No hardcoded secrets, API keys, or passwords
- [ ] Environment variables for all sensitive config
- [ ] Secrets not logged or included in error messages
- [ ] .env files in .gitignore

### Infrastructure
- [ ] Container images from trusted sources
- [ ] Resource limits set (CPU, memory)
- [ ] Network policies restrict access
- [ ] TLS enabled for all external communication

## Performance Review Checklist

### Database
- [ ] No N+1 queries (`select_related`/`prefetch_related` in Django)
- [ ] Indexes on frequently queried columns
- [ ] Migrations are reversible and safe for production
- [ ] Large queries paginated
- [ ] No `SELECT *` on large tables

### Frontend
- [ ] Components memoized where needed (`useMemo`, `useCallback`, `React.memo`)
- [ ] No unnecessary re-renders (check dependency arrays)
- [ ] Images optimized and lazy loaded
- [ ] Bundle size impact acceptable (check imports)
- [ ] API calls deduplicated (React Query cache)

### Backend
- [ ] Expensive operations async/background (not in request cycle)
- [ ] Connection pooling configured
- [ ] Timeouts set on external API calls
- [ ] Caching where appropriate (Redis, in-memory)

### Infrastructure
- [ ] Resource requests and limits appropriate
- [ ] Health checks defined (liveness + readiness)
- [ ] Horizontal scaling configured if needed
- [ ] No blocking operations in hot paths

## Architecture Review Checklist

### Patterns
- [ ] Follows existing codebase conventions
- [ ] Single responsibility (each file/class does one thing)
- [ ] Dependencies flow in one direction (no circular)
- [ ] Interface boundaries clear (well-defined inputs/outputs)

### Django Specific
- [ ] Validation in serializers, not views
- [ ] Business logic in services, not views
- [ ] Model methods for model-level logic
- [ ] Proper use of DRF ViewSets and mixins

### React Specific
- [ ] TypeScript strict (no `any`)
- [ ] Components focused (< 200 lines ideally)
- [ ] Custom hooks for reusable logic
- [ ] Error boundaries for graceful failures

### Kubernetes/Infra
- [ ] GitOps compliant (no manual kubectl)
- [ ] Sealed secrets for sensitive data
- [ ] Kustomize overlays for env-specific config
- [ ] ArgoCD annotations correct

## Review Report Format

```markdown
## Code Review: {PR title}

**Verdict: Approved | Changes Requested | Needs Discussion**

### Blocking Issues
- [BLOCKING] {description} — {file}:{line} — {suggested fix}

### Important Issues
- [IMPORTANT] {description} — {file}:{line} — {suggested fix}

### Nits
- [NIT] {description}

### Strengths
- {what was done well}

### Summary
{1-2 sentences: overall assessment and what to do next}
```

## Language-Specific Patterns

### Python/Django
```python
# BAD: N+1 query
for order in Order.objects.all():
    print(order.customer.name)  # hits DB per order

# GOOD: prefetch
for order in Order.objects.select_related('customer').all():
    print(order.customer.name)  # single query
```

### TypeScript/React
```tsx
// BAD: recreates function every render
<Button onClick={() => handleClick(item.id)} />

// GOOD: stable reference
const handleItemClick = useCallback((id: string) => handleClick(id), [handleClick]);
<Button onClick={() => handleItemClick(item.id)} />
```

### Kubernetes
```yaml
# BAD: no resource limits
containers:
  - name: app
    image: myapp:latest  # also bad: use specific tag

# GOOD
containers:
  - name: app
    image: myapp:sha-abc123
    resources:
      requests: { cpu: 100m, memory: 128Mi }
      limits: { cpu: 500m, memory: 512Mi }
    livenessProbe:
      httpGet: { path: /health, port: 8080 }
```

## Tools Reference

| Tool | Purpose | Command |
|------|---------|---------|
| `gh pr diff` | View PR diff | `gh pr diff {number} --repo {owner/repo}` |
| `gh pr review` | Post review | `gh pr review {number} --comment --body "..."` |
| `gh pr checks` | CI status | `gh pr checks {number}` |
| `grep -rn` | Search patterns | `grep -rn "password\|secret\|key" --include="*.py"` |
| `git log` | Change history | `git log --oneline -20` |

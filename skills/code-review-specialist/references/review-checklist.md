# Review Checklist

## Correctness
- [ ] Code does what the PR description says
- [ ] Edge cases handled (null, empty, boundary values)
- [ ] Error paths return appropriate responses
- [ ] No off-by-one errors in loops/pagination
- [ ] Race conditions considered in concurrent code

## Security (OWASP Top 10)
- [ ] Input validation and sanitization (XSS, injection)
- [ ] SQL queries parameterized (no string interpolation)
- [ ] Authentication checks on every endpoint
- [ ] Authorization/RBAC enforced (tenant isolation)
- [ ] No hardcoded secrets, API keys, or passwords
- [ ] CSRF protection on state-changing endpoints
- [ ] File uploads validated (type, size, content)
- [ ] API responses don't leak internals (stack traces, IDs)
- [ ] Insecure deserialization prevented

## Performance
- [ ] No N+1 queries (use select_related/prefetch_related)
- [ ] Indexes on frequently queried columns
- [ ] Large queries paginated
- [ ] Expensive operations async/background
- [ ] Caching where appropriate
- [ ] No unnecessary re-renders (React: check deps arrays)
- [ ] Bundle size impact acceptable

## Maintainability
- [ ] Functions/methods have single responsibility
- [ ] Naming is clear and consistent
- [ ] No magic numbers or strings
- [ ] Dead code removed
- [ ] Comments explain "why", not "what"
- [ ] Follows existing codebase patterns
- [ ] Dependencies flow in one direction

## Tests
- [ ] Critical paths have test coverage
- [ ] Tests assert behavior, not implementation
- [ ] Edge cases tested (null, empty, error)
- [ ] Tests are readable and maintainable
- [ ] No flaky tests (timing, order-dependent)

## Configuration & Infrastructure
- [ ] Resource limits set (CPU, memory)
- [ ] Health checks defined
- [ ] Secrets via env vars or secret manager
- [ ] Migrations are reversible and production-safe

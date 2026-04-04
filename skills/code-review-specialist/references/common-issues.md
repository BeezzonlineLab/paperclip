# Common Issues

## N+1 Queries
**Symptom:** Loop that makes a DB query per iteration.
**Fix:** Use bulk loading (prefetch_related, JOIN, IN clause).

## Magic Numbers
**Symptom:** Hardcoded numeric/string literals without context.
**Fix:** Extract to named constants.

## Missing Error Handling
**Symptom:** Bare try/except, swallowed exceptions, missing error responses.
**Fix:** Catch specific exceptions, log context, return proper HTTP status.

## Hardcoded Secrets
**Symptom:** API keys, passwords, tokens in source code.
**Fix:** Environment variables, secret manager, .env files (gitignored).

## Missing Input Validation
**Symptom:** User input used directly without sanitization.
**Fix:** Validate/sanitize at the boundary (serializers, middleware).

## Over-fetching Data
**Symptom:** SELECT * or loading full objects when only IDs needed.
**Fix:** Use .values(), .only(), or specific field selection.

## Missing Pagination
**Symptom:** List endpoints return all records unbounded.
**Fix:** Add limit/offset or cursor-based pagination.

## Tight Coupling
**Symptom:** Module directly imports internals of another module.
**Fix:** Define interfaces, use dependency injection.

## Missing Indexes
**Symptom:** Queries on columns without indexes.
**Fix:** Add db_index=True or create migration with index.

## Race Conditions
**Symptom:** Read-modify-write without locking.
**Fix:** Use SELECT FOR UPDATE, atomic operations, or optimistic locking.

# Spec Compliance Review

When reviewing code that implements a specification or ticket:

## Checklist
1. **Read the spec first** — understand what was requested before reading code
2. **Map requirements to code** — verify each acceptance criterion is implemented
3. **Check for extras** — flag code that goes beyond the spec (scope creep)
4. **Check for gaps** — flag spec requirements that have no corresponding code
5. **Verify edge cases** — does the spec mention error handling, limits, or boundaries?

## Report Format
```markdown
### Spec Compliance

| Requirement | Status | Notes |
|------------|--------|-------|
| [requirement 1] | ✅ Implemented | [where/how] |
| [requirement 2] | ❌ Missing | [what's needed] |
| [requirement 3] | ⚠️ Partial | [what's missing] |

**Extra code not in spec:**
- [list any additions beyond spec]

**Verdict:** [Compliant / Partially Compliant / Non-Compliant]
```

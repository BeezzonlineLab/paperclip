# Feedback Examples

## Good Feedback (Specific, Actionable, Respectful)

### Critical Issue
> **[CRITICAL] SQL injection risk** — `views.py:45`
> The query uses f-string interpolation with user input:
> ```python
> cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
> ```
> Use parameterized queries instead:
> ```python
> cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
> ```

### Major Issue
> **[MAJOR] N+1 query** — `serializers.py:23`
> This will execute one query per order in the loop. Consider:
> ```python
> orders = Order.objects.select_related('customer').filter(...)
> ```

### Minor Issue
> **[MINOR] Naming** — `utils.py:12`
> `process_data()` is vague. Consider `calculate_monthly_revenue()` to match what it actually does.

### Positive Feedback
> **[PRAISE]** Great use of `select_related` here — this avoids the N+1 issue that was in the previous version. Clean!

## Bad Feedback (Avoid These)

- ❌ "This is wrong." (no explanation)
- ❌ "Why would you do it this way?" (condescending)
- ❌ "Use camelCase not snake_case." (style nit when linter exists)
- ❌ "I would have done it differently." (personal preference)
- ❌ "LGTM" (no substance)

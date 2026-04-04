---
name: cloudeefly-test-plan
description: >
  Execute the test plan from a PR after CTO approval. Use when you receive a
  "test-plan-execution" task. Run each test step, capture results, post to the
  PR, and label it when all tests pass.
---

# Test Plan Execution

Use this skill when you receive a task to execute a test plan after CTO review approval.

## When This Triggers

The CTO approved your PR. He created a subtask assigned to you: "Execute test plan for PR #N". Your job is to run every test from the PR's test plan, post results, and label the PR.

## Execution Protocol

### Step 1: Read the Test Plan

The test plan is in the PR description under `## Test Plan` or `## Test plan`. Read it carefully.

```bash
gh pr view {PR_NUMBER} --repo BeezzonlineLab/{repo} --json body --jq '.body'
```

Extract each test step. A test plan looks like:

```markdown
## Test Plan
- [ ] Unit tests pass: `pnpm test`
- [ ] API endpoint returns 200: `curl -s http://localhost:8001/api/v1/...`
- [ ] Deployment works in dev namespace
- [ ] No regression on existing features
```

### Step 2: Execute Each Test

For each test step:
1. Run the command or verify the condition
2. Record: PASS or FAIL with output
3. If FAIL: note the error, try to fix if obvious, otherwise report

```bash
# Example: run unit tests
cd /path/to/repo
pnpm test 2>&1 | tail -20
# Record: PASS (42 tests, 0 failures) or FAIL (error details)
```

### Step 3: Post Results on the PR

Post a structured comment on the GitHub PR with all results:

```bash
gh pr comment {PR_NUMBER} --repo BeezzonlineLab/{repo} --body "$(cat << 'RESULTS'
## Test Plan Execution Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Unit tests pass | ✅ PASS | 42 tests, 0 failures |
| 2 | API returns 200 | ✅ PASS | Response in 120ms |
| 3 | Dev deployment | ✅ PASS | Pod running, health OK |
| 4 | No regression | ✅ PASS | Existing endpoints verified |

**Overall: ALL TESTS PASSED**

This PR is ready for final review and merge by @sype.
RESULTS
)"
```

If any test fails:

```bash
gh pr comment {PR_NUMBER} --repo BeezzonlineLab/{repo} --body "$(cat << 'RESULTS'
## Test Plan Execution Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Unit tests pass | ✅ PASS | 42 tests, 0 failures |
| 2 | API returns 200 | ❌ FAIL | HTTP 500 — see error below |

**FAILED TEST DETAILS:**
```
Error: Internal Server Error
Traceback: ...
```

**Overall: 1 FAILURE — PR NOT READY FOR MERGE**

@CTO — test plan execution found failures. Fix needed before merge.
RESULTS
)"
```

### Step 4: Label the PR

If ALL tests pass:
```bash
gh pr edit {PR_NUMBER} --repo BeezzonlineLab/{repo} --add-label "tests-passed"
```

If any test fails:
```bash
gh pr edit {PR_NUMBER} --repo BeezzonlineLab/{repo} --add-label "tests-failed"
```

### Step 5: Update Paperclip Issue

- If all pass: mark your test-plan task as `done`, comment "All tests passed, PR labeled tests-passed"
- If failures: mark as `blocked`, comment with which tests failed

## Merge Readiness Checklist

A PR is ready for Sebastien to merge when it has ALL of these:

- ✅ CTO review: approved
- ✅ Label: `tests-passed`
- ✅ No unresolved review comments
- ✅ Branch is up to date with `develop`

## Important Rules

- **Run tests in a worktree** — don't pollute the main checkout
- **KUBECONFIG=~/.kube/karisimbiv4** for any kubectl commands in tests
- **Never skip a test step** — run them all even if one fails
- **Post results even if all pass** — Sebastien needs the evidence
- **Don't merge** — only Sebastien merges

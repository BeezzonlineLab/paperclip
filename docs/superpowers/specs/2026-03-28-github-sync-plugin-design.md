# GitHub Sync Plugin Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Plugin ID:** `paperclip.github-sync`

## Overview

A Paperclip plugin that provides full bidirectional synchronization between GitHub and Paperclip: issues, statuses, agent assignment via labels, and PR creation by agents. Deployed as a single-tenant plugin for the platform's own GitHub organization.

**Architecture:** All-in-one plugin using the Paperclip Plugin SDK (webhooks, jobs, events, state, http). No external services required.

## Scope

- Bidirectional issue sync (GitHub <-> Paperclip)
- Agent assignment via GitHub labels (`agent:<urlKey>`)
- PR creation by agents when work is completed
- Status sync in both directions
- Hybrid webhook + polling for reliability

## Plugin Manifest

**ID:** `paperclip.github-sync`
**Categories:** `["connector", "automation"]`

### Capabilities

- `issues.read`, `issues.create`, `issues.update`
- `agents.read`
- `companies.read`
- `projects.read`
- `plugin.state.read`, `plugin.state.write`
- `events.subscribe`
- `jobs.schedule`
- `http.outbound`
- `secrets.read-ref`
- `activity.log.write`
- `metrics.write`
- `webhooks.receive`

### Instance Configuration Schema

```json
{
  "type": "object",
  "properties": {
    "githubAppId": {
      "type": "string",
      "description": "GitHub App ID"
    },
    "githubInstallationId": {
      "type": "string",
      "description": "Installation ID on the target org"
    },
    "privateKeySecret": {
      "type": "string",
      "description": "Secret reference to the GitHub App private key (PEM)"
    },
    "orgName": {
      "type": "string",
      "description": "GitHub organization name"
    },
    "companyId": {
      "type": "string",
      "description": "Paperclip company ID to sync with"
    },
    "pollIntervalMinutes": {
      "type": "number",
      "default": 5,
      "minimum": 1,
      "maximum": 30,
      "description": "Polling interval in minutes"
    },
    "syncLabelsPrefix": {
      "type": "string",
      "default": "agent:",
      "description": "Prefix for agent assignment labels"
    },
    "webhookSecretRef": {
      "type": "string",
      "description": "Secret reference for the webhook validation secret (resolved via ctx.secrets)"
    }
  },
  "required": ["githubAppId", "githubInstallationId", "privateKeySecret", "orgName", "companyId", "webhookSecretRef"]
}
```

### Entrypoints

- **Worker:** `./dist/worker.js`
- **UI:** `./dist/ui/`

### Jobs

- `github-poll` — cron `*/5 * * * *` (configurable via `pollIntervalMinutes`)

### Webhooks

- `github-events` — receives GitHub webhook payloads

### UI Slots

- `dashboardWidget` — sync status overview
- `instanceSettings` — configuration form
- `detailTab` — GitHub info tab on issues

### Required GitHub App Permissions

| Permission | Access | Usage |
|-----------|--------|-------|
| `issues` | read/write | Read/comment on issues, manage labels |
| `pull_requests` | read/write | Create PRs |
| `contents` | read/write | Create branches, push commits |
| `metadata` | read | Basic repo access |

## Mapping Rules

### Org to Company

One GitHub organization maps to one Paperclip company (configured via `companyId`).

### Repo to Project

Each repo in the org maps to a Paperclip project:
- Project name = `repo.name`
- **SDK limitation:** The Plugin SDK does not expose a `projects.create` method. Projects must be pre-created in Paperclip (manually or via the API). The plugin matches repos to existing projects by name using `ctx.projects.list()`.
- If no matching project exists, the plugin logs a warning and skips the repo's issues. The dashboard widget surfaces unlinked repos so the operator can create the project.
- Stored in state: `repo:{org/repo}:projectId`

### Agent Assignment

Convention-based via labels:
- Label `agent:odoo-expert` on a GitHub issue -> plugin resolves agent with `urlKey === "odoo-expert"` -> sets `assigneeAgentId`
- **Implementation note:** `ctx.agents.list()` does not support filtering by `urlKey`. The plugin lists all agents for the company and filters client-side. The result is cached in state for 5 minutes to avoid repeated API calls.
- Label removed -> `assigneeAgentId` set to `null`
- If agent not found -> issue imported without assignment, comment posted on GitHub: "Agent `xxx` not found in Paperclip"

### Status Mapping

| GitHub Event | Paperclip Status |
|-------------|-----------------|
| Issue opened | `todo` |
| Label `agent:*` added | Agent assigned (status unchanged) |
| Agent checks out issue | `in_progress` |
| Agent completes work | `in_review` |
| PR merged | `done` |
| Issue closed manually | `cancelled` |

**Status transition errors:** If a status transition is rejected by Paperclip (e.g., invalid transition path), the plugin logs the error, posts a comment on GitHub ("Status sync failed: {reason}"), and skips the update. The issue remains in its current Paperclip status.

## Data Flow

### Inbound (GitHub -> Paperclip)

**Triggers:** webhook events `issues`, `pull_request` + polling fallback

**Issue opened/modified:**
1. Webhook or poll detects the event
2. Plugin checks if repo has a corresponding Paperclip project (looks up `repo:{org/repo}:projectId` in state, or resolves via `ctx.projects.list()` matching by name)
3. Looks up the issue mapping in plugin state via key `issue:{org/repo}#{number}:paperclipId`
4. If new -> `ctx.issues.create()` with status `todo`, title, description, mapped labels
5. Stores bidirectional mapping in state: `issue:{org/repo}#{number}:paperclipId` and `issue:{paperclipIssueId}:githubRef`
6. If existing -> `ctx.issues.update()` with changed fields
7. If a label `agent:xxx` is present -> resolves agent via cached agent list (filtered client-side by `urlKey === "xxx"`) -> sets `assigneeAgentId`
8. If `agent:*` label removed -> unassign (`assigneeAgentId: null`)

**Issue closed on GitHub:**
- Corresponding Paperclip issue -> status `cancelled`

**PR merged on GitHub:**
- Plugin looks up linked Paperclip issue via state key `pr:{org/repo}#{prNumber}:paperclipIssueId`
- If found and status is `in_review` -> transitions to `done`

### Outbound (Paperclip -> GitHub)

**Triggers:** events `issue.updated`, `issue.created`

**Agent checks out issue (-> `in_progress`):**
1. Plugin posts comment on GitHub issue: "Taken by agent **{agent.name}**"
2. Updates GitHub label: adds `status:in-progress`

**Agent completes work (-> `in_review`):**
1. If agent produced code -> plugin creates branch, pushes code, opens PR (see PR Creation section)
2. Posts comment on GitHub issue with PR link
3. Updates label: `status:in-review`
4. Stores PR mapping in state: `pr:{org/repo}#{prNumber}:paperclipIssueId`

**Issue transitions to `done`:**
1. Posts summary comment on GitHub issue
2. Updates label: `status:done`

### Anti-Loop Mechanism

To prevent infinite sync loops (Paperclip update -> GitHub webhook -> Paperclip re-update -> ...):

- Each outbound mutation tags the GitHub comment/issue update with a **sync nonce** — a hidden HTML comment embedded in the body: `<!-- paperclip-sync:{nonce} -->` where `{nonce}` is a unique ID
- The nonce is also stored in state: `sync:{org/repo}#{number}:nonce`
- When an inbound webhook arrives, the plugin checks for the nonce marker in the event payload. If the nonce matches a recently stored outbound nonce, the event is skipped
- Nonces are expired after 1 hour
- Comments posted by the GitHub App are additionally identified by their `author.id` (the app itself) and ignored inbound

## PR Creation by Agents

### Flow

1. Agent works in a Paperclip execution workspace (clone of the repo)
2. Agent transitions issue to `in_review` -> `issue.updated` event triggers the plugin
3. Plugin checks the execution workspace for code changes (via workspace metadata on the issue)
4. Plugin uses `ctx.http` to interact with GitHub API:
   - Creates branch `agent/{agent.urlKey}/issue-{issueNumber}` from `main`/`master`
   - Pushes commits via Git Trees + Create Commit + Update Ref API
   - Opens PR with:
     - Title: `[Agent: {agent.name}] {issue.title}`
     - Body: issue description + link to Paperclip issue
     - No `Closes #` reference
5. Plugin stores PR mapping in state: `pr:{org/repo}#{prNumber}:paperclipIssueId` (reverse: `issue:{paperclipIssueId}:prRef` = `org/repo#prNumber`)
6. Plugin comments on the GitHub issue with the PR link

### Branch Naming

- Default: `agent/{agent.urlKey}/issue-{issueNumber}`
- Conflict handling: suffix with timestamp `agent/{agent.urlKey}/issue-{issueNumber}-{timestamp}`

### Limitations

- Code pushed via GitHub API (Trees/Blobs/Commits), not git CLI — limited to reasonable commit sizes
- Branch source is the repo's default branch; configurable at project workspace level
- No automatic merge, no reviewer assignment, no CI/CD trigger (GitHub handles that natively)

### GitHub App Token Management

GitHub App installation tokens expire after 1 hour. The plugin:
1. Generates a JWT from the private key (PEM) with the App ID
2. Exchanges the JWT for an installation access token via `POST /app/installations/{installation_id}/access_tokens`
3. Caches the token in memory with its expiry timestamp
4. Refreshes the token 5 minutes before expiry
5. On token refresh failure, logs error and sets health to `degraded`

## Polling & Resilience

### Webhook Endpoint

- **Route:** `/webhooks/github-events`
- **Validation:** Verifies `X-Hub-Signature-256` with the webhook secret (resolved via `ctx.secrets.resolve(config.webhookSecretRef)`)
- **Subscribed events:** `issues` (covers opened, closed, labeled, unlabeled), `pull_request` (covers merged)
- **Response:** immediate 200 OK, synchronous processing (low volume in single-tenant). If processing takes >8s, the handler defers to the next poll cycle to avoid GitHub webhook timeout.

### Polling Job

- **ID:** `github-poll`
- **Cron:** `*/5 * * * *` (configurable)
- **Logic:**
  1. Retrieves cursor `lastPollAt` from `ctx.state`
  2. Calls `GET /repos/{owner}/{repo}/issues?since={lastPollAt}&state=all&sort=updated` for each tracked repo (more reliable than the Events API which has a 300-event hard cap)
  3. For each updated issue, runs the same inbound sync logic as the webhook handler
  4. Checks recently merged PRs via `GET /repos/{owner}/{repo}/pulls?state=closed&sort=updated&since={lastPollAt}`
  5. Updates cursor in state

### Repo Discovery

- On startup and hourly, plugin lists org repos via `GET /orgs/{org}/repos`
- New repos automatically added to tracking (if a matching Paperclip project exists)
- Archived/deleted repos removed from tracking
- Unmatched repos surfaced in the dashboard widget
- State stores: `{ repos: ["org/repo1", "org/repo2", ...] }`

### Deduplication

- Each GitHub issue/PR has a unique `{repo}#{number}` + `updated_at` timestamp
- Plugin stores the last known `updated_at` per issue in state
- If the incoming `updated_at` matches the stored value, the event is skipped
- Ring buffer of last 1000 processed webhook delivery IDs (configurable) for webhook-specific deduplication via `X-GitHub-Delivery` header

### Rate Limiting

- GitHub API allows 5000 req/h for a GitHub App
- Plugin tracks `X-RateLimit-Remaining` header
- If < 100 remaining -> poll skips this cycle, logs warning
- Outbound calls (comments, PRs) are prioritized over polling

### Retry

- On 5xx or timeout: retry 3 times with exponential backoff (1s, 4s, 16s)
- 4xx errors (except 429) are not retried
- 429 (rate limit): wait for `Retry-After` duration

## State Management

### State Keys (via `ctx.state`, company-scoped)

| Key | Type | Description |
|-----|------|-------------|
| `repos` | `string[]` | List of tracked repos (`org/repo`) |
| `unlinked-repos` | `string[]` | Repos with no matching Paperclip project |
| `repo:{org/repo}:cursor` | `{ lastPollAt, etag }` | Polling cursor per repo |
| `repo:{org/repo}:projectId` | `string` | Mapped Paperclip project ID |
| `issue:{org/repo}#{number}:paperclipId` | `string` | GitHub issue -> Paperclip issue mapping |
| `issue:{paperclipIssueId}:githubRef` | `string` | Reverse mapping Paperclip -> `org/repo#number` |
| `pr:{org/repo}#{prNumber}:paperclipIssueId` | `string` | PR -> Paperclip issue mapping |
| `issue:{paperclipIssueId}:prRef` | `string` | Reverse: Paperclip issue -> PR ref |
| `sync:{org/repo}#{number}:nonce` | `string` | Anti-loop nonce |
| `processed-deliveries` | `string[]` | Ring buffer of last 1000 webhook delivery IDs |
| `issue:{org/repo}#{number}:updatedAt` | `string` | Last known `updated_at` for dedup |
| `rate-limit` | `{ remaining, resetAt }` | GitHub rate limit state |
| `agents-cache` | `{ agents, cachedAt }` | Cached agent list for urlKey resolution |

### Why Not `ctx.entities`?

Custom entities are better suited for structured objects with complex queries. Here we primarily need key-based lookups — `ctx.state` (key-value) is simpler and sufficient. If repo/issue volume grows significantly, mappings can be migrated to entities with `ctx.entities.upsert()` and `ctx.entities.list()` for queryable records.

### Cleanup

- Sync nonces older than 1 hour are purged by the polling job
- Mappings for issues closed/cancelled for 30+ days are preserved for history
- Delivery ID ring buffer is self-cleaning (FIFO)

### Initial Sync (First Run)

1. Lists all org repos
2. For each repo, matches against existing Paperclip projects by name via `ctx.projects.list()`
3. Unmatched repos added to `unlinked-repos` state and surfaced in dashboard
4. For matched repos, imports open issues (paginated)
5. Issues with `agent:*` labels get agent assignment
6. Sets cursors to "now" — no full historical sync
7. Logs summary in activity: "Initial sync: {n} repos linked, {m} issues imported, {k} repos unlinked"

## UI

### Dashboard Widget (`dashboardWidget`)

Compact widget showing:
- **Connection status:** connected/disconnected to GitHub org, last successful sync
- **Counters:** synced issues, agent-opened PRs, processed events (24h)
- **Unlinked repos:** list of repos with no matching Paperclip project (with action hint to create the project)
- **Recent activity:** last 5 sync events (issue imported, PR created, status updated)

### Settings Panel (`instanceSettings`)

Configuration form:
- GitHub App ID, Installation ID
- Private key (secret reference field)
- Org name
- Target Paperclip company (dropdown)
- Polling interval (slider, 1-30 min)
- Agent label prefix (default `agent:`)
- Webhook secret (secret reference field)
- "Test connection" button — verifies GitHub API access
- "Force sync now" button — triggers immediate poll

### Issue Detail Tab (`detailTab`)

A "GitHub" tab on synced issues showing:
- Direct link to the GitHub issue
- Sync status (last update, direction)
- Linked PRs (if any) with status (open, merged, closed)
- History of bot-posted comments

## Error Handling

| Scenario | Behavior |
|----------|----------|
| GitHub token expired/invalid | Plugin goes `error` health status, logs error, dashboard widget shows "Disconnected" |
| Repo deleted/inaccessible | Removed from `repos` list, existing issues untouched |
| Agent `urlKey` not found for label | Issue imported without assignment, comment posted on GitHub: "Agent `xxx` not found in Paperclip" |
| Paperclip issue deleted manually | Mapping preserved, next inbound sync recreates the issue |
| Invalid webhook signature | Rejected with 401, logged as warning |
| Invalid company ID in config | `onHealth()` returns `error`, settings panel shows error |
| Branch conflict for PR | Timestamp suffix on branch name |
| Status transition rejected | Logged as error, comment on GitHub: "Status sync failed: {reason}", issue stays in current status |

## Observability

### Metrics (via `ctx.metrics`)

- `github_sync.events_processed` — counter by type (issue, pr) and direction (inbound, outbound)
- `github_sync.errors` — counter by error type
- `github_sync.poll_duration_ms` — histogram of polling duration
- `github_sync.api_calls` — counter of GitHub API calls
- `github_sync.rate_limit_remaining` — gauge

### Activity Log (via `ctx.activity`)

- Each significant sync (issue created/updated, PR opened, status changed) is logged
- Errors logged with context (repo, issue number, error details)

### Health Check

- `onHealth()` verifies: valid token, GitHub API accessible, last poll < 2x configured interval
- Returns `{ status: "ok" | "degraded" | "error", details: {...} }`

## SDK Limitations & Workarounds

| SDK Gap | Workaround |
|---------|-----------|
| No `projects.create` | Projects must be pre-created; plugin matches by name, surfaces unlinked repos |
| No `workProducts` API | PR-to-issue mappings stored in plugin state instead |
| No `originKind: "github"` on issues | Issue lookups via plugin state bidirectional mappings |
| No `agents.list` filter by `urlKey` | Client-side filter on full agent list, cached 5 min |
| No `issues` API for setting `originKind`/`originId` | Not set; provenance tracked entirely via plugin state |

## Out of Scope (V1)

- Multi-tenant / public GitHub App
- Automatic PR merge
- Reviewer assignment on PRs
- GitHub Discussions sync
- GitHub Projects (boards) sync
- Bidirectional comment sync (only bot-posted comments, not full thread mirroring)
- Historical sync (only open issues at first run)
- Automatic project creation (requires SDK extension)

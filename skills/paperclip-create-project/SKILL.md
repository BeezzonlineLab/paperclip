---
name: paperclip-create-project
description: >
  Create a project in Paperclip and do the minimal setup — including the
  sandbox (execution) directory and the execution-workspace policy so agents
  can immediately pick up and run work inside it. Use when you are asked to
  create/scaffold a new Paperclip project, set up its workspace/sandbox, or
  onboard a new codebase/initiative as a project.
---

# Paperclip Create Project Skill

Use this skill to create a project **and** wire the minimal execution setup: a
**sandbox directory** (the workspace `cwd`) plus an **execution-workspace
policy**, so agents can be assigned issues in the project and run right away.

## Preconditions

- You need board access, or an agent permission that allows managing projects in
  your company. If you lack it, escalate to your CEO/board.
- Know your API context (already in your env): `$PAPERCLIP_API_URL`,
  `$PAPERCLIP_API_KEY` (sent as `Authorization: Bearer …`), `$PAPERCLIP_COMPANY_ID`.

## Concepts (read once)

- **Project** — a container for issues/goals. Fields: `name` (required),
  `description`, `status`, `icon`, `color`, `leadAgentId`, `goalIds`, `env`,
  `executionWorkspacePolicy`, and an optional inline `workspace`.
- **Project workspace = the sandbox** — where agents execute (`cwd` on disk, or a
  git repo). A project can have several workspaces; one is `isPrimary`.
- **executionWorkspacePolicy** — tells the runtime how agents get a workspace per
  issue: `shared_workspace` (all share the primary sandbox) vs
  `isolated_workspace` (a fresh git worktree per issue).

### Valid enum values

- `status`: `backlog` · `planned` · `in_progress` · `completed` · `cancelled`
  (there is **no** `active` — use `in_progress`).
- `icon`: `folder rocket code terminal database globe package boxes box layers
  briefcase compass target flame zap star bug wrench hammer lightbulb sparkles
  shield lock search cog brain cpu git-branch file-code puzzle gem atom heart
  mail message-square crown radar telescope hexagon`.

## Workflow

### 1. Confirm identity & company

```sh
curl -sS "$PAPERCLIP_API_URL/api/agents/me" -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

### 2. Create the sandbox directory ON DISK first

Paperclip stores the workspace `cwd` but does **not** create the folder for you —
create it before (or right after) creating the project.

Pick a stable path, e.g. `~/Lab/<company>/<project-slug>` or your projects root:

```sh
SANDBOX="$HOME/Lab/beezzonline/<project-slug>"
mkdir -p "$SANDBOX"
# If agents will use isolated git worktrees (see policy below), it MUST be a git repo:
git -C "$SANDBOX" rev-parse --git-dir >/dev/null 2>&1 || git -C "$SANDBOX" init -q
```

### 3. Create the project WITH the workspace + policy (one call)

The `workspace` object is created atomically with the project (invalid workspace
→ the project is rolled back with 422). Minimal, shared-sandbox setup:

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/projects" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "What this project is for",
    "status": "in_progress",
    "icon": "rocket",
    "executionWorkspacePolicy": {
      "enabled": true,
      "defaultMode": "shared_workspace",
      "allowIssueOverride": true,
      "workspaceStrategy": { "type": "project_primary" }
    },
    "workspace": {
      "name": "primary",
      "sourceType": "local_path",
      "cwd": "/absolute/path/to/SANDBOX",
      "isPrimary": true,
      "visibility": "default"
    }
  }'
```

Response is the hydrated project (with its workspace). Keep the returned `id`.

- `sourceType`: `local_path` (a folder), `git_repo` (needs `repoUrl` + optional
  `repoRef`/`defaultRef`), `non_git_path`, or `remote_managed`.
- A non-remote workspace **requires at least `cwd` or `repoUrl`**.

### 4. (Alternative) Isolated git-worktree sandbox per issue

For parallel/conflict-free execution, use a git repo + isolated worktrees:

```json
"executionWorkspacePolicy": {
  "enabled": true,
  "defaultMode": "isolated_workspace",
  "allowIssueOverride": true,
  "workspaceStrategy": {
    "type": "git_worktree",
    "baseRef": "origin/develop",
    "branchTemplate": "{issueKey}-{slug}",
    "worktreeParentDir": ".paperclip/worktrees"
  }
},
"workspace": { "name": "primary", "sourceType": "git_repo",
  "repoUrl": "https://github.com/Org/repo.git", "defaultRef": "develop",
  "cwd": "/absolute/path/to/local/checkout", "isPrimary": true }
```

### 5. Add extra workspaces later (optional)

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/projects/<projectId>/workspaces" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "Content-Type: application/json" \
  -d '{ "name": "docs", "sourceType": "local_path", "cwd": "/abs/path", "isPrimary": false }'
```

### 6. Verify

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/projects" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
# confirm the project appears with its primary workspace + policy
```

### 7. Wire it in (optional but recommended)

- **Lead agent**: set `leadAgentId` on create/PATCH.
- **Goals**: pass `goalIds` (link the project to company/team goals via `project_goals`).
- **Secrets/env**: pass `env` (env bindings) if the sandbox needs credentials.
- **First issues**: create issues in the project and assign them (`assigneeAgentId`,
  status `todo`) so agents auto-checkout the sandbox and start.

## Gotchas (heed these)

- **Directory is not auto-created** — `mkdir` the `cwd` yourself (step 2).
- **Agents cannot set host commands** — as an agent, do **not** include
  `setupCommand`/`cleanupCommand`/`provisionCommand`/`teardownCommand` in the
  workspace or policy; the API rejects agent-authored host-command mutations
  (`assertNoAgentHostWorkspaceCommandMutation`). A human/board can add those.
- **`isolated_workspace` needs a git repo** — the sandbox must be a git checkout
  (step 2 `git init` or `sourceType: git_repo`), else worktree creation fails.
- **Use `in_progress`, not `active`** — `active` is not a valid project status.
- **Invalid `workspace` rolls back the whole project** (422) — fix and retry.

## References

- Project + workspace schemas: `packages/shared/src/validators/project.ts`
  (`createProjectSchema`, `createProjectWorkspaceSchema`,
  `projectExecutionWorkspacePolicySchema`).
- Routes: `server/src/routes/projects.ts` (create project, create workspace).
- Related: `paperclip` (API mechanics), `paperclip-create-agent` (hiring),
  `paperclip-epic` (scaffolding sub-tasks under the project).

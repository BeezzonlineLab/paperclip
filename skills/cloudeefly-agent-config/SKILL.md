---
name: cloudeefly-agent-config
description: >
  How to update agent instructions and skills in Paperclip via the API. Use when
  you need to modify an agent's behavior, add capabilities, update strategy, or
  evolve skills. All changes go through the REST API.
---

# Agent Configuration & Skills Management (API)

Use this skill when you need to propose or apply changes to agent instructions or company skills via the Paperclip API.

## Agent Instructions API

### Read an Agent's Instruction Bundle

```bash
GET /api/agents/{agentId}/instructions-bundle
```

Returns the full bundle: mode, root path, entry file, and file list.

### Read a Specific Instruction File

```bash
GET /api/agents/{agentId}/instructions-bundle/file?path=AGENTS.md
```

Returns the file content. Valid paths: `AGENTS.md`, `HEARTBEAT.md`, `STRATEGY.md`, `SOUL.md`, `TOOLS.md`.

### Write/Update an Instruction File

```bash
PUT /api/agents/{agentId}/instructions-bundle/file
Content-Type: application/json

{
  "path": "AGENTS.md",
  "content": "You are the Django Specialist at Cloudeefly..."
}
```

Creates or overwrites the file. Changes take effect on the agent's next heartbeat — no restart needed.

### Update Bundle Configuration

```bash
PATCH /api/agents/{agentId}/instructions-bundle

{
  "mode": "managed",
  "entryFile": "AGENTS.md"
}
```

### Examples

```bash
# Read CEO's current instructions
curl -s "http://localhost:3100/api/agents/{ceo-id}/instructions-bundle/file?path=AGENTS.md"

# Update Django Specialist's heartbeat
curl -s -X PUT "http://localhost:3100/api/agents/{agent-id}/instructions-bundle/file" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "HEARTBEAT.md",
    "content": "# HEARTBEAT.md\n\n## 1. Identity\n..."
  }'

# Update STRATEGY.md for all agents (loop)
STRATEGY=$(cat strategy-content.md)
for AGENT_ID in id1 id2 id3; do
  curl -s -X PUT "http://localhost:3100/api/agents/$AGENT_ID/instructions-bundle/file" \
    -H "Content-Type: application/json" \
    -d "{\"path\": \"STRATEGY.md\", \"content\": $(echo "$STRATEGY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}"
done
```

## Instruction File Conventions

| File | Purpose | Present on |
|------|---------|-----------|
| `AGENTS.md` | Role, responsibilities, delegation rules, routing table | All agents |
| `HEARTBEAT.md` | Step-by-step checklist run every heartbeat | All agents |
| `STRATEGY.md` | Shared product vision, OKRs, constraints, deadlines | All agents (same content) |
| `SOUL.md` | Persona, voice, tone | CEO only |
| `TOOLS.md` | Tool notes | CEO only |

### What Goes Where

**AGENTS.md:** Identity ("You are the X"), team structure, routing table, launch focus, technical standards, safety rules, references to other files.

**HEARTBEAT.md:** Numbered checklist: identity check → get assignments → checkout → work → update status → exit. Keep it procedural, not prose.

**STRATEGY.md:** Product vision, current priority, deadline, OKRs, team routing, tech stack, repos, constraints. Shared across all agents — update all when it changes.

## Company Skills API

### List All Skills

```bash
GET /api/companies/{companyId}/skills
```

### Get Skill Detail

```bash
GET /api/companies/{companyId}/skills/{skillId}
```

### Create a New Skill

```bash
POST /api/companies/{companyId}/skills
Content-Type: application/json

{
  "name": "my-new-skill",
  "slug": "my-new-skill",
  "markdown": "---\nname: my-new-skill\ndescription: >\n  What this skill does.\n---\n\n# My Skill\n\nSkill content here."
}
```

### Update a Skill File

```bash
PATCH /api/companies/{companyId}/skills/{skillId}/files
Content-Type: application/json

{
  "path": "SKILL.md",
  "content": "---\nname: my-skill\ndescription: Updated description\n---\n\n# Updated content"
}
```

### Delete a Skill

```bash
DELETE /api/companies/{companyId}/skills/{skillId}
```

### Import Skills from Source

```bash
POST /api/companies/{companyId}/skills/import
Content-Type: application/json

{
  "source": "https://github.com/org/repo/tree/main/skills/my-skill"
}
```

## Assigning Skills to Agents

Skills are assigned via the agent's `adapterConfig.paperclipSkillSync.desiredSkills`:

```bash
PATCH /api/agents/{agentId}
Content-Type: application/json

{
  "adapterConfig": {
    "paperclipSkillSync": {
      "desiredSkills": [
        "paperclipai/paperclip/paperclip",
        "paperclipai/paperclip/cloudeefly-deploy",
        "paperclipai/paperclip/cloudeefly-agent-config"
      ]
    }
  }
}
```

### Skill Key Format

`{org}/{repo}/{slug}` — e.g., `paperclipai/paperclip/cloudeefly-deploy`

### Current Skill Assignments

| Skill | Agents |
|-------|--------|
| `paperclip` | All agents |
| `paperclip-create-agent` | CEO, CTO |
| `cloudeefly-deploy` | Django Specialist, DevOps Specialist, CTO, Product Manager |
| `cloudeefly-api-patterns` | Django Specialist, Code Reviewer |
| `cloudeefly-ui-patterns` | React Specialist, UI Designer, Code Reviewer |
| `cloudeefly-gitops` | DevOps Specialist, CTO |
| `cloudeefly-billing` | Django Specialist, React Specialist |
| `cloudeefly-agent-config` | All agents |

## Workflow: Proposing an Evolution

1. **Read current state** — `GET /api/agents/{id}/instructions-bundle/file?path=AGENTS.md`
2. **Draft changes** — modify the content
3. **Write updated file** — `PUT /api/agents/{id}/instructions-bundle/file`
4. **If STRATEGY.md** — update for all agents (loop through agent IDs)
5. **If new skill needed** — create via `POST /api/companies/{id}/skills`, then assign to agents via `PATCH /api/agents/{id}`
6. **Verify** — changes take effect on next heartbeat, check agent behavior

## Agent IDs Quick Reference

| Agent | ID |
|-------|----|
| CEO | `f1f18f28-189c-4f98-9b11-61790df57e77` |
| CTO | `8b450bd9-cce1-41c7-9367-02e44a8c2eda` |
| Django Specialist | `1c97aee2-7afb-4866-aeac-67502bd20794` |
| React Specialist | `770eea42-35be-4e74-9245-01d5f1970e4b` |
| DevOps Specialist | `990583f3-6f5a-4c5b-be8c-dff57eda5c28` |
| Code Reviewer | `671119a6-ae95-4128-99bc-42912f036c63` |
| Product Manager | `dd2ff131-d2ea-4767-9c63-d00752dd06b9` |
| UI Designer | `abdbd10e-8c36-450e-b546-937c3f3bc68b` |
| Paperclip Engineer | `e262b0cd-3b1b-4f57-97c2-9484d3c1bfe3` |

**Company ID:** `61a49080-8126-4ec4-9e6e-db8c237312ff`

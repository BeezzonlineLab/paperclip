---
name: skill-creator
description: >
  Create, modify, and improve Paperclip skills for your team agents. Use when
  you need to create a new skill from scratch, improve an existing skill, or
  adapt an external skill to the Cloudeefly context. Available to CEO and CTO
  for continuous improvement of agent capabilities.
---

# Skill Creator for Paperclip

Create and evolve skills for your team of agents. Skills are reusable capability modules that teach agents how to do specific tasks.

## When to Use This Skill

- An agent repeatedly makes the same mistake → create a skill to teach the correct pattern
- A new tool or workflow is introduced → create a skill so agents know how to use it
- An external skill needs adaptation to our stack → fork and customize it
- An agent's output quality needs improvement → enhance their existing skill
- A new team capability is needed → design and deploy a skill

## Who Can Use This

- **CEO**: Creates skills for strategic/coordination capabilities
- **CTO**: Creates skills for technical/engineering capabilities
- Route: CEO creates → assigns to CTO or direct reports. CTO creates → assigns to specialists.

## Skill Anatomy

```
skills/my-skill/
├── SKILL.md              # Required: frontmatter + instructions
└── references/           # Optional: detailed docs loaded on demand
    ├── patterns.md
    └── examples.md
```

### SKILL.md Structure

```markdown
---
name: my-skill-name
description: >
  One paragraph: when to use this skill and what it does. Be specific
  about triggers. Include keywords agents will encounter.
---

# Skill Title

## When to Use This Skill
[Specific situations that trigger this skill]

## Core Workflow
[Step-by-step process]

## Reference Guide
[Table pointing to references/ files with "Load When" column]

## Constraints
### MUST DO
### MUST NOT DO

## Output Template
[Expected output format]
```

## Creation Workflow

### Step 1: Identify the Need

Ask yourself:
- What problem does this skill solve?
- Which agent(s) will use it?
- What's the expected input? (issue, PR, code, question)
- What's the expected output? (code, document, review, action)
- Is there an existing skill that partially covers this?

### Step 2: Write the Draft

**Frontmatter (critical for triggering):**
- `name`: lowercase-with-dashes, descriptive
- `description`: Be "pushy" — include all keywords and situations that should trigger it. Agents undertrigger skills, so list explicit contexts.

**Body guidelines:**
- Keep SKILL.md under 500 lines
- Use imperative form ("Do X", not "You should do X")
- Include concrete examples with code blocks
- For complex topics, use `references/` files with a table pointing to them
- Include MUST DO / MUST NOT DO constraints
- Include output templates so agents produce consistent results

**Cloudeefly adaptation checklist:**
- [ ] Does the skill reference our stack? (Django, React, K8s, Pulumi, ArgoCD)
- [ ] Does it mention our repos? (cloudeefy, cloudeefy-infra, cloudeefy-agents)
- [ ] Does it respect our conventions? (worktrees, PR workflow, 3 merge gates)
- [ ] Does it account for multi-tenancy?
- [ ] Is the agent assignment clear? (which agents should have this skill)

### Step 3: Deploy the Skill

Skills live in `paperclip/skills/` and are auto-discovered.

**Create the skill files:**
```bash
mkdir -p skills/my-new-skill/references
# Write SKILL.md
# Write references/*.md if needed
```

**Assign to agents via API:**
```bash
curl -X PATCH "http://localhost:3100/api/agents/{agentId}" \
  -H "Content-Type: application/json" \
  -d '{
    "adapterConfig": {
      "paperclipSkillSync": {
        "desiredSkills": [
          "paperclipai/paperclip/paperclip",
          "paperclipai/paperclip/my-new-skill",
          ... existing skills ...
        ]
      }
    }
  }'
```

**Important:** When adding a skill, include ALL existing skills in the array — it replaces, not appends.

### Step 4: Verify

- The skill appears in `GET /api/companies/{companyId}/skills`
- The agent has it in their `adapterConfig.paperclipSkillSync.desiredSkills`
- On next heartbeat, the agent loads the skill

### Step 5: Iterate

After the agent uses the skill:
- Check the output quality (review comments, task results)
- If output is wrong → update the skill's constraints or examples
- If the skill doesn't trigger → make the description more "pushy" with more keywords
- If it triggers too often → narrow the description

## Writing Good Skills — Patterns

### Pattern: Checklist Skill
For review or validation tasks:
```markdown
## Checklist
- [ ] Item 1 — description
- [ ] Item 2 — description

## For Each Item
1. Check [what]
2. If [condition] → [action]
3. Report [format]
```

### Pattern: Workflow Skill
For multi-step processes:
```markdown
## Core Workflow
1. **Step Name** — description
2. **Step Name** — description

## Reference Guide
| Topic | Reference | Load When |
|-------|-----------|-----------|
| Details | `references/details.md` | When doing step 2 |
```

### Pattern: Template Skill
For consistent output formats:
```markdown
## Output Template
```[format]
# Title
## Section 1
[content]
## Section 2
[content]
```

Always use this exact template. Do not deviate.
```

### Pattern: Stack-Specific Skill
For Cloudeefly technical skills:
```markdown
## Cloudeefly Context
- Stack: [relevant parts of our stack]
- Repo: [which repo]
- Agent: [which agent uses this]

## Patterns (our conventions)
[Code examples following OUR patterns, not generic ones]

## Anti-Patterns (what NOT to do in our codebase)
[Common mistakes specific to our setup]
```

## Current Skills Inventory

| Skill | Agents | Purpose |
|-------|--------|---------|
| `paperclip` | All | API coordination |
| `paperclip-create-agent` | CEO, CTO | Agent hiring |
| `para-memory-files` | CEO | Memory system |
| `cloudeefly-deploy` | Django, DevOps, CTO, PM | App deployment |
| `cloudeefly-api-patterns` | Django, Reviewer | DRF patterns |
| `cloudeefly-ui-patterns` | React, Designer, Reviewer | React patterns |
| `cloudeefly-gitops` | DevOps, CTO | GitOps workflow |
| `cloudeefly-billing` | Django, React | Stripe billing |
| `cloudeefly-agent-config` | All | Agent/skill management |
| `cloudeefly-test-plan` | Django, React, DevOps | PR test execution |
| `elite-code-review` | CTO, Reviewer | Review protocol |
| `code-review-specialist` | CTO, Reviewer | Structured reviews |
| `kubernetes-specialist` | DevOps | K8s workloads (11 refs) |
| `golang-pro` | DevOps | Go patterns for CLI |
| `database-optimizer` | DevOps | DB tuning |
| `architecture-designer` | CTO | System design |
| `feature-forge` | PM | Feature specs |
| `pptx` | CEO | PowerPoint generation |
| `skill-creator` | CEO, CTO | This skill |

## Agent IDs for Assignment

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

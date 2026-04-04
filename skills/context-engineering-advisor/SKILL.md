---
name: context-engineering-advisor
description: >
  Optimize agent token consumption and context quality in Paperclip. Use when
  agent outputs are mediocre, token costs are escalating, heartbeat sessions
  fill up, or agents waste tokens on workarounds. Diagnoses context stuffing
  vs context engineering in agent instructions, skills, and heartbeat prompts.
---

# Context Engineering Advisor — Cloudeefly

Optimize how our AI agents consume tokens and process context. In a budget-constrained, agent-driven org, every token counts.

## Why This Matters For Us

We run 9+ agents on heartbeat cycles. Each heartbeat = tokens consumed. Problems we face:
- **CEO filled context window** → "Codex ran out of room" → wasted run
- **CTO tried workarounds without API key** → burned tokens on dead ends
- **Django Specialist worked on wrong issues** → entire heartbeat wasted
- **Product Manager ran shell commands** → out of scope, wasted tokens
- **Agents retry without clear instructions** → exponential token waste

**Goal:** Maximum useful output per token spent.

## The Core Problem: Context Stuffing vs Context Engineering

| Dimension | Context Stuffing (BAD) | Context Engineering (GOOD) |
|-----------|----------------------|---------------------------|
| **Mindset** | "Give agent everything" | "Give agent exactly what it needs" |
| **Instructions** | 2000-line AGENTS.md | Focused 200-line AGENTS.md + references |
| **Skills** | 15 skills assigned | 4-6 relevant skills assigned |
| **Heartbeat** | "Check everything every time" | "Check only what's changed" |
| **Failure** | "Retry until it works" | "Exit fast, fix structure" |
| **Metrics** | Tokens per heartbeat | Useful actions per token |

**Critical insight:** Accuracy drops below 20% when context exceeds ~32k tokens. An agent with 15 skills loaded has LESS capability than one with 5 focused skills.

## Diagnostic: 5 Questions for Agent Context Health

For each agent, ask:

### 1. What specific decision does this heartbeat support?
If the heartbeat checklist has 10 steps and the agent does 2 useful ones → the other 8 are noise.

### 2. Can retrieval replace persistence?
Skills loaded "just in case" waste context. Use `references/` files that load on demand instead of putting everything in SKILL.md.

### 3. Who owns the context boundary?
If AGENTS.md + HEARTBEAT.md + STRATEGY.md + all skills > 5000 lines → the agent is drowning. Someone needs to trim.

### 4. What fails if we exclude this?
For each skill assigned to an agent: when was it last needed? If never → remove it.

### 5. Are we fixing structure or adding tokens?
When an agent fails, the fix should be: better instructions, not more instructions.

## Agent Context Audit Template

Run this for each agent quarterly (or when token costs spike):

```markdown
## Agent: [Name]

### Current Load
- AGENTS.md: [lines] lines
- HEARTBEAT.md: [lines] lines
- STRATEGY.md: [lines] lines (shared)
- Skills assigned: [count]
- Total estimated context: [tokens]

### Efficiency Metrics
- Avg heartbeat duration: [seconds]
- Avg tokens per heartbeat: [count]
- Useful actions per heartbeat: [count]
- Wasted runs (auth fail, wrong task, out of scope): [count]/[total]

### Context Issues Found
| Issue | Type | Fix |
|-------|------|-----|
| [issue] | Stuffing / Missing / Noise | [action] |

### Recommendations
1. [Remove/add/modify skill/instruction]
2. [Optimize heartbeat checklist]
3. [Split large file into references]
```

## Optimization Tactics for Paperclip Agents

### 1. Heartbeat Optimization (biggest impact)

**Problem:** Agents run their full heartbeat checklist even when there's nothing to do.

**Fix: Fast-exit pattern**
```markdown
## 0. AUTH CHECK → exit if no key
## 1. GET assignments → exit if none
## 2. Work on highest priority
## 3. Exit
```
Don't: check team progress, check goals, check GitHub sync, extract facts — unless the agent has work to do.

### 2. Skill Diet (reduce loaded context)

**Rule of thumb:** No agent should have more than 6-7 skills. Each skill adds 100-500 lines to context.

| Agent Role | Max Skills | Why |
|-----------|-----------|-----|
| CEO (coordinator) | 5-6 | Delegates, doesn't execute |
| CTO (manager) | 7-8 | Reviews + creates skills |
| Specialists (IC) | 4-5 | Focused execution |

**How to slim:**
- Move details to `references/` (loaded on demand, not at startup)
- Remove skills the agent hasn't used in 5+ heartbeats
- Combine overlapping skills into one

### 3. Instructions Optimization

**AGENTS.md should be:**
- < 200 lines
- Role + routing table + constraints
- References to other files, not inline content

**HEARTBEAT.md should be:**
- < 50 lines
- Numbered checklist, not prose
- Fast-exit first, then work

**STRATEGY.md (shared):**
- < 150 lines
- Updated when strategy changes, not padded

### 4. The Research → Plan → Reset → Implement Cycle

When an agent's context fills up:
1. **Research phase:** Agent gathers info → context grows
2. **Plan phase:** Agent writes a summary/plan (comment on issue)
3. **Reset:** Force session reset (`POST /api/agents/{id}/runtime-state/reset-session`)
4. **Implement:** Fresh session with only the plan as context

This is why our CTO heartbeat has `step 0: auth check → exit if stale`. The session reset IS the fix.

### 5. Anti-Retry Pattern

**Problem:** Agent fails → retries with same context → same failure → burns tokens.

**Fix in instructions:**
```markdown
If PAPERCLIP_API_KEY is empty → EXIT IMMEDIATELY.
Do NOT try workarounds. Do NOT waste tokens debugging.
The system will restart you with proper credentials.
```

Apply this pattern to ALL known failure modes.

## When to Run This Diagnostic

- **Monthly:** Quick audit of all agents' token consumption
- **When costs spike:** Immediate deep dive on the expensive agent
- **When an agent fills context:** Before adding more context, audit first
- **When adding a new skill:** Check if it replaces or overlaps existing skills
- **After a failed sprint:** Were agents spending tokens on useful work?

## Token Budget Framework

```
Total monthly token budget = [limit]

Per-agent allocation:
- CEO: 10% (coordination only)
- CTO: 15% (review + architecture)
- Django Specialist: 20% (heaviest coding work)
- React Specialist: 15%
- DevOps Specialist: 15%
- Code Reviewer: 10%
- Product Manager: 5% (documents only, no code)
- UI Designer: 5% (specs only, no code)
- Paperclip Engineer: 5%
```

If an agent exceeds allocation → audit before increasing budget.

## Quick Wins Checklist

- [ ] Every heartbeat starts with auth check + fast exit
- [ ] Every agent's HEARTBEAT.md is < 50 lines
- [ ] No agent has > 8 skills
- [ ] STRATEGY.md is shared (not duplicated with variations)
- [ ] Instructions say "exit if blocked" not "try workarounds"
- [ ] Session reset used proactively after long research phases
- [ ] Skills use `references/` for details, not inline in SKILL.md

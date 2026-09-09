> Tracked mirror of the local work-state skill (.opencode/skills/work-state/SKILL.md, gitignored). This copy is what fresh clones and handover machines read. If the two disagree, update this file (it is the shared truth) and re-sync the local skill.

---
name: work-state
description: Persistent project state management. The repository is the source of truth for implementation work (TODO/ backlog, active, completed) and architecture (docs/architecture/). Use when starting, resuming, or finishing implementation tasks, after context compaction or session loss, during agent handoffs, or to keep the session todo in sync with TODO files.
version: 0.1.0
---

# Persistent Work State & Implementation Task Management

## Purpose

This skill defines how to manage implementation work so that project context survives context compaction, interrupted sessions, new agent sessions, model changes, long-running tasks, agent handoffs, and loss of in-chat todo state.

The repository is the persistent source of truth. Chat history, agent reasoning, and session todo state are temporary working state. The agent MUST keep enough information in repository files that a fresh agent can continue by reading them, with no reliance on previous conversation history.

---

## 1. Core Principle

Three durable stores, plus copied-for-working memory, never conflated:

- **TODO files** (`TODO/backlog/`, `TODO/active/`, `TODO/completed/`) describe implementation work: tasks, state, requirements/specification, progress, decisions, discovered constraints, deferred work, verification, ADR references.
- **ADRs** (`docs/architecture/`) describe permanent architectural decisions: what, why, alternatives, consequences, and the constraint future work must preserve. An ADR is not a TODO; a TODO describes work, an ADR describes a decision.
- **Session todo**: a temporary mirror of the repository TODO state. Not authoritative. Repository wins; sync the session todo to it  -  never the reverse.

### Retention hierarchy

```
                    ┌──────────────────────┐
                    │        ADRs          │
                    │   permanent truth    │
                    └──────────┬───────────┘
                               │ architectural
                               │ decisions
 ┌─────────────────────────────▼──────────────────────┐
 │                   TODO file                       │
 │                                                   │
 │  Task list        → implementation plan           │
 │  Active Subtask   → temporary working memory      │
 │  Context Summary  → session handoff               │
 │  Deferred/Skipped → known unfinished work         │
 │                                                   │
 └─────────────────────────────┬──────────────────────┘
                               │ completed
                               ▼
                        TODO/completed/
```

Everything permanent lives in the repository; the chat is disposable.

---

## 2. Structure & Lifecycle

```text
TODO/
├── backlog/    planned          (01-feature-a.md)
├── active/     in progress      (03-feature-c.md)
└── completed/  done             (00-completed-feature.md)
docs/
└── architecture/                (0001-first-decision.md)
```

`completed/` is the finished-work location. Do not call it `archived/` unless you specifically want historical-archive semantics; `active → completed` is the clearer lifecycle. ADRs remain a separate concern: implementation history lives in `TODO`, architectural truth lives in ADRs.

---

## 3. Starting a Task

1. Locate the task in `TODO/backlog/`, read it fully before touching implementation.
2. Move it to `TODO/active/`, set its status to `active`.
3. Mark the active item `[•]` and mirror it into the session todo.
4. Read referenced spec sections, check related ADRs and the `Deferred / Skipped` section.
5. If resuming existing work, read its `Context Summary` and `Active Subtask` before touching code (see §7 and §18).
6. Continue. Don't start substantial work from a title alone; the file is the persistent context.

---

## 4. Status Semantics

`[ ]` not started · `[•]` in progress · `[x]` implemented and verified.

`[x]` never means "mostly done", "code exists", "probably works", or "not important". Completion means completed and verified. Only one item is `[•]` unless work genuinely runs in parallel; the session `in_progress` item must match the `[•]` item.

---

## 5. Session Todo Synchronization

Every status change updates both the file and the session (starting: `[•]` ↔ `in_progress`; completing: `[x]` ↔ `completed`; subtasks added to a `[•]` parent are mirrored at the same depth). If they disagree: stop trusting the session list, read the file, sync from it, continue. Never edit the TODO to match stale session state.

---

## 6. Subtasks & Scope

Break large tasks into subtasks in the same file; a TODO file is one coherent unit, not one per function.

```
- [•] Implement authentication
    - [x] Add token model
    - [ ] Implement refresh
```

---

## 7. Subtask State Retention

Large tasks must retain their current working state in the TODO file so a multi-session/multi-phase task survives compaction or a new session without rediscovering work. This is temporary working memory, not a permanent action diary.

When working on any task with multiple implementation steps, keep an `## Active Subtask` section:

- **Item**  -  the exact task item in progress.
- **Status**  -  `[•]`.
- **Working State**  -  what is being implemented, what has already changed, what remains.
- **Decisions**  -  decisions made during this subtask, plus rejected approaches that would otherwise be repeated by another agent.
- **Files**  -  files being modified (or expected to be), important locations/symbols when useful.
- **Verification**  -  commands/tests already run, results, and what still needs verifying.
- **Known Issues**  -  current blockers, temporary compromises, things that must not be forgotten before marking the item `[x]`.

```md
## Active Subtask

**Item:** Complete vertical slice

**Status:** [•] in progress

### Working State
- StyleEngine resolves className → candidate rules → cascade.
- Inline styles apply after the class cascade.
- ComputedStyle is produced correctly; remaining integration is Yoga/Skia consumption.

### Decisions
- Animation will never mutate CSS strings.
- ComputedStyle is the only CSS output layout/render consumes.

### Files
- packages/engine/include/weave/ui/UINode.h
- packages/engine/src/ui/UINode.cpp

### Verification
- `npm run check`: passing
- Engine build: pending

### Known Issues
- Legacy style reads must be traced before removal.
```

Update `## Active Subtask` only at meaningful points: beginning a major subtask, discovering an important constraint, a decision that changes approach, completing a meaningful stage, hitting a blocker, or reaching a safe compaction boundary. Do not update it after every trivial edit.

When the subtask is complete: mark the item `[x]`, promote durable decisions to an ADR, move postponed work to `Deferred / Skipped`, update `## Context Summary`, and remove the finished subtask from the `Active` section  -  no stale active state. Before any intentional compaction, the `Active Subtask` section must answer, from the TODO alone: what was I implementing, what have I already changed, what is next, why this way, which files matter, what is unverified, and what must not be accidentally undone.

Temporary vs durable: `Active Subtask` = temporary working state; `Context Summary` = session handoff; task list = authoritative plan; `Deferred / Skipped` = postponed work; ADR = durable reasoning; source/tests = actual truth. When temporary info stays relevant after the subtask, promote it to the durable location before deleting the temporary block.

---

## 8. Never Lose Tasks

A task leaves the queue only by `[x]` or explicit removal (ask first). "Not now", "skip", "optimize later", "out of scope" are deferred items, recorded  -  never deleted. If an item should not be done now, move it to `Deferred / Skipped` instead of deleting it, so future agents don't rediscover the same decision.

---

## 9. Detail Specification & DONE Marking

Large TODOs carry both a task list and a spec. The task list answers "what remains?"; the spec answers "what does correct mean?". Never replace the spec with a summary or move its detail into the session todo  -  the file stays the source of truth.

When a task covering a section is fully implemented and verified, mark the heading `# 4. Cache Invalidation [DONE]` (or ` -  DONE`). Leave partially implemented sections unmarked.

---

## 10. Decisions & Requirements

Record decisions in `## `Decisions` when they change how future work behaves: architecture choice, ownership, lifecycle, state placement, sync semantics, API contract, rejected alternatives, performance/compatibility boundaries. Never leave them only in chat. Discovered requirements and unexpected problems go in `## Discovered Requirements` / get added as tasks or deferrals  -  never left to conversation memory.

```md
## Decisions
- [ADR-0012] Runtime state is separated from persisted state.
```

---

## 11. ADRs

Create an ADR when a decision has lasting architectural significance: major choices, public API, data ownership, persistence, concurrency, protocol, module boundaries, dependency direction, extensibility, compatibility, performance/security architecture, or irreversible choices. Don't create one for variable names, single functions, trivial refactors, bug fixes, formatting, simple tests, or obvious choices. Ask: will a future developer/agent need to know this was intentionally and cleanly the decision? If yes, an ADR is likely appropriate.

Structure: `# ADR-0012: Title`, `## Status`, `## Context`, `## Decision`, `## Alternatives Considered`, `## Consequences`. ADRs describe decisions, not implementation diaries. Status: `Proposed` / `Accepted` / `Superseded` / `Deprecated` / `Rejected`; a replaced ADR is marked `Superseded by ADR-XXXX`, never rewritten out of history.

---

## 12. Deferred Work

Every active TODO with delayed work has a `## Deferred / Skipped (known gaps)` section listing each item with its revisit trigger:

```md
- [ ] Replace linear lookup with indexed lookup if profiling shows lookup exceeds 1ms.
```

Anything intentionally skipped must be recorded with the condition for revisiting. If a task should not be done now, move it here  -  never delete it.

---

## 13. Progress & Verification

Keep progress light  -  important state, not a command log. This file is NOT supposed to hold a full diary.

Never mark an item `[x]` because code exists. Verify with tests, build, type check, lint, runtime, manual, perf, or migration checks and record what ran (`## Verification`). If verification can't happen, stay `[•]` and note the blocker.

---

## 14. Completion

An item is complete only when the implementation exists, edge cases are addressed, verification is recorded, gaps are completed or explicitly deferred, decisions are in the todo and ADRs, spec sections are `[DONE]`, the session todos match, and the file is ready to move to `completed/`.

On full completion of a TODO:
1. Mark all task checkboxes `[x]`.
2. Mark all fully implemented specification sections `[DONE]`.
3. Write the final `## Context Summary`.
4. Record durable decisions in an ADR and link it from the TODO.
5. Update the git commit message file at `scripts/git/git-commit-message.txt` using the conventional commit format to summarize what was changed. `scope` is the npm package, engine subsystem, or top-level package directory that owns the **committed** source (`compiler`, `engine`, `bridge`, `ui`, ...). When a change spans multiple scopes, lead with the dominant scope and note the rest in the body (e.g. `feat(compiler): ... (+engine, +bridge)`). Repo root and contents:
    - Write the file in the **git-tracked repository that contains the source actually being committed**. The path `scripts/git/git-commit-message.txt` is relative to that repository root.
    - **Vendored copies in `node_modules/` are never committed**  -  including `node_modules/@weave/*`, which are installed mirrors of `weave/packages/*`. If the real fix only exists in a `node_modules` copy, backport it to `weave/packages/<pkg>/...` source first; the node_modules copy is local-only.
    - If work spans more than one git repository, write a single message file in the repository holding the primary committed change and describe the cross-repo edits in the body. Do not write a message file whose body lists changes not present in the commit.

    Follow the pattern:
    ```
    feat(scope): primary grouped changes title

    - feat(scope): specific feature addition/detail
    - refactor(scope): refactored component/subsystem
    - chore(scope): chore description
    ```

    Commit vs. message file: writing `scripts/git/git-commit-message.txt` is **not** a `git commit` and never implies running one. Committing is governed by `AGENTS.md`  -  only commit when explicitly asked. If no git repository exists at the project root (e.g. a non-git sample directory), do not write a message file there; surface the state and ask before staging anything.
6. Move the file `active/ → completed/`.
7. Keep the completed TODO as the historical implementation record; never delete history.

The ADR is the durable architectural decision. The completed TODO is the durable implementation record. The Context Summary is the durable session handoff. The three serve different purposes; do not merge them.

Resuming completed work: move it back to `active/`, update status, add new work to the same file if the effort continues; otherwise create a new TODO referencing the completed one. Preserve the historical relationship.

---

## 15. Creating & Naming TODOs

New work starts in `TODO/backlog/` (not in progress) until work begins. Minimum shape:

```md
---
status: planned
created: YYYY-MM-DD
---

# Task Name

## Objective
## Implementation Tasks
- [ ] Task A
## Requirements
## Deferred / Skipped (known gaps)
None.
```

Names are stable and descriptive (`TODO/backlog/03-data-layer.md`), with frontmatter fields `status` / `created` / `started` / `completed` / `adr` (or `adr: none`).

---

## 16. Entering a Project & Active Set

Inspect `TODO/backlog/`, then `TODO/active/`, then related `TODO/completed/` files and ADRs. Don't assume the conversation holds history. If an active task exists for the request, continue it  -  don't duplicate.

Prefer a single active file for sequential work; allow multiple only for genuine parallel streams, and say explicitly which one this session is executing.

---

## 17. Context & Compaction Recovery

After a fresh session or context loss: don't ask the user to restate everything if repository state exists. Inspect `TODO/active/` → the active file's `Active Subtask` and `Context Summary` → `TODO/backlog/` → ADRs → source. Determine: what was in progress, what item, what's done, what's left, what decisions, what was deferred, what was verified. Then continue from state.

After compaction, before substantial work, ensure the active TODO reveals: current phase, active item, completed/remaining items, decisions, ticket work, verification state  -  with no reliance on hidden model memory or plugins.

---

## 18. Session Context Compaction (DCP Alternative)

Chat grows, and every subsequent turn resends the accumulated context. DCP-style summarizers shrink it passively, but they run behind your control. The repository can do it better: capture the session state as a compact snapshot into the TODO, then the chat can be aggressively compacted knowing nothing durable is lost.

**Context Summary.** Each active (and ultimately completed) TODO may contain a `## Context Summary`  -  a compact checkpoint a fresh agent/session can pick up from without rediscovery:

- Active item and remaining subtasks.
- What was implemented during the previous work stretch.
- Important implementation decisions and why they were made.
- Rejected alternatives when they materially affect future work.
- Links to relevant ADRs.
- Current blockers.
- Deferred/skipped work and its revisit condition.
- Verification state: what passed / what remains.
- Known gotchas or non-obvious constraints.

Keep it short  -  usually a paragraph or a few bullets.

**When to write it:**

1. After completing an implementation item.
2. Before starting a new implementation item when the previous one established important context.
3. When ending a work session.
4. Immediately before compaction, provided the current implementation step is at a safe boundary.

Do not continuously update it while implementing a single atomic step. It is a checkpoint, not a diary.

**When resuming an active TODO, before touching code:**

1. Read the TODO file.
2. Read its `## Context Summary`, if present.
3. Read referenced ADRs whose decisions affect the work.
4. Read `Deferred / Skipped (known gaps)`.
5. Inspect the current implementation only after understanding the recorded state  -  do not re-discover decisions already recorded.

**Compaction rule:** once a snapshot exists at a safe boundary, the conversation may be aggressively compacted. Assume all chat history may disappear after compaction; anything needed to continue must live in `TODO/active/`, `TODO/completed/`, ADRs, and source. Report each snapshot in chat with one short line (`Context summary: TODO/active/<task>.md`) and do not dump the summary into the chat.

---

## 19. Checkpoints

Update the active TODO before a substantial block (`- [•] Implement runtime cache`), and whenever a meaningful decision emerges. This creates recovery checkpoints. If a session grows large or context compresses, prioritize persistence first: update the active file, mark progress/decisions/deferred/blockers, refresh `Active Subtask` and `Context Summary` at a safe boundary, confirm the correct active item. Leave the repository recoverable.

---

## 20. Content Rules

Record conclusions and actionable state only  -  never chains of thought, speculation, failed commands, or model uncertainty without project consequence.

Respect user decisions: record and follow them as authoritative until changed; if a serious contradiction appears, say so and propose a change. If implementation contradicts an ADR: decide whether the implementation is wrong or the decision intentionally changed; on change, update the ADRs, mark the old appropriately, and continue  -  decisions must remain understandable. Do not silently work around.

---

## 21. Authority

TODO files state intended state; source code states actual state. On disagreement, investigate both and fix the task file to match reality  -  never mark complete because a checkbox says so.

A TODO may reference an ADR; an ADR never becomes a task checklist. Not every TODO needs an ADR: on completion, write an ADR only if a significant decision was made, then define that.

---

## 22. Workflows

Minimal session workflow:

```
1. Read TODO/active/                   7. Record decisions
2. Identify current task               8. Record deferred work
3. Synchronize session todo            9. Verify
4. Read Context Summary + Active Step  10. Mark completed
5. Implement                           11. Create/update ADR if needed
6. Update TODO as state changes        12. Write Context Summary, move to completed/
```

A fresh agent must be able to read the active TODO, its `Context Summary` and subtask state, referenced ADRs, and the code  -  then continue the current `[•]` item without the previous conversation. That is the primary goal. For large spec tasks, keep the task queue concise; the detail lives in the markdown body, never duplicated into the session todo.

---

## 23. Agent Responsibility

Persistent state is maintained continuously, not once at the end: update on a task start/complete, a discovered requirement, a decision, a deferral, a blocker, a direction change, a checkpoint boundary, or finishing verification.

Write and prune: the active reference, `Active Subtask`, `Context Summary`, and `Deferred` sections each have different lifecycles  -  temporary working state disappears once promoted; durable truth stays in the TODO and ADRs.

---

## 24. Final Rule

```
Delete the entire chat history.
Start a new agent.
Point it at the repository.
It can continue the work.
```

State must survive independently of model contacts, conversation history, session todo, memory/compression plugins, and agent identity. The repository is durable project memory. Keep the session todo synced with the active TODO but never treat it as truth. Never lose work, decisions, or deferred work  -  never require conversation history to recover implementation state.
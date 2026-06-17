---
name: prd-issue
description: Synthesizes the current conversation/plan into a single PRD-quality issue and publishes it directly to the project issue tracker, structured as one tracer-bullet vertical slice with explicit feedback loops, validation checkpoints, and a Red-Green-Refactor development plan. Use when the user wants one ready-to-implement issue that merges PRD thinking with concrete acceptance criteria, instead of a separate PRD doc plus a breakdown into many issues.
---

# PRD Issue

Merge PRD synthesis and issue breakdown into ONE published issue. Do NOT interview the user — synthesize from context you already have, only asking when a seam or scope decision is genuinely ambiguous.

The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.

## Process

1. **Gather context.** Work from the conversation. If the user passes a reference (issue number, URL, path), fetch its full body/comments.

2. **Explore the codebase** if not already done. Use the project's domain glossary and respect existing ADRs in the touched area.

3. **Find the tracer bullet, then plan its evolutions as phases.** Identify the thinnest vertical slice that cuts through every integration layer (schema, API, UI, tests) end-to-end and proves the system works — this is Phase 1. Prefer existing seams over new ones; if a new seam is required, propose it at the highest point possible.

   Then lay out the following phases as evolutions on top of Phase 1. Each phase, including Phase 1, must deliver a COMPLETE, demoable feature on its own — never a half-finished layer waiting on a future phase to become useful.

   - **Phase 1 (tracer bullet) must be the simplest possible iteration**: the narrowest end-to-end path, deliberately stripped of edge cases, polish, and secondary behavior. Its only job is to prove the seam works.
   - **Later phases are evolutions, not extensions of scope**: each one takes the working tracer bullet and grows it into a more complete/robust feature (more cases, better UX, performance, edge cases) — they build on Phase 1, they don't bolt on unrelated work.

   This skill still produces ONE issue — phases are sections within it, not separate issues. If the phases don't share one coherent feature arc, tell the user to use `to-issues` instead for a multi-issue breakdown.

4. **Draft the issue** using the template below, then confirm with the user: does the phase breakdown match their expectations (is Phase 1 truly minimal, do later phases evolve it coherently), are the feedback loops sufficient, is anything out of scope incorrectly included?

5. **Publish** the issue to the tracker with the `ready-for-agent` label (no extra triage needed) once approved.

<issue-template>

## Problem Statement

The problem from the user's perspective.

## Solution

One sentence describing the overall feature arc that the phases below evolve towards. The phases are the solution — this is just the throughline connecting them.

## User Stories

A numbered list, format: `As a <actor>, I want <feature>, so that <benefit>`. Tag each story with the phase that satisfies it, e.g. `(Phase 1)`.

## Phases

Repeat the block below once per phase. Phase 1 is always the tracer bullet.

<phase-block>

### Phase N — <name>

**Why this phase**: one line on what completes/evolves vs. the previous phase. For Phase 1: "simplest possible end-to-end path — proves the seam works, no edge cases or polish."

**What ships**: the complete, demoable feature this phase delivers on its own. Never a half-finished layer waiting on a future phase.

**Implementation decisions**: modules touched, interfaces changed, schema/API contracts, architectural decisions for this phase. No file paths or code snippets — they go stale. Exception: a prototype snippet that encodes a decision precisely (state machine, reducer, schema shape) may be inlined, trimmed to the decision-rich part, noted as coming from a prototype.

**Feedback loops**: for each implementation step in this phase, how its correctness is checked BEFORE moving to the next step (e.g. "after wiring the API contract, run the contract test"; "after the UI binds to the new field, manually verify in the running app"). No step proceeds on an unverified assumption.

**Development plan (Red-Green-Refactor)**: the order of implementation steps for this phase, as a build loop — not a test plan, but how the phase gets BUILT:
- **Red**: which failing test(s) to write first, and what behavior they pin down (prior art for similar tests in the codebase, if any).
- **Green**: the minimal implementation step that makes them pass — in what order, touching what.
- **Refactor**: what cleanup happens once green, and what must NOT regress.

Only test external behavior, not implementation details.

**Acceptance criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

</phase-block>

## Blocked by

A reference to the blocking ticket, or "None - can start immediately".

## Out of Scope

What is explicitly excluded from this issue, including any evolution deliberately left for a future issue beyond the last phase here.

## Further Notes

Anything else worth recording.

</issue-template>

Do NOT close or modify any parent/source issue.

# CLAUDE.md

Behavioural guidelines to reduce common LLM coding errors. These guidelines
should be combined with project-specific instructions where applicable.

**Trade-off:** These guidelines prioritise caution over speed.
For trivial tasks, use judgment.

## 1. Think Before Coding

**Assumptions should be explicit. Ambiguity should be surfaced. Trade-offs
should be stated.**

Before implementing:

- State assumptions explicitly.
- Where multiple interpretations exist, present alternatives rather than making
  silent choices.
- Prefer simpler approaches when appropriate.
- Pause and request clarification when requirements are unclear.

## 2. Simplicity First

**Write only the minimum code that solves the stated problem. Avoid
speculative design.**

- Do not add features beyond scope.
- Avoid abstractions for one-off code.
- Do not introduce unrequested configurability.
- Avoid defensive handling for impossible scenarios.
- If a shorter implementation can provide equivalent clarity and correctness,
  prefer the shorter version.

Ask: "Would a senior engineer regard this as over-engineered?"
If yes, simplify.

## 3. Surgical Changes

**Change only what is required. Clean up only what is introduced by the
change.**

When editing existing code:

- Do not refactor unrelated code.
- Match the existing local style.
- If unrelated dead code is observed, report it without removing it.

When your changes create orphans:

- Remove imports, variables, and functions made unused by the current change.
- Do not remove pre-existing dead code unless explicitly requested.

Validation rule: each changed line should trace directly to the requested task.

## 4. Goal-Driven Execution

**Define success criteria and iterate until verified.**

Transform tasks into verifiable goals:

- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently.
Weak criteria ("make it work") require constant clarification.

---

**These guidelines are effective when:**

- diffs contain fewer unnecessary changes;
- rewrites due to over-complexity are reduced;
- clarification occurs before implementation rather than after defects appear.

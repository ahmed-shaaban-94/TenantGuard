# ADR-005: Prompt templating — hand-written TypeScript Markdown builders

**Status**: Accepted
**Date**: 2026-06-18
**Context feature**: `006-agent-prompt-compiler`
**Relates**: ADR-001 (tech stack), ADR-002 (CLI framework), ADR-003/004

## Context

The Prompt Compiler turns a routed queue item (005) into a safe Markdown prompt for an AI coding agent.
The spec (`006-agent-prompt-compiler`) defers the *templating engine/language* to the plan layer while
pinning the prompt **structure** (ten required sections), the **invariant default blocks** (git rules,
stop conditions, final report), and **per-agent rendering** with identical safety.

## Decision

Build prompts with **plain TypeScript functions that assemble Markdown strings** — one builder per
section, composed per renderer. No templating-engine dependency. The invariant blocks live once in
`defaults.ts`; every renderer references them (never re-authors them).

## Rationale

- **Fixed, small structure**: ten sections with mostly-constant blocks. Hand-written builders are fully
  testable, type-safe against the real `QueueItem`, deterministic by construction, and add no
  dependency (CLI-First, II; "no templating engine" Non-Goal).
- **Safety parity is structural**: a single source of truth for git rules / stop conditions / final
  report makes SC-005 (identical safety across renderers) a byte-equality assertion, not a hope.
- **No engine indirection**: a template language buys nothing for a fixed structure and adds a runtime.

## Alternatives considered

- **Handlebars / EJS / Mustache** — valuable when templates are user-authored; premature for a fixed v0
  structure. Revisit if prompt templates become user-customizable.

## Consequences

- `packages/prompt` holds `defaults.ts` (invariant blocks), `sections.ts` (section→field builders),
  `renderers/{generic,claude,codex}.ts` (presentation only), `scope.ts` (refusal check), `compile.ts`.
- Adding a renderer = a new presentation file referencing the shared sections/constants; safety can't
  drift. Adding/retuning a section = editing `sections.ts` + its test.
- No new Zod schema: the output is Markdown text; the input `queue.json` is already 005-validated.

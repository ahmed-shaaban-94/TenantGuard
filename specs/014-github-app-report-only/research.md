# Phase 0 Research: 014 Report-Only GitHub App

Resolves the NEEDS-CLARIFICATION items from the plan's Technical Context. Each entry: Decision / Rationale / Alternatives considered.

## R1 — Host topology (where the App's webhook handler runs)

**Decision**: A self-hostable, stateless Node handler exposed as a single webhook endpoint, packaged so it can run either as a long-running service OR as an on-demand function (the package exports a pure `handleEvent(payload, ctx)` entry; the deployment wrapper is thin and swappable).

**Rationale**: The spec locked "self-hostable, single-tenant" (Clarifications). Keeping the core a pure handler with a thin deployment shell means the constitution's statelessness holds regardless of host, and the same entry point is unit-testable without a server. It also defers the hosted-multi-tenant question cleanly to P5.

**Alternatives considered**:
- *Public multi-tenant hosted App* — rejected: out of spec scope, introduces stored installation tokens/state (tension with "no stored secrets"), closer to P5.
- *Reuse the existing GitHub Action only* — rejected: the Action already exists (008); the App's value is install-once reach without a per-repo workflow file (US1). The App reuses the Action's behavior, it doesn't replace the engine.

## R2 — Webhook authentication & request integrity

**Decision**: Verify the GitHub webhook HMAC signature (shared secret) on every inbound request before any processing; reject unsigned/mismatched payloads. The App authenticates to the Checks API using its installation credential, scoped to the minimum permissions (checks: write, contents: read, metadata: read).

**Rationale**: Signature verification is the standard, mandatory integrity control for GitHub webhooks; doing it first keeps untrusted input out of the review path (boundary validation — coding-style rule). Minimum-permission install satisfies FR-010 and US3.

**Alternatives considered**:
- *Skip signature verification in single-tenant trust zone* — rejected: violates "validate at system boundaries"; a forged PR event could trigger a review against an attacker-chosen ref.
- *Broad permissions for convenience* — rejected: FR-010 mandates minimum scope; contents-write/merge must NOT be requested.

> Note: if the webhook auth/credential model needs an ADR (per Stop conditions), flag it before implementation. This research records the intended approach, not an approved ADR.

## R3 — GitHub Checks API limits (drives FR-006 / SC-005)

**Decision**: Cap prominent inline annotations at 50 per check-run update (GitHub accepts at most 50 annotations per Checks API request); summarize any overflow in the check `output.summary`/`text` body, ordered confirmed-first.

**Rationale**: Anchoring the readability bound to the platform's actual per-request limit makes FR-006 a real, non-arbitrary constraint and avoids partial/failed annotation writes. Confirmed-first ordering ensures the highest-value findings are always among the surfaced 50.

**Alternatives considered**:
- *Paginate to post all annotations across multiple requests* — rejected for v1: floods the PR (the exact anti-goal of US2) and adds statefulness; overflow summary is sufficient and readable.
- *Arbitrary smaller cap (e.g., 10)* — rejected: would hide findings the platform could legitimately show.

## R4 — Mapping review output → Checks conclusion

**Decision**: Reuse the merged report-only Checks renderer payload (PR #24) as the single source of presentation. Conclusion mapping: any diff-attributable `confirmed` finding → `failure` (or `neutral` if the repo opts to soften) ; `suspected`-only → `neutral`; no findings + no scope violation → `success`; **draft PR → always `neutral`** (FR-015); incomplete review → `neutral` with an honest message (FR-011), never `success`.

**Rationale**: Keeps the App's verdict identical to the CLI for the same diff (FR-013/SC-006) by not re-deriving presentation. The draft and incomplete overrides are the only App-specific conclusion rules and are both safe (never falsely green, never falsely red on a WIP).

**Alternatives considered**:
- *Re-render findings independently in the App* — rejected: risks a divergent second judgment (violates FR-013) and duplicates merged work.

## R5 — Reading source at the PR head ref

**Decision**: Resolve and review the PR **head** ref (not the merge ref) via the installation's read access; compute changed files from the PR diff and run the existing `review-pr` chain against that. No persistent clone; fetch what the review needs per-event and discard.

**Rationale**: Head-ref review matches what a reviewer sees on the PR and what the dogfood Action does; per-event fetch-and-discard preserves statelessness (FR-008) and the no-stored-source posture (SC-004).

**Alternatives considered**:
- *Merge-ref review* — deferred: can differ from what the author sees; head-ref is the spec's stated source of truth. Revisit only if a concrete need appears.
- *Persistent local mirror for speed* — rejected: introduces stored source, violating FR-008.

---
description: "Task list for 015-github-app-deployment"
---

# Tasks: GitHub App Deployment Runtime

**Input**: Design documents from `specs/015-github-app-deployment/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/service.md

**Tests**: REQUIRED (TDD — write tests first, RED→GREEN). Secret-safety is a first-class test, not an afterthought.

**Status**: Not started — implementation follows on branch `015-github-app-deployment`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete dependency)
- **[Story]**: US1 / US2 / US3

---

## Phase 1: Setup

- [ ] T001 Verify repo state/branch and confirm allowed/forbidden files from `plan.md` before edits.
- [ ] T002 Scaffold `packages/github-app-server/` (package.json, tsconfig, vitest config) matching existing package conventions; depend on `@tenantguard/github-app`.
- [ ] T003 [P] Add the package to the workspace + declare the GitHub REST/HTTP dependency (update `pnpm-lock.yaml` for the new manifest only).

---

## Phase 2: Foundational (Blocking)

- [ ] T004 Implement `src/config.ts` — read app id / private key / webhook secret from env; fail-fast validation that names a missing variable and NEVER prints a value (FR-005/FR-007).
- [ ] T005 [P] Test `tests/config.test.ts` — present→ok; each missing→fail-fast naming the var; assert no value printed. (RED first.)

**Checkpoint**: credentials load safely; story work can begin.

---

## Phase 3: User Story 1 — App runs live on a PR (Priority: P1) 🎯 MVP

**Goal**: A signed opened-PR webhook → review at the head → a real Checks run posted, matching the 014 verdict.

**Independent Test**: POST a signed `pull_request.opened` to the running service (faked GitHub/git) → assert a check is created at the head, verdict matches 014, no other write.

### Tests first (RED)

- [ ] T006 [P] [US1] `tests/checks-client.test.ts` — create/update/find map to Checks API calls; only checks writes occur.
- [ ] T007 [P] [US1] `tests/git-workspace.test.ts` — checkout returns a path; dispose removes it; dispose runs even when the body throws.
- [ ] T008 [P] [US1] `tests/server.test.ts` (happy path) — signed reviewable event dispatches to `handleEvent` and posts a check.

### Implementation (GREEN)

- [ ] T009 [US1] `src/auth.ts` — mint a short-lived installation token from env creds; discard per event; never persist/log (FR-015).
- [ ] T010 [US1] `src/checks-client.ts` — concrete `ChecksClient` over octokit; route writes through 014 `assertAllowedWrite`.
- [ ] T011 [US1] `src/git-workspace.ts` — concrete `Workspace`: ephemeral checkout of head + guaranteed dispose (FR-004).
- [ ] T012 [US1] `src/gh-sources.ts` — octokit-backed `prChangedFiles` / `prMetadata` for `RunnerDeps`.
- [ ] T013 [US1] `src/server.ts` + `src/index.ts` — HTTP endpoint: read raw body → 014 `verifySignature` → `parseEvent` → dispatch to `handleEvent` with the concrete deps; compose + start.

**Checkpoint**: US1 demoable — signed PR → live check.

---

## Phase 4: User Story 2 — Secrets never leak (Priority: P1)

**Goal**: No credential value ever appears in logs, errors, the Checks payload, or any written file — on any path.

**Independent Test**: Run success + every error path with sentinel credential values; capture all logs/errors/payload/written files; assert no sentinel appears.

### Tests first (RED)

- [ ] T014 [P] [US2] `tests/auth.test.ts` — token minted and used; assert neither token nor private key is logged or returned in any error.
- [ ] T015 [P] [US2] `tests/secret-safety.test.ts` — sentinel scan across success + bad-signature + checkout-failure + API-error paths: NO sentinel in logs/errors/payload/files (SC-003).

### Implementation (GREEN)

- [ ] T016 [US2] Establish a no-secret logging convention (allowlisted fields only) and ensure config/auth/server never pass credential values to the logger or into error messages (FR-006).
- [ ] T017 [US2] Audit error-handling paths so thrown/serialized errors carry no credential material; redact at the boundary if needed.

**Checkpoint**: US2 demoable — secret-safety test green across all paths.

---

## Phase 5: User Story 3 — Honest degradation (Priority: P2)

**Goal**: Bad input rejected without processing; unreviewable events ignored; incomplete reviews conclude neutral.

**Independent Test**: unsigned / wrong-sig / non-reviewable / checkout-failure cases → respectively rejected, ignored, and neutral-concluded.

### Tests first (RED)

- [ ] T018 [P] [US3] `tests/server.test.ts` (degraded) — unsigned→401 no dispatch; wrong-sig→401; non-reviewable→202 no check; oversized→413 (FR-008/FR-009).
- [ ] T019 [P] [US3] Checkout/review-failure test — concludes neutral, workspace disposed, never success (FR-010/SC-007).

### Implementation (GREEN)

- [ ] T020 [US3] Implement signature/oversize/action gating + honest status mapping in `src/server.ts`.
- [ ] T021 [US3] Wire incomplete-review → neutral via 014 `safeRun`/`handleEvent`; ensure dispose always runs (FR-010/FR-011).
- [ ] T021a [P] [US3] Concurrency isolation test + impl — two overlapping events use distinct ephemeral workspaces (unique temp dirs); neither sees the other's checkout; both checks post correctly (FR-014).

**Checkpoint**: US3 demoable — endpoint is honest under bad input, partial failure, and concurrent events.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T022 [P] `packages/github-app-server/README.md` — run instructions + the verifiable safety boundary (env-only secrets, report-only, stateless).
- [ ] T023 [P] Update `README.md` / `packages/cli/README.md` to mention the deployable service (no command behavior change).
- [ ] T024 Run focused tests: `pnpm --filter @tenantguard/github-app-server test`.
- [ ] T025 Run full suite + typecheck: `pnpm test` and `pnpm typecheck` (must be green).
- [ ] T026 Final status: confirm no secret in any output, only checks writes, zero source on disk, no P5/P6 drift; `git status` limited to allowed files.

---

## Dependencies & Story Order

```text
Setup (T001–T003)
  └─ Foundational config (T004–T005)   ← blocks all stories
        ├─ US1 (T006–T013)  🎯 MVP — live check on a PR
        ├─ US2 (T014–T017)  secret-safety — equal P1, layered over US1's surfaces
        └─ US3 (T018–T021)  honest degradation — builds on US1's server/runner
              └─ Polish (T022–T026)
```

- **US1 + US2 are both P1**: a live runtime that leaks secrets is unacceptable, so US2 ships with US1.
- **US3** hardens the public endpoint; depends on US1's server existing.

## Parallel Opportunities

- T004/T005 (config + its test).
- All `[P]` test tasks within a story before their implementation.
- T022/T023 docs are independent of logic.

## Implementation Strategy

1. Land **config + secret-safety harness early** (T004/T005/T015) — Principle VII is the riskiest surface; prove it before layering features.
2. Ship **US1** (live check), then **US2** (no leaks) and **US3** (honest degradation).
3. TDD throughout; secret-safety test must stay green on every path.
4. Stop and report if any path would persist/log a credential, write beyond the Checks API, or change 014 judgment.

# Feature Specification: GitHub Action

**Feature Branch**: `008-github-action`
**Created**: 2026-06-18
**Status**: Draft
**Input**: User description: "Run TenantGuard in CI and produce PR summaries. Depends on 001, 003, 004, 007. Docs only; no production code."

**Depends on**: `001-product-foundation`, `003-cli-scanner`, `004-saas-gates-v0`, `007-pr-reviewer`
**Blocks**: — (last foundation-roadmap spec; GitHub App / dashboard are deferred waves)

---

## Purpose *(mandatory)*

The GitHub Action lets a repository run TenantGuard in CI (on `pull_request`) and surface a summary of
the scan, gates, and review verdict on the change. It reuses the same CLI and gates that run locally —
CI is a delivery surface, not a different engine.

This spec defines **what the CI integration must do and produce**, the **summary content**, and the
**critical-gate behavior** — not the workflow YAML, the runtime, or the packaging. This is a docs-only
specification; per repo rules, no `.github/workflows/*` file is created by this feature.

---

## User Scenarios & Testing *(mandatory)*

"User" is a maintainer who wants TenantGuard feedback automatically on every PR.

### User Story 1 - See TenantGuard results on a PR (Priority: P1)

On opening/updating a PR, CI runs TenantGuard and produces a summary (scan + gate findings + review
verdict) visible in the CI run.

**Why this priority**: Automatic per-PR feedback is the value of the Action — it brings the local
gates to the team's collaboration surface.

**Independent Test**: Describe a `pull_request`-triggered run over a sample change and confirm the
defined summary (verdict + findings + evidence) is produced as the run's output.

**Acceptance Scenarios**:

1. **Given** a PR, **When** CI runs the Action, **Then** a summary containing the review verdict and
   contributing findings (with evidence) is produced.
2. **Given** the Action runs, **When** it completes, **Then** it has not committed, pushed, merged, or
   modified the repository.

### User Story 2 - Block on critical gate failure (Priority: P2)

A maintainer configures the Action so that a critical (blocking) gate failure fails the check, while
non-critical findings are reported without failing.

**Why this priority**: Turning findings into an enforceable gate is what makes CI integration more than
cosmetic — but it must be opt-in/configurable to avoid surprise breakage.

**Independent Test**: Run the Action over a change with a critical gate failure and confirm the check
fails; run it over a change with only informational findings and confirm the check passes with the
findings reported.

**Acceptance Scenarios**:

1. **Given** critical-gate-blocking is enabled, **When** a critical gate fails, **Then** the CI check
   fails with the failing gate(s) in the summary.
2. **Given** only non-critical findings, **When** the Action runs, **Then** the check passes and the
   findings are still reported.

---

### Edge Cases

- **No detectable change / empty diff**: the Action reports "nothing to review," does not fail.
- **TenantGuard error in CI**: surfaces a clear error in the summary; does not silently pass.
- **Secret-like content in the change**: flagged; the secret value never appears in the CI summary or
  logs.
- **Missing/limited GitHub permissions**: degrades to the information it can access; never stores tokens.
- **Critical-gate-blocking disabled**: findings are reported but never fail the check.

---

## Required Behavior *(mandatory)*

```text
Trigger        runs on pull_request events (and re-runs on update)
Engine         reuses the TenantGuard CLI: scan → gates → review (007)
Summary        verdict (Ready/Not Ready/Needs Verification) + contributing findings + evidence
Enforcement    optional critical-gate-blocking: critical failure → check fails; otherwise report-only
Side effects   none on the repo (read-only; no commit/push/merge/auto-comment in MVP)
```

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The integration MUST run on `pull_request` events and re-run when the PR updates.
- **FR-002**: The integration MUST reuse the existing TenantGuard CLI/gates (scan → gates → review),
  not a separate engine.
- **FR-003**: The integration MUST produce a CI summary containing the review verdict and contributing
  findings with evidence.
- **FR-004**: The integration MUST support an optional critical-gate-blocking mode: a critical gate
  failure fails the CI check; otherwise findings are report-only.
- **FR-005**: The integration MUST be read-only on the repository — no commit, push, merge, or
  auto-comment in MVP.
- **FR-006**: The summary and logs MUST NOT contain secrets; secret-like content MUST be flagged, never
  printed.
- **FR-007**: The integration MUST store no tokens or credentials; it uses CI-provided permissions only.
- **FR-008**: On TenantGuard error, the integration MUST surface a clear failure in the summary, not a
  silent pass.
- **FR-009**: The integration MUST be domain-neutral — no Retail Tower/ERPNext/POS specifics.

### Key Entities

- **CI Run**: one execution of the Action triggered by a PR event.
- **CI Summary**: the produced verdict + findings + evidence shown in the run.
- **Enforcement Mode**: whether critical-gate failure fails the check (configurable).

---

## CLI / Integration Surface *(mandatory)*

The Action wraps the existing commands; no new core behavior beyond CI wiring:

```text
(scan) → tenantguard gates → tenantguard review-pr <number|--local-diff>  → CI summary
```

Configuration (e.g. enabling critical-gate-blocking, selecting gates) is exposed through the Action's
inputs. The concrete workflow file and input schema are produced when this feature is implemented — not
in this docs-only spec.

---

## Required Outputs *(mandatory)*

```text
CI summary report   verdict + findings + evidence, shown on the PR's CI run
check status        pass / fail (fail only when critical-gate-blocking is enabled and a critical gate fails)
```

---

## Non-Goals *(mandatory)*

```text
- Creating the actual .github/workflows/*.yml file (docs-only spec; that is implementation, separately gated).
- Posting PR review comments, inline annotations, or labels (GitHub App territory — deferred wave).
- Committing, pushing, merging, or auto-fixing.
- Creating follow-up issues (GitHub App — deferred).
- A hosted dashboard or org-level install (deferred waves).
- Choosing the CI runtime, packaging, or action language (decided at plan/implementation layer).
- Retail Tower / ERPNext / POS-specific CI rules.
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A `pull_request`-triggered run produces a summary with the review verdict and findings
  (with evidence) in 100% of runs.
- **SC-002**: With critical-gate-blocking enabled, a critical gate failure fails the CI check in 100%
  of such cases.
- **SC-003**: With only non-critical findings, the check passes while still reporting the findings.
- **SC-004**: The Action performs 0 writes to the repository (no commit/push/merge/comment).
- **SC-005**: 0 secrets appear in any CI summary or log.
- **SC-006**: The Action stores 0 tokens; it uses only CI-provided permissions.
- **SC-007**: A TenantGuard error surfaces as a clear CI failure, never a silent pass.

---

## Acceptance Criteria for This Feature *(mandatory)*

- **AC-001**: PR-trigger behavior and CLI reuse (scan→gates→review) are specified.
- **AC-002**: CI summary content (verdict + findings + evidence) is specified.
- **AC-003**: Optional critical-gate-blocking enforcement is specified.
- **AC-004**: Read-only, no-secrets, no-stored-tokens, error-surfacing guarantees are specified.
- **AC-005**: CLI/integration surface and required outputs are defined.
- **AC-006**: Non-goals are explicit (no workflow file here, no PR comments/labels/issues, no mutation).
- **AC-007**: The spec is implementation-neutral on CI runtime/packaging (deferred).
- **AC-008**: No production code, no `.github/workflows/*` file, no `package.json`, and no lockfile is
  created by this feature.

---

## Assumptions

- **The workflow file and packaging are deferred** to the implementation layer and are separately
  gated; this spec defines *what the CI integration must do*, not the YAML.
- **Critical vs non-critical gate** classification aligns with 004/007; "critical" = a blocking gate.
- **CI permissions** are provided by the host (e.g. the standard CI token); TenantGuard stores nothing.
- **PR-comment / label / issue creation** is intentionally out of scope and belongs to the deferred
  GitHub App wave.
- **Report content** matches 007's verdict model and 001's required outputs.

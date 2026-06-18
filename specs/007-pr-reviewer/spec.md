# Feature Specification: PR Reviewer

**Feature Branch**: `007-pr-reviewer`
**Created**: 2026-06-18
**Status**: Draft
**Input**: User description: "Review local diff and GitHub PR changes against scope and gates. Depends on 001, 002, 003, 004. Docs only; no production code."

**Depends on**: `001-product-foundation`, `002-project-map-schema`, `003-cli-scanner`, `004-saas-gates-v0`
**Blocks**: `008-github-action` (the Action runs this review in CI)

---

## Purpose *(mandatory)*

The PR Reviewer closes the loop: it evaluates a change (a local diff, or later a GitHub PR) against the
Project Map, the declared scope, and the SaaS gates, and returns a **Ready / Not Ready / Needs
Verification** verdict with evidence. Local-diff review works with no credentials, keeping the kernel
local-first; GitHub PR review is an additive capability.

This spec defines the **review inputs, verdict model, and evidence requirements** — not the diff-parsing
internals or language.

---

## User Scenarios & Testing *(mandatory)*

"User" is a reviewer (human or CI) checking whether a change is safe to merge.

### User Story 1 - Review a local diff (Priority: P1)

A reviewer runs the reviewer against the current local diff and gets a Ready / Not Ready / Needs
Verification verdict with evidence, with no GitHub credentials required.

**Why this priority**: Local-diff review is the local-first, always-available form of the capability —
the MVP headline. It verifies agent/human output against the same gates that shaped the task.

**Independent Test**: Run local-diff review on a repo with a deliberate boundary violation and confirm
the verdict is Not Ready, naming the violated gate and citing the evidence.

**Acceptance Scenarios**:

1. **Given** a local diff, **When** review runs, **Then** the output is exactly one of Ready / Not
   Ready / Needs Verification, with supporting evidence.
2. **Given** a diff that violates an architecture or security gate, **When** review runs, **Then** the
   verdict is Not Ready and names the failing gate.
3. **Given** insufficient evidence to judge a gate, **When** review runs, **Then** the relevant part of
   the verdict is Needs Verification, not a false pass.
4. **Given** local-diff review, **When** it runs, **Then** it requires no network access and no
   credentials.

### User Story 2 - Review a GitHub PR (Priority: P2)

A reviewer (or CI) reviews a specific GitHub PR by number and gets the same verdict model, incorporating
PR metadata and changed files.

**Why this priority**: PR review extends the same gates to the collaboration surface; it is additive and
GitHub-first per the principles.

**Independent Test**: Review a PR with a known migration-safety issue and confirm the verdict flags
TG-G3 with evidence drawn from the changed files / PR metadata.

**Acceptance Scenarios**:

1. **Given** a PR number, **When** review runs, **Then** it returns the Ready / Not Ready / Needs
   Verification verdict using PR metadata and changed files as evidence.
2. **Given** GitHub access is unavailable, **When** PR review is requested, **Then** it reports the
   access gap clearly and local-diff review remains available.

### User Story 3 - Review against declared scope (Priority: P2)

A reviewer checks a change against a queue item's declared allowed/forbidden files and flags
out-of-scope edits.

**Why this priority**: Scope adherence is how TenantGuard catches "agent changed too many files."

**Independent Test**: Review a diff that touches a forbidden file for its item and confirm the verdict
flags the out-of-scope change.

---

### Edge Cases

- **Empty diff**: returns a clean/with-nothing-to-review result, not an error.
- **Huge diff**: completes or reports progress; does not hang silently.
- **Insufficient evidence**: any unjudgeable gate yields Needs Verification, never a false pass.
- **Secret-like content in diff**: flagged as a finding; the secret value is never echoed in the report.
- **No GitHub access for PR mode**: reported clearly; local-diff mode still works.

---

## Verdict Model *(mandatory)*

```text
Ready              no blocking gate failures or scope violations; evidence supports merge-readiness
Not Ready          one or more blocking gate failures or out-of-scope changes (with evidence)
Needs Verification evidence is insufficient to confirm safety for one or more checks
```

The report MUST attach, per contributing finding, the gate id (where applicable), the location, and the
evidence. A single Not-Ready or unresolved Needs-Verification on a blocking check prevents an overall
Ready verdict.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The reviewer MUST review a local diff and return one of Ready / Not Ready / Needs
  Verification.
- **FR-002**: The reviewer MUST run the SaaS gates (004) against the change and attach evidence to each
  contributing finding.
- **FR-003**: The reviewer MUST check the change against declared scope (allowed/forbidden files) and
  flag out-of-scope edits.
- **FR-004**: Local-diff review MUST require no network access and no credentials.
- **FR-005**: The reviewer MUST support reviewing a GitHub PR by number, using PR metadata and changed
  files as evidence (additive capability).
- **FR-006**: When GitHub access is unavailable, PR review MUST report the gap clearly and MUST NOT
  block local-diff review.
- **FR-007**: Any check with insufficient evidence MUST yield Needs Verification, never a false pass.
- **FR-008**: The reviewer MUST be read-only — it MUST NOT modify the repo, the diff, or the PR
  (no comments, labels, commits, or merges in MVP).
- **FR-009**: The report MUST NOT contain secrets; secret-like content MUST be flagged, never echoed.
- **FR-010**: Review MUST be deterministic for unchanged input.
- **FR-011**: The reviewer MUST be domain-neutral — no Retail Tower/ERPNext/POS specifics.

### Key Entities

- **Review Run**: one evaluation of a change (local diff or PR).
- **Verdict**: Ready / Not Ready / Needs Verification, with contributing findings.
- **Scope Check**: comparison of changed files against declared allowed/forbidden files.
- **PR/diff Evidence**: changed files, hunks, and (for PRs) PR metadata.

---

## CLI Surface *(mandatory)*

```text
tenantguard review-pr --local-diff    review the current local diff (no credentials)
tenantguard review-pr <number>        review a GitHub PR by number (requires GitHub access)
```

---

## Required Outputs *(mandatory)*

```text
PR / readiness report   verdict (Ready/Not Ready/Needs Verification) + contributing findings + evidence
                        in human-readable and machine-readable form
```

---

## Non-Goals *(mandatory)*

```text
- Posting PR comments, labels, or status checks (MVP review is read-only; the Action surfaces results — 008).
- Committing, pushing, or merging (never in MVP).
- Auto-fixing findings.
- Running the GitHub Action / CI wiring (that is 008).
- A full diff-aware static-analysis engine (gates are evidence-first, signal-based).
- Choosing a diff/GitHub-client library or language (decided at plan layer).
- Retail Tower / ERPNext / POS-specific review rules.
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Local-diff review returns exactly one of Ready / Not Ready / Needs Verification in 100%
  of runs, with evidence.
- **SC-002**: A diff violating a blocking gate yields Not Ready naming the gate, in 100% of such cases
  on the sample set.
- **SC-003**: An out-of-scope edit (forbidden file) is flagged in 100% of such cases.
- **SC-004**: Any unjudgeable check yields Needs Verification, never a false pass.
- **SC-005**: Local-diff review runs with no network access and no credentials.
- **SC-006**: Review is read-only — 100% of the repo/diff/PR is unmodified after a review.
- **SC-007**: 0 secrets appear in any review report; review is deterministic for unchanged input.

---

## Acceptance Criteria for This Feature *(mandatory)*

- **AC-001**: The verdict model (Ready / Not Ready / Needs Verification) is specified.
- **AC-002**: Gate-based review with per-finding evidence is specified.
- **AC-003**: Scope (allowed/forbidden files) checking is specified.
- **AC-004**: Local-diff (no credentials) and GitHub-PR (additive) modes are specified.
- **AC-005**: Read-only, no-secrets, deterministic, domain-neutral guarantees are specified.
- **AC-006**: CLI surface (`review-pr --local-diff`, `review-pr <number>`) and output are defined.
- **AC-007**: Non-goals are explicit (no PR comments/labels, no mutation, no CI wiring, library choice).
- **AC-008**: The spec is implementation-neutral on diff/GitHub-client library (deferred to plan).
- **AC-009**: No production code, reviewer code, `package.json`, or lockfile is created.

---

## Assumptions

- **Diff parsing and GitHub-client choice deferred** to plan/ADR. This spec mandates review *behavior
  and verdict model*, not the libraries.
- **GitHub access**, when used for PR mode, relies on the user's existing credentials/CLI; TenantGuard
  stores no tokens.
- **"Blocking gate"** vs informational gate distinction is refined alongside 004; a Not-Ready requires
  at least one blocking failure.
- **Local diff** means uncommitted/working changes and/or a stated base — exact diff base is a
  plan-layer detail.
- **Report formats** are human-readable + machine-readable, consistent with 001's required outputs.

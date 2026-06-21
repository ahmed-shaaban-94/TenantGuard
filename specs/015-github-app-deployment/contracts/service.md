# Phase 1 Contracts: 015 Deployment Runtime

Three contracts: the **environment** the service requires, the **HTTP endpoint** it exposes, and the **GitHub writes** it is permitted. All validated/asserted at runtime.

## Contract A — Environment (startup)

The service reads these from the environment ONLY; missing any → fail fast (FR-007), naming the variable, never printing values.

```text
TENANTGUARD_APP_ID          (required)
TENANTGUARD_APP_PRIVATE_KEY (required) — never logged/persisted
TENANTGUARD_WEBHOOK_SECRET  (required) — never logged/persisted
PORT                        (optional; default a fixed port)
```

Postcondition: on success, credentials live only in process memory; on failure, the process exits non-zero with a secret-free message.

## Contract B — Webhook endpoint

**Route**: `POST /` (single webhook route).

**Request**: raw JSON body + `X-Hub-Signature-256` header.

**Processing order (normative):**
1. Read raw body (bounded size; oversized → 413, no processing).
2. Verify HMAC (014 `verifySignature`). Invalid/missing → **401, no parse, no dispatch, no check** (FR-008).
3. `parseEvent` (014). Non-reviewable action / non-PR event → **202, no check** (FR-009).
4. Dispatch the normalized event to 014 `handleEvent` with the concrete deps.
5. Respond 2xx once the check has been posted (or the event honestly concluded neutral).

**Responses:**

| Condition | Status | Side effect |
|---|---|---|
| valid + reviewable | 200/202 | a Checks run created/updated on the head |
| valid + non-reviewable | 202 | none (acknowledged) |
| missing/invalid signature | 401 | none |
| oversized body | 413 | none |
| internal review could not complete | 200/202 | check concluded **neutral**, never success (FR-010) |

No response body ever contains a credential value (FR-006).

## Contract C — GitHub writes (the only permitted mutations)

The runtime's GitHub writes are EXACTLY:

```text
checks.create   — create a TenantGuard check-run on the PR head
checks.update   — update the existing check-run (idempotency, 014 FR-012)
```

Every write is routed through 014's `assertAllowedWrite`; any other operation (commit, push, merge, label, comment, review-request, ref update, file write) is unreachable and would throw `ForbiddenWriteError` (FR-012/SC-004). A Checks status is not a repository mutation — Principle VI holds.

## Consistency contract

For an identical diff, the live check's conclusion and findings MUST equal what 014's `handleEvent` produces (which equals the CLI `review-pr` verdict). The runtime adds transport + I/O only; it does not re-judge (FR-013/SC-002).

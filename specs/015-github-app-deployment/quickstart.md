# Quickstart: 015 GitHub App Deployment Runtime

How an operator runs the report-only GitHub App against live GitHub. (Docs-only design until implemented.)

## Prerequisites

- A registered GitHub App (from 014's permission set: `checks: write`, `contents: read`, `metadata: read`; webhook on `pull_request`) installed on the target repo/org.
- The App's **id**, **private key**, and **webhook secret**.

## Configure (secrets via environment only)

Set credentials in the deployment environment or secret manager — never in a file the repo tracks:

```text
TENANTGUARD_APP_ID=<app id>
TENANTGUARD_APP_PRIVATE_KEY=<private key>     # never logged or written to disk
TENANTGUARD_WEBHOOK_SECRET=<webhook secret>   # never logged or written to disk
PORT=<optional>
```

If any required variable is missing, the service **fails fast at startup** and names the missing variable — it never prints the value.

## Run

Start the service (self-hosted, single-tenant). Point the GitHub App's webhook URL at the service's public endpoint.

## What happens on a PR

1. A PR is opened → GitHub delivers a signed `pull_request` webhook.
2. The service verifies the HMAC signature. Unsigned/forged → rejected (401), nothing happens.
3. It checks out the PR head into an ephemeral directory, runs the existing review, posts a **TenantGuard** check, then **deletes** the directory.
4. A confirmed finding → `failure` with an inline annotation; suspected-only → `neutral`; clean → `success`; draft → never red; couldn't complete → honest `neutral`.

## Safety you can verify

- **Secrets never leak**: no log line, error, check payload, or written file contains the private key, webhook secret, or installation token (verified by the secret-safety test). Missing creds fail fast without printing values.
- **Report-only**: the only GitHub writes are creating/updating the check — no commits, pushes, merges, labels, or comments.
- **Stateless**: no database; the per-event checkout is deleted; zero repository source remains on disk after an event.
- **Honest**: bad input is rejected; an unreviewable event concludes neutral, never a false pass.

## Not in this feature

- No org-level dashboard / aggregation (P5).
- No required/blocking merge check (P6) — the service sets a status; only the repo owner's branch protection could make it required.
- No serverless or multi-tenant hosting (single self-hosted instance only).

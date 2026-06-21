import {
  verifySignature,
  parseEvent,
  handleEvent,
  WebhookSignatureError,
  type Workspace,
  type ChecksPayload,
} from "@tenantguard/github-app";
import type { GitHubApi } from "./github-api.js";
import { makeChecksClient } from "./checks-client.js";

export interface DispatchDeps {
  api: GitHubApi;
  workspace: Workspace;
  webhookSecret: string;
}

export type DispatchResult =
  | { status: 401; reason: "invalid_signature" }
  | { status: 202; reason: "ignored_non_reviewable" }
  | { status: 200; payload: ChecksPayload; checkId: number }
  | { status: 502; reason: "check_post_failed" };

/**
 * Handle ONE raw webhook delivery end-to-end. The async boundary lives here: `reviewPr`/`handleEvent`
 * are SYNCHRONOUS over their data sources, so we `await` the GitHub reads FIRST and pass sync
 * closures over the resolved values into `handleEvent` (advisor: octokit is async, the engine is not).
 *
 * Order (Contract B): verify signature → parse/filter action → resolve reads → handleEvent → respond.
 * A Checks-POST failure is caught HERE at the boundary (postCheck runs outside 014's safeRun); it
 * returns 502 with a secret-free reason — never an uncaught throw, never a leak.
 */
export async function dispatch(rawBody: string, signature: string | undefined, deps: DispatchDeps): Promise<DispatchResult> {
  // 1. Signature — reject before parsing/dispatch (FR-008).
  try {
    verifySignature(rawBody, signature, deps.webhookSecret);
  } catch (err) {
    if (err instanceof WebhookSignatureError) return { status: 401, reason: "invalid_signature" };
    throw err;
  }

  // 2. Parse + action filter — non-reviewable → acknowledged, no check (FR-009).
  const event = parseEvent(rawBody);
  if (event === null) return { status: 202, reason: "ignored_non_reviewable" };

  // 3. Resolve the async GitHub reads up front, then hand sync closures to the sync engine.
  const changed = await deps.api.listChangedFiles({ owner: event.owner, repo: event.repo, prNumber: event.prNumber });
  const meta = await deps.api.getPrMetadata({ owner: event.owner, repo: event.repo, prNumber: event.prNumber });

  // 4. Run the 014 handler. Review-incompleteness is already mapped to neutral inside handleEvent
  //    (safeRun); only the Checks POST can still throw, and we catch THAT here (advisor #3).
  try {
    const { payload, checkId } = await handleEvent(event, {
      checksClient: makeChecksClient(deps.api),
      workspace: deps.workspace,
      prChangedFiles: () => changed,
      prMetadata: () => meta,
    });
    return { status: 200, payload, checkId };
  } catch {
    // Checks API failed (rate limit / transient / permission). Secret-free reason; no retry loop.
    return { status: 502, reason: "check_post_failed" };
  }
}

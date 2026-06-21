import { createHmac } from "node:crypto";
import { describe, it, expect, vi, afterEach } from "vitest";
import type { Workspace } from "@tenantguard/github-app";
import { dispatch, type DispatchDeps } from "../src/server.js";
import type { GitHubApi } from "../src/github-api.js";

const SECRET = "WEBHOOK-SECRET-SENTINEL";
const TOKEN = "ghs_INSTALLATION_TOKEN_SENTINEL";
const sign = (b: string) => `sha256=${createHmac("sha256", SECRET).update(b).digest("hex")}`;

const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    action: "opened",
    pull_request: { number: 7, draft: false, head: { sha: "deadbeef" } },
    repository: { owner: { login: "org" }, name: "repo" },
    installation: { id: 1 },
    ...over,
  });

const ws: Workspace = { async checkout() { return "/tmp/x"; }, async dispose() {} };

/** An octokit-shaped error: the thrown object carries an Authorization header in its request config. */
function authBearingError(): Error {
  const err = new Error("HttpError: 403") as Error & { request?: unknown };
  err.request = { headers: { authorization: `token ${TOKEN}` } };
  return err;
}

const sentinels = [SECRET, TOKEN];
function assertNoSentinel(s: string) {
  for (const sec of sentinels) expect(s).not.toContain(sec);
}

afterEach(() => vi.restoreAllMocks());

describe("secret safety across all paths (US2 / SC-003)", () => {
  it("a Checks-API error carrying an auth header never leaks the token into the result or logs", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => logs.push(a.join(" ")));
    vi.spyOn(console, "warn").mockImplementation((...a) => logs.push(a.join(" ")));

    const api: GitHubApi = {
      async listChangedFiles() { return ["a.ts"]; },
      async getPrMetadata() { return { title: "t", state: "open", baseRefName: "main" }; },
      async findCheckRun() { return null; },
      async createCheckRun() { throw authBearingError(); },
      async updateCheckRun() {},
    };

    const deps: DispatchDeps = { api, workspace: ws, webhookSecret: SECRET };
    const res = await dispatch(body(), sign(body()), deps);

    // Boundary returns a secret-free 502; nothing logged contains a sentinel.
    expect(res.status).toBe(502);
    assertNoSentinel(JSON.stringify(res));
    assertNoSentinel(logs.join("\n"));
  });

  it("the happy-path result (payload) never contains a credential value", async () => {
    const api: GitHubApi = {
      async listChangedFiles() { return ["a.ts"]; },
      async getPrMetadata() { return { title: "t", state: "open", baseRefName: "main" }; },
      async findCheckRun() { return null; },
      async createCheckRun() { return { id: 1 }; },
      async updateCheckRun() {},
    };
    const res = await dispatch(body(), sign(body()), { api, workspace: ws, webhookSecret: SECRET });
    assertNoSentinel(JSON.stringify(res));
  });

  it("a rejected (bad-signature) request leaks nothing", async () => {
    const api: GitHubApi = {
      async listChangedFiles() { return []; },
      async getPrMetadata() { return { title: "", state: "", baseRefName: "" }; },
      async findCheckRun() { return null; },
      async createCheckRun() { return { id: 1 }; },
      async updateCheckRun() {},
    };
    const res = await dispatch(body(), "sha256=wrong", { api, workspace: ws, webhookSecret: SECRET });
    expect(res.status).toBe(401);
    assertNoSentinel(JSON.stringify(res));
  });
});

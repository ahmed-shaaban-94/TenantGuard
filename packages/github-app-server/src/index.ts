// Public surface for @tenantguard/github-app-server.
// Self-hostable deployment runtime for the 014 report-only GitHub App: webhook dispatch + concrete
// GitHub Checks client + ephemeral git workspace. Report-only, stateless, secret-safe.

export { loadCredentials, MissingCredentialError, REQUIRED_ENV, type AppCredentials } from "./config.js";
export { type GitHubApi } from "./github-api.js";
export { makeChecksClient } from "./checks-client.js";
export { makeGitWorkspace, WorkspaceError, type GitRunner, type GitWorkspaceDeps } from "./git-workspace.js";
export { dispatch, type DispatchDeps, type DispatchResult } from "./server.js";

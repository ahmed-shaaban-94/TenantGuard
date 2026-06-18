# TenantGuard

TenantGuard is a CLI-first SaaS Build Kernel for teams building multi-tenant SaaS systems with GitHub, specs, CI, and AI coding agents.

It helps teams answer:

- What is the current source truth?
- What is risky?
- What is blocked?
- What is the next safest task?
- What files may an AI agent touch?
- Is this PR ready to merge?

TenantGuard is not a SaaS boilerplate. It does not generate a full app. It controls the build process around architecture, gates, queues, prompts, and verification.

## MVP

The first version is a local CLI:

```bash
tenantguard scan
tenantguard queue
tenantguard route
tenantguard prompt Q-001 --agent claude
tenantguard review-pr --local-diff
```

## Core flow

```text
scan sources
→ build project map
→ run gates
→ derive queue
→ route next safest task
→ compile agent prompt
→ review result/PR
```

## Status

Product foundation stage. No production code yet.

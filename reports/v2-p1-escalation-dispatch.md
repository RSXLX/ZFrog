# V2 P1 Escalation Dispatch

- Generated at: 2026-03-23T05:41:11.886Z (UTC)
- Mode: dry-run
- Config: `.github/release-gates/v2-p1-escalation-dispatch.json`
- Summary source: `./scripts/ci/fixtures/v2-release-health-summary.sample.json`
- Repository: `n/a`
- Summary verdict: **PASS**

## Dispatch overview

| Metric | Value |
| --- | --- |
| P1 candidates | 1 |
| Existing open issue | 1 |
| Idempotency log skipped | 0 |
| Quota skipped | 0 |
| Missing owner route skipped | 0 |
| Planned create | 0 |
| Created | 0 |
| Dry-run create | 0 |
| Failed create | 0 |

## Actions

| Reason | Owner Route | Current | Previous | Delta | History | Signals | Decision | Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| workspace-startup-failed | workspace-platform | 3 | 2 | 1 | 3 -> 2 -> 1 | budget-exceeded,week-over-week-up,consecutive-weekly-up | skip-existing | [#101](https://example.test/zfrog/issues/101) |


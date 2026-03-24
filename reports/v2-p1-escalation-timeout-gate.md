# V2 P1 Escalation Timeout Gate Report

- Generated at: 2026-03-23T06:01:42.517Z (UTC)
- Gate: `v2-p1-escalation-timeout-gate`
- Config: `/tmp/v2-p1-escalation-timeout-gate-pass.json`
- Issue source: `fixture:./scripts/ci/fixtures/v2-p1-open-issues-timeout.sample.json`
- Workflow run URL: n/a
- Workflow artifacts URL: n/a
- Verdict: **PASS**

## Timeout overview

| Metric | Value |
| --- | --- |
| Issue candidates | 2 |
| Overdue issues | 0 |
| Overdue by open timeout | 0 |
| Overdue by idle timeout | 0 |
| Reason parsed from marker | 2 |
| Reason parsed from title | 0 |

## Gate checks

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| Overdue issue budget | <= 0 | 0 | PASS |
| Reminder failure budget | <= 0 | 0 | PASS |

## Reminder execution

- Reminder enabled: no
- Reminder attempted: 0
- Reminder posted: 0
- Reminder skipped: 0
- Reminder failed: 0

## Overdue issues

- none


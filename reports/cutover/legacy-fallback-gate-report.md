# Legacy Fallback Gate Report

- Generated at: 2026-03-23T03:13:03.377Z (UTC)
- Gate: `v2-cutover-fallback`
- Config: `./.github/release-gates/v2-cutover-fallback-gate.json`
- Log source: `./reports/cutover/dev-entry.log`
- Window: 2026-03-16T03:13:03.377Z ~ 2026-03-23T03:13:03.377Z (7 days)
- Total launches in window: 0
- Legacy launches in window: 0 (0.00%)
- Excluded dry-run launches: 2
- Verdict: **PASS**

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| Legacy launch count | <= 3 | 0 | PASS |
| Legacy launch rate | <= 20.00% | insufficient sample (0 < 5) | SKIP |
| Reason budget: workspace-startup-failed | <= 1 | 0 | PASS |

## Legacy reasons in window

- none


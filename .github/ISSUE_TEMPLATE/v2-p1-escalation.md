{{reasonMarker}}
# V2 P1 Escalation Card

## Trigger

- Reason: `{{reason}}`
- Owner route: `{{ownerRoute}}`
- Owner route source: `{{ownerRouteSource}}`
- Current: {{current}}
- Previous: {{previous}}
- Delta: {{deltaSigned}}
- History (new -> old): {{history}}
- Signals: {{signals}}
- Weekly summary verdict: {{summaryVerdict}}
- Weekly summary generated at: {{summaryGeneratedAt}}
- Window days: {{windowDays}}
- Dispatch quality passed: {{dispatchQualityPassed}}
- Dispatch quality latest run failed: {{dispatchQualityLatestRunFailed}}
- Dispatch quality consecutive failure detected: {{dispatchQualityConsecutiveFailureDetected}}
- Dispatch quality consecutive failed weeks: {{dispatchQualityConsecutiveFailedWeeks}} (threshold: {{dispatchQualityConsecutiveFailureThreshold}})
- Dispatch quality latest run: {{dispatchQualityLatestRun}}
- Dispatch quality latest run URL: {{dispatchQualityLatestRunUrl}}
- Timeout gate passed: {{timeoutPassed}}
- Timeout gate latest run failed: {{timeoutLatestRunFailed}}
- Timeout gate consecutive failure detected: {{timeoutConsecutiveFailureDetected}}
- Timeout gate consecutive failed weeks: {{timeoutConsecutiveFailedWeeks}} (threshold: {{timeoutConsecutiveFailureThreshold}})
- Timeout gate latest run: {{timeoutLatestRun}}
- Timeout gate latest run URL: {{timeoutLatestRunUrl}}
- Timeout stability gate passed: {{timeoutStabilityPassed}}
- Timeout stability gate latest run failed: {{timeoutStabilityLatestRunFailed}}
- Timeout stability gate consecutive failure detected: {{timeoutStabilityConsecutiveFailureDetected}}
- Timeout stability gate consecutive failed weeks: {{timeoutStabilityConsecutiveFailedWeeks}} (threshold: {{timeoutStabilityConsecutiveFailureThreshold}})
- Timeout stability gate latest run: {{timeoutStabilityLatestRun}}
- Timeout stability gate latest run URL: {{timeoutStabilityLatestRunUrl}}
- Dispatch workflow run URL: {{dispatchWorkflowRunUrl}}
- Dispatch workflow artifacts URL: {{dispatchWorkflowArtifactsUrl}}
- Dispatch workflow run ID: {{dispatchWorkflowRunId}}
- Dispatch workflow run attempt: {{dispatchWorkflowRunAttempt}}

## Expected actions

1. Confirm root cause and impacted surface.
2. Submit fix PR with tests and rollback note.
3. Link verification evidence from nightly and regression reports.

## Evidence

- reports/v2-release-health-summary.md
- reports/v2-release-health-summary.json
- reports/v2-p1-dispatch-quality-gate.md
- reports/v2-p1-dispatch-quality-gate.json
- reports/v2-p1-escalation-timeout-gate.md
- reports/v2-p1-escalation-timeout-gate.json
- reports/v2-p1-timeout-stability-observation-gate.md
- reports/v2-p1-timeout-stability-observation-gate.json

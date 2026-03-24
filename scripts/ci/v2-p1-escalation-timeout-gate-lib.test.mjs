import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTimeoutReminderComment,
  buildTimeoutReminderMarker,
  evaluateP1EscalationTimeoutGate,
  renderP1EscalationTimeoutGateReport
} from './v2-p1-escalation-timeout-gate-lib.mjs';

const buildIssues = () => [
  {
    number: 201,
    state: 'open',
    title: '[V2-W15-06][P1 Escalation] workspace-startup-failed',
    html_url: 'https://example.test/zfrog/issues/201',
    body: '<!-- v2-p1-reason:workspace-startup-failed -->\nissue body',
    created_at: '2026-03-18T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    labels: [{ name: 'p1' }, { name: 'v2' }, { name: 'release-health' }]
  },
  {
    number: 202,
    state: 'open',
    title: '[V2-W15-06][P1 Escalation] manual-debug',
    html_url: 'https://example.test/zfrog/issues/202',
    body: '<!-- v2-p1-reason:manual-debug -->\nissue body',
    created_at: '2026-03-23T06:00:00Z',
    updated_at: '2026-03-23T10:00:00Z',
    labels: [{ name: 'p1' }, { name: 'v2' }, { name: 'release-health' }]
  }
];

const buildConfig = (overrides = {}) => {
  const { issue: issueOverrides = {}, ...restOverrides } = overrides ?? {};
  return {
    gateId: 'v2-p1-escalation-timeout-gate',
    issue: {
      requiredLabels: ['p1', 'v2', 'release-health'],
      titlePrefixes: ['[V2-W15-06][P1 Escalation]'],
      maxOpenHours: 72,
      maxIdleHours: 48,
      maxOverdueIssues: 0,
      ...issueOverrides
    },
    ...restOverrides
  };
};

const buildSummary = (overrides = {}) => ({
  generatedAt: '2026-03-23T12:00:00.000Z',
  verdict: 'PASS',
  timeoutConsecutiveFailureDetected: false,
  timeoutConsecutiveFailedWeeks: 0,
  timeoutConsecutivePassedWeeks: 2,
  timeoutLatestRunFailed: false,
  timeoutStabilityConsecutiveFailureDetected: false,
  timeoutStabilityConsecutiveFailedWeeks: 0,
  timeoutStabilityConsecutivePassedWeeks: 2,
  timeoutStabilityLatestRunFailed: false,
  ...(overrides ?? {})
});

test('evaluateP1EscalationTimeoutGate fails when overdue issue exceeds budget', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: buildIssues(),
    config: buildConfig(),
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.equal(result.passed, false);
  assert.equal(result.metrics.issueCandidates, 2);
  assert.equal(result.metrics.overdueIssues, 1);
  assert.equal(result.overdueIssues[0].issueNumber, 201);
  assert.ok(result.overdueIssues[0].overdueReasons.includes('open-timeout'));
});

test('evaluateP1EscalationTimeoutGate passes when budget allows one overdue issue', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: buildIssues(),
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1
      }
    }),
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.equal(result.passed, true);
  const overdueBudgetCheck = result.checks.find((check) => check.id === 'overdue-issue-budget');
  assert.ok(overdueBudgetCheck);
  assert.equal(overdueBudgetCheck.pass, true);
});

test('evaluateP1EscalationTimeoutGate fails when required labels drift from escalation issue', () => {
  const issues = buildIssues();
  issues[1] = {
    ...issues[1],
    labels: [{ name: 'p1' }, { name: 'v2' }]
  };

  const result = evaluateP1EscalationTimeoutGate({
    issues,
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1
      }
    }),
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.equal(result.passed, false);
  assert.equal(result.metrics.labelDriftIssues, 1);
  assert.equal(result.labelDriftIssues[0].issueNumber, 202);
  assert.deepEqual(result.labelDriftIssues[0].missingRequiredLabels, ['release-health']);

  const labelCheck = result.checks.find((check) => check.id === 'required-label-compliance');
  assert.ok(labelCheck);
  assert.equal(labelCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate fails when timeout trend has no open candidate issue', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: buildIssues(),
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: true,
      timeoutConsecutiveFailedWeeks: 2,
      timeoutConsecutivePassedWeeks: 0,
      timeoutLatestRunFailed: true
    })
  });

  assert.equal(result.passed, false);
  const presenceCheck = result.checks.find((check) => check.id === 'timeout-candidate-open-issue-presence');
  assert.ok(presenceCheck);
  assert.equal(presenceCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate fails when recovered timeout candidate issue stays open', () => {
  const timeoutCandidateIssue = {
    number: 299,
    state: 'open',
    title: '[V2-W15-06][P1 Escalation] p1-timeout-consecutive-failed-weeks',
    html_url: 'https://example.test/zfrog/issues/299',
    body: '<!-- v2-p1-reason:p1-timeout-consecutive-failed-weeks -->\nissue body',
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-23T10:00:00Z',
    labels: [{ name: 'p1' }, { name: 'v2' }, { name: 'release-health' }]
  };

  const result = evaluateP1EscalationTimeoutGate({
    issues: [timeoutCandidateIssue],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutConsecutivePassedWeeks: 2,
      timeoutLatestRunFailed: false
    })
  });

  assert.equal(result.passed, false);
  const closeoutCheck = result.checks.find((check) => check.id === 'timeout-candidate-closeout-after-recovery');
  assert.ok(closeoutCheck);
  assert.equal(closeoutCheck.pass, false);
  assert.equal(result.metrics.timeoutCandidateOpenIssues, 1);
});

test('evaluateP1EscalationTimeoutGate fails when timeout candidate closes before recovery window', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutConsecutivePassedWeeks: 1,
      timeoutLatestRunFailed: false
    })
  });

  assert.equal(result.passed, false);
  const observationHoldCheck = result.checks.find(
    (check) => check.id === 'timeout-candidate-observation-hold-before-recovery'
  );
  assert.ok(observationHoldCheck);
  assert.equal(observationHoldCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate passes when observation window keeps timeout candidate open', () => {
  const timeoutCandidateIssue = {
    number: 301,
    state: 'open',
    title: '[V2-W15-06][P1 Escalation] p1-timeout-consecutive-failed-weeks',
    html_url: 'https://example.test/zfrog/issues/301',
    body: '<!-- v2-p1-reason:p1-timeout-consecutive-failed-weeks -->\nissue body',
    created_at: '2026-03-23T07:00:00Z',
    updated_at: '2026-03-23T10:00:00Z',
    labels: [{ name: 'p1' }, { name: 'v2' }, { name: 'release-health' }]
  };

  const result = evaluateP1EscalationTimeoutGate({
    issues: [timeoutCandidateIssue],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 0,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutConsecutivePassedWeeks: 1,
      timeoutLatestRunFailed: false
    })
  });

  assert.equal(result.passed, true);
  const observationHoldCheck = result.checks.find(
    (check) => check.id === 'timeout-candidate-observation-hold-before-recovery'
  );
  assert.ok(observationHoldCheck);
  assert.equal(observationHoldCheck.pass, true);
});

test('evaluateP1EscalationTimeoutGate passes candidate closeout check after recovery when issue closed', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      issue: {
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutConsecutivePassedWeeks: 2,
      timeoutLatestRunFailed: false
    })
  });

  assert.equal(result.passed, true);
  const closeoutCheck = result.checks.find((check) => check.id === 'timeout-candidate-closeout-after-recovery');
  assert.ok(closeoutCheck);
  assert.equal(closeoutCheck.pass, true);
});

test('evaluateP1EscalationTimeoutGate fails when closeout summary missing generatedAt', () => {
  const summary = buildSummary();
  delete summary.generatedAt;

  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary
  });

  assert.equal(result.passed, false);
  const generatedAtCheck = result.checks.find((check) => check.id === 'closeout-summary-generated-at');
  assert.ok(generatedAtCheck);
  assert.equal(generatedAtCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate fails when closeout summary exceeds recency window', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      summary: {
        maxAgeHours: 24
      },
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      generatedAt: '2026-03-22T11:00:00.000Z'
    })
  });

  assert.equal(result.passed, false);
  const recencyCheck = result.checks.find((check) => check.id === 'closeout-summary-recency');
  assert.ok(recencyCheck);
  assert.equal(recencyCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate fails when closeout summary is ahead beyond skew window', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      summary: {
        maxAgeHours: 24,
        maxFutureSkewMinutes: 5
      },
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      generatedAt: '2026-03-23T12:20:00.000Z'
    })
  });

  assert.equal(result.passed, false);
  const futureCheck = result.checks.find((check) => check.id === 'closeout-summary-not-future');
  assert.ok(futureCheck);
  assert.equal(futureCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate passes when closeout summary is ahead within skew window', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      summary: {
        maxAgeHours: 24,
        maxFutureSkewMinutes: 5
      },
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      generatedAt: '2026-03-23T12:03:00.000Z'
    })
  });

  assert.equal(result.passed, true);
  const futureCheck = result.checks.find((check) => check.id === 'closeout-summary-not-future');
  assert.ok(futureCheck);
  assert.equal(futureCheck.pass, true);
});

test('evaluateP1EscalationTimeoutGate fails when recovery threshold ratchet target is not applied', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 2,
          maxOpenIssuesAfterRecovery: 0,
          recoveryThresholdRatcheting: {
            enabled: true,
            minConsecutivePassedWeeksToRequireTarget: 2,
            targetRecoveryConsecutivePassedWeeks: 3
          }
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutConsecutivePassedWeeks: 2,
      timeoutLatestRunFailed: false
    })
  });

  assert.equal(result.passed, false);
  const ratchetCheck = result.checks.find((check) => check.id === 'timeout-candidate-recovery-threshold-ratchet');
  assert.ok(ratchetCheck);
  assert.equal(ratchetCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate passes when recovery threshold ratchet target is met', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseout: {
          enabled: true,
          reason: 'p1-timeout-consecutive-failed-weeks',
          minOpenIssuesWhenTrendDetected: 1,
          minOpenIssuesBeforeRecoveryCloseout: 1,
          recoveryConsecutivePassedWeeks: 3,
          maxOpenIssuesAfterRecovery: 0,
          recoveryThresholdRatcheting: {
            enabled: true,
            minConsecutivePassedWeeksToRequireTarget: 2,
            targetRecoveryConsecutivePassedWeeks: 3
          }
        }
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutConsecutivePassedWeeks: 3,
      timeoutLatestRunFailed: false
    })
  });

  assert.equal(result.passed, true);
  const ratchetCheck = result.checks.find((check) => check.id === 'timeout-candidate-recovery-threshold-ratchet');
  assert.ok(ratchetCheck);
  assert.equal(ratchetCheck.pass, true);
});

test('evaluateP1EscalationTimeoutGate fails when timeout stability trend has no open candidate issue', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: buildIssues(),
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseouts: [
          {
            enabled: true,
            reason: 'p1-timeout-stability-consecutive-failed-weeks',
            minOpenIssuesWhenTrendDetected: 1,
            minOpenIssuesBeforeRecoveryCloseout: 1,
            recoveryConsecutivePassedWeeks: 2,
            maxOpenIssuesAfterRecovery: 0
          }
        ]
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutStabilityConsecutiveFailureDetected: true,
      timeoutStabilityConsecutiveFailedWeeks: 2,
      timeoutStabilityConsecutivePassedWeeks: 0,
      timeoutStabilityLatestRunFailed: true
    })
  });

  assert.equal(result.passed, false);
  const presenceCheck = result.checks.find((check) => check.id === 'timeout-stability-candidate-open-issue-presence');
  assert.ok(presenceCheck);
  assert.equal(presenceCheck.pass, false);
});

test('evaluateP1EscalationTimeoutGate passes timeout stability candidate closeout after recovery when issue closed', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: [],
    config: buildConfig({
      issue: {
        maxOverdueIssues: 1,
        candidateCloseouts: [
          {
            enabled: true,
            reason: 'p1-timeout-stability-consecutive-failed-weeks',
            minOpenIssuesWhenTrendDetected: 1,
            minOpenIssuesBeforeRecoveryCloseout: 1,
            recoveryConsecutivePassedWeeks: 2,
            maxOpenIssuesAfterRecovery: 0
          }
        ]
      }
    }),
    now: new Date('2026-03-23T12:00:00Z'),
    summary: buildSummary({
      timeoutStabilityConsecutiveFailureDetected: false,
      timeoutStabilityConsecutiveFailedWeeks: 0,
      timeoutStabilityConsecutivePassedWeeks: 2,
      timeoutStabilityLatestRunFailed: false
    })
  });

  assert.equal(result.passed, true);
  const closeoutCheck = result.checks.find((check) => check.id === 'timeout-stability-candidate-closeout-after-recovery');
  assert.ok(closeoutCheck);
  assert.equal(closeoutCheck.pass, true);
});

test('buildTimeoutReminderMarker/comment include workflow deep links', () => {
  const marker = buildTimeoutReminderMarker({
    issueNumber: 201,
    workflowRunId: '999'
  });
  assert.equal(marker, '<!-- v2-p1-timeout-reminder:201:999 -->');

  const reminder = buildTimeoutReminderComment({
    issue: {
      issueNumber: 201,
      reason: 'workspace-startup-failed',
      openHours: 120,
      idleHours: 60,
      overdueReasons: ['open-timeout', 'idle-timeout']
    },
    runtimeContext: {
      workflowRunUrl: 'https://example.test/zfrog/actions/runs/999',
      workflowArtifactsUrl: 'https://example.test/zfrog/actions/runs/999#artifacts',
      workflowRunId: '999'
    },
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.match(reminder.body, /V2 P1 Escalation Timeout Reminder/);
  assert.match(reminder.body, /workspace-startup-failed/);
  assert.match(reminder.body, /actions\/runs\/999#artifacts/);
});

test('renderP1EscalationTimeoutGateReport includes checks and overdue table', () => {
  const result = evaluateP1EscalationTimeoutGate({
    issues: buildIssues(),
    config: buildConfig(),
    now: new Date('2026-03-23T12:00:00Z')
  });

  const report = renderP1EscalationTimeoutGateReport({
    generatedAt: new Date('2026-03-23T12:00:00Z'),
    configPath: '.github/release-gates/v2-p1-escalation-timeout-gate.json',
    issueSource: 'fixture:test',
    summarySource: 'fixture:summary',
    runtimeContext: {
      workflowRunUrl: 'https://example.test/zfrog/actions/runs/999',
      workflowArtifactsUrl: 'https://example.test/zfrog/actions/runs/999#artifacts'
    },
    result,
    reminder: {
      enabled: true,
      attempted: 1,
      posted: 1,
      skipped: 0,
      failed: 0
    }
  });

  assert.match(report, /V2 P1 Escalation Timeout Gate Report/);
  assert.match(report, /Gate checks/);
  assert.match(report, /Summary source/);
  assert.match(report, /Required label drift issues/);
  assert.match(report, /Timeout candidate closeout/);
  assert.match(report, /Timeout stability candidate closeout/);
  assert.match(report, /Overdue issues/);
  assert.match(report, /workspace-startup-failed/);
});

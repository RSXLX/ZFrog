import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDispatchIdempotencyKey,
  buildDispatchPlan,
  buildReasonMarker,
  evaluateDispatchSummaryFreshness,
  extractReasonFromMarker,
  isRetryableIssueCreateError,
  renderDispatchReport,
  runWithRetry,
  toRetryPolicy,
  validateDispatchSchema
} from './v2-p1-escalation-dispatch-lib.mjs';

const buildSummary = () => ({
  generatedAt: '2026-03-23T12:00:00Z',
  verdict: 'PASS',
  dispatchQualityPassed: true,
  dispatchQualityLatestRunFailed: false,
  dispatchQualityConsecutiveFailureDetected: false,
  dispatchQualityConsecutiveFailedWeeks: 0,
  dispatchQualityConsecutivePassedWeeks: 1,
  dispatchQualityLatestRun: {
    event: 'schedule',
    conclusion: 'success',
    updatedAt: '2026-03-23T11:55:00.000Z',
    url: 'https://example.test/actions/runs/300'
  },
  timeoutPassed: true,
  timeoutLatestRunFailed: false,
  timeoutConsecutiveFailureDetected: false,
  timeoutConsecutiveFailedWeeks: 0,
  timeoutConsecutivePassedWeeks: 1,
  timeoutLatestRun: {
    event: 'schedule',
    conclusion: 'success',
    updatedAt: '2026-03-23T07:00:00.000Z',
    url: 'https://example.test/actions/runs/500'
  },
  timeoutStabilityPassed: true,
  timeoutStabilityLatestRunFailed: false,
  timeoutStabilityConsecutiveFailureDetected: false,
  timeoutStabilityConsecutiveFailedWeeks: 0,
  timeoutStabilityConsecutivePassedWeeks: 1,
  timeoutStabilityLatestRun: {
    event: 'schedule',
    conclusion: 'success',
    updatedAt: '2026-03-23T05:00:00.000Z',
    url: 'https://example.test/actions/runs/600'
  },
  policy: {
    dispatchQuality: {
      consecutiveFailureWeeks: 2
    },
    timeout: {
      consecutiveFailureWeeks: 2
    },
    timeoutStability: {
      consecutiveFailureWeeks: 2
    }
  },
  windows: {
    windowDays: 7
  },
  p1CandidateReasons: [
    {
      reason: 'workspace-startup-failed',
      current: 3,
      previous: 2,
      delta: 1,
      history: [3, 2, 1],
      signals: ['budget-exceeded', 'week-over-week-up', 'consecutive-weekly-up']
    },
    {
      reason: 'manual-debug',
      current: 2,
      previous: 1,
      delta: 1,
      history: [2, 1, 0],
      signals: ['week-over-week-up', 'consecutive-weekly-up']
    }
  ]
});

test('buildReasonMarker + extractReasonFromMarker roundtrip reason id', () => {
  const marker = buildReasonMarker('workspace-startup-failed');
  assert.equal(marker, '<!-- v2-p1-reason:workspace-startup-failed -->');
  assert.equal(extractReasonFromMarker(marker), 'workspace-startup-failed');
  assert.equal(extractReasonFromMarker('no-marker'), null);
});

test('buildDispatchPlan skips existing issue and prepares payload for missing reason', () => {
  const summary = buildSummary();
  const config = {
    issue: {
      titlePrefix: '[Test P1]',
      labels: ['p1', 'v2'],
      defaultAssignees: ['qa-owner'],
      reasonAssignees: {
        'manual-debug': ['tech-lead']
      },
      reasonLabels: {
        'manual-debug': ['cutover']
      }
    }
  };

  const openIssues = [
    {
      number: 88,
      title: '[Test P1] workspace-startup-failed',
      html_url: 'https://example.test/issues/88',
      body: `${buildReasonMarker('workspace-startup-failed')}\nexisting`
    }
  ];

  const plan = buildDispatchPlan({ summary, config, openIssues });
  assert.equal(plan.actions.length, 2);

  const existing = plan.actions.find((item) => item.reason === 'workspace-startup-failed');
  assert.ok(existing);
  assert.equal(existing.decision, 'skip-existing');
  assert.equal(existing.issueNumber, 88);

  const create = plan.actions.find((item) => item.reason === 'manual-debug');
  assert.ok(create);
  assert.equal(create.decision, 'create');
  assert.equal(create.payload.title, '[Test P1] manual-debug');
  assert.deepEqual(create.payload.labels, ['p1', 'v2', 'cutover']);
  assert.deepEqual(create.payload.assignees, ['qa-owner', 'tech-lead']);
  assert.match(create.payload.body, /V2 P1 Escalation Card/);
});

test('buildDispatchPlan enforces maxCreatePerRun quota', () => {
  const summary = buildSummary();
  const config = {
    issue: {
      titlePrefix: '[Quota Test]',
      maxCreatePerRun: 1
    }
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [] });
  assert.equal(plan.actions.length, 2);
  assert.equal(plan.actions.filter((item) => item.decision === 'create').length, 1);
  assert.equal(plan.actions.filter((item) => item.decision === 'skip-quota').length, 1);
});

test('evaluateDispatchSummaryFreshness passes for fresh summary', () => {
  const freshness = evaluateDispatchSummaryFreshness({
    summary: buildSummary(),
    config: {
      summary: {
        requireGeneratedAt: true,
        maxAgeHours: 36,
        maxFutureSkewMinutes: 5
      }
    },
    now: new Date('2026-03-23T18:00:00Z')
  });

  assert.equal(freshness.passed, true);
  assert.equal(freshness.checks.every((check) => check.pass), true);
});

test('evaluateDispatchSummaryFreshness fails when generatedAt is missing', () => {
  const summary = buildSummary();
  delete summary.generatedAt;

  const freshness = evaluateDispatchSummaryFreshness({
    summary,
    config: {
      summary: {
        requireGeneratedAt: true,
        maxAgeHours: 36
      }
    },
    now: new Date('2026-03-23T18:00:00Z')
  });

  assert.equal(freshness.passed, false);
  const check = freshness.checks.find((item) => item.id === 'dispatch-summary-generated-at');
  assert.ok(check);
  assert.equal(check.pass, false);
});

test('evaluateDispatchSummaryFreshness fails when summary is stale', () => {
  const freshness = evaluateDispatchSummaryFreshness({
    summary: {
      ...buildSummary(),
      generatedAt: '2026-03-21T00:00:00Z'
    },
    config: {
      summary: {
        requireGeneratedAt: true,
        maxAgeHours: 24
      }
    },
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.equal(freshness.passed, false);
  const check = freshness.checks.find((item) => item.id === 'dispatch-summary-recency');
  assert.ok(check);
  assert.equal(check.pass, false);
});

test('evaluateDispatchSummaryFreshness fails when summary generatedAt is ahead beyond skew window', () => {
  const freshness = evaluateDispatchSummaryFreshness({
    summary: {
      ...buildSummary(),
      generatedAt: '2026-03-23T12:20:00Z'
    },
    config: {
      summary: {
        requireGeneratedAt: true,
        maxAgeHours: 24,
        maxFutureSkewMinutes: 5
      }
    },
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.equal(freshness.passed, false);
  const check = freshness.checks.find((item) => item.id === 'dispatch-summary-not-future');
  assert.ok(check);
  assert.equal(check.pass, false);
});

test('evaluateDispatchSummaryFreshness passes when summary generatedAt is ahead within skew window', () => {
  const freshness = evaluateDispatchSummaryFreshness({
    summary: {
      ...buildSummary(),
      generatedAt: '2026-03-23T12:03:00Z'
    },
    config: {
      summary: {
        requireGeneratedAt: true,
        maxAgeHours: 24,
        maxFutureSkewMinutes: 5
      }
    },
    now: new Date('2026-03-23T12:00:00Z')
  });

  assert.equal(freshness.passed, true);
  const check = freshness.checks.find((item) => item.id === 'dispatch-summary-not-future');
  assert.ok(check);
  assert.equal(check.pass, true);
});

test('renderDispatchReport contains overview and action rows', () => {
  const summary = buildSummary();
  const plan = buildDispatchPlan({ summary, config: { issue: {} }, openIssues: [] });

  const results = {
    actions: plan.actions.map((item) =>
      item.decision === 'create'
        ? { ...item, decision: 'would-create' }
        : item
    )
  };

  const report = renderDispatchReport({
    generatedAt: new Date('2026-03-23T12:00:00Z'),
    configPath: '.github/release-gates/v2-p1-escalation-dispatch.json',
    summaryPath: 'reports/v2-release-health-summary.json',
    repository: 'zfrog/test',
    mode: 'dry-run',
    summary,
    plan,
    results
  });

  assert.match(report, /V2 P1 Escalation Dispatch/);
  assert.match(report, /Dispatch overview/);
  assert.match(report, /workspace-startup-failed/);
  assert.match(report, /would-create/);
});

test('buildDispatchPlan blocks create when owner route is required but missing', () => {
  const summary = buildSummary();
  const config = {
    issue: {
      titlePrefix: '[Owner Route Gate]',
      failOnMissingOwnerRoute: true,
      reasonOwnerRoutes: {
        'workspace-startup-failed': 'workspace-platform'
      }
    }
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [] });
  assert.equal(plan.actions.length, 2);

  const resolved = plan.actions.find((item) => item.reason === 'workspace-startup-failed');
  assert.ok(resolved);
  assert.equal(resolved.decision, 'create');
  assert.equal(resolved.ownerRoute, 'workspace-platform');

  const missing = plan.actions.find((item) => item.reason === 'manual-debug');
  assert.ok(missing);
  assert.equal(missing.decision, 'skip-owner-route-missing');
  assert.equal(missing.ownerRoute, '');
});

test('buildDispatchPlan renders custom template with owner route context', () => {
  const summary = {
    ...buildSummary(),
    p1CandidateReasons: [
      {
        reason: 'workspace-startup-failed',
        current: 3,
        previous: 2,
        delta: 1,
        history: [3, 2, 1],
        signals: ['budget-exceeded']
      }
    ]
  };

  const config = {
    issue: {
      titlePrefix: '[Template Test]',
      defaultOwnerRoute: 'release-ops'
    }
  };

  const templates = {
    defaultTemplate:
      'marker={{reasonMarker}}; reason={{reason}}; owner={{ownerRoute}}; dq={{dispatchQualityConsecutiveFailureDetected}}; delta={{deltaSigned}}'
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [], templates });
  assert.equal(plan.actions.length, 1);

  const action = plan.actions[0];
  assert.equal(action.decision, 'create');
  assert.equal(action.ownerRoute, 'release-ops');
  assert.match(action.payload.body, /owner=release-ops/);
  assert.match(action.payload.body, /dq=no/);
  assert.match(action.payload.body, /delta=\+1/);
  assert.match(action.payload.body, /<!-- v2-p1-reason:workspace-startup-failed -->/);
});

test('buildDispatchPlan appends dispatch-quality trend reason and quality context', () => {
  const summary = {
    ...buildSummary(),
    p1CandidateReasons: [],
    dispatchQualityPassed: false,
    dispatchQualityLatestRunFailed: true,
    dispatchQualityConsecutiveFailureDetected: true,
    dispatchQualityConsecutiveFailedWeeks: 3,
    dispatchQualityLatestRun: {
      event: 'schedule',
      conclusion: 'failure',
      updatedAt: '2026-03-23T10:00:00.000Z',
      url: 'https://example.test/actions/runs/399'
    },
    policy: {
      dispatchQuality: {
        consecutiveFailureWeeks: 2
      }
    }
  };

  const config = {
    issue: {
      titlePrefix: '[Dispatch Trend]',
      defaultOwnerRoute: 'release-automation'
    }
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [] });
  assert.equal(plan.actions.length, 1);

  const action = plan.actions[0];
  assert.equal(action.reason, 'dispatch-quality-consecutive-failed-weeks');
  assert.equal(action.decision, 'create');
  assert.equal(action.ownerRoute, 'release-automation');
  assert.match(action.payload.body, /Dispatch quality latest run failed: yes/);
  assert.match(action.payload.body, /Dispatch quality consecutive failed weeks: 3 \(threshold: 2\)/);
  assert.match(action.payload.body, /Dispatch quality latest run URL: https:\/\/example\.test\/actions\/runs\/399/);
  assert.match(action.payload.body, /dispatch-quality-trend-failed/);
});

test('buildDispatchPlan appends timeout trend reason and timeout context', () => {
  const summary = {
    ...buildSummary(),
    p1CandidateReasons: [],
    timeoutPassed: false,
    timeoutLatestRunFailed: true,
    timeoutConsecutiveFailureDetected: true,
    timeoutConsecutiveFailedWeeks: 3,
    timeoutLatestRun: {
      event: 'schedule',
      conclusion: 'failure',
      updatedAt: '2026-03-23T07:00:00.000Z',
      url: 'https://example.test/actions/runs/499'
    },
    policy: {
      ...buildSummary().policy,
      timeout: {
        consecutiveFailureWeeks: 2
      }
    }
  };

  const config = {
    issue: {
      titlePrefix: '[Timeout Trend]',
      defaultOwnerRoute: 'release-automation'
    }
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [] });
  assert.equal(plan.actions.length, 1);

  const action = plan.actions[0];
  assert.equal(action.reason, 'p1-timeout-consecutive-failed-weeks');
  assert.equal(action.decision, 'create');
  assert.equal(action.ownerRoute, 'release-automation');
  assert.match(action.payload.body, /Timeout gate latest run failed: yes/);
  assert.match(action.payload.body, /Timeout gate consecutive failed weeks: 3 \(threshold: 2\)/);
  assert.match(action.payload.body, /Timeout gate latest run URL: https:\/\/example\.test\/actions\/runs\/499/);
  assert.match(action.payload.body, /timeout-gate-trend-failed/);
});

test('buildDispatchPlan appends timeout-stability trend reason and context', () => {
  const summary = {
    ...buildSummary(),
    p1CandidateReasons: [],
    timeoutStabilityPassed: false,
    timeoutStabilityLatestRunFailed: true,
    timeoutStabilityConsecutiveFailureDetected: true,
    timeoutStabilityConsecutiveFailedWeeks: 3,
    timeoutStabilityLatestRun: {
      event: 'schedule',
      conclusion: 'failure',
      updatedAt: '2026-03-23T05:00:00.000Z',
      url: 'https://example.test/actions/runs/699'
    },
    policy: {
      ...buildSummary().policy,
      timeoutStability: {
        consecutiveFailureWeeks: 2
      }
    }
  };

  const config = {
    issue: {
      titlePrefix: '[Timeout Stability Trend]',
      defaultOwnerRoute: 'release-automation'
    }
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [] });
  assert.equal(plan.actions.length, 1);

  const action = plan.actions[0];
  assert.equal(action.reason, 'p1-timeout-stability-consecutive-failed-weeks');
  assert.equal(action.decision, 'create');
  assert.equal(action.ownerRoute, 'release-automation');
  assert.match(action.payload.body, /Timeout stability gate latest run failed: yes/);
  assert.match(action.payload.body, /Timeout stability gate consecutive failed weeks: 3 \(threshold: 2\)/);
  assert.match(action.payload.body, /Timeout stability gate latest run URL: https:\/\/example\.test\/actions\/runs\/699/);
  assert.match(action.payload.body, /timeout-stability-gate-trend-failed/);
});

test('buildDispatchPlan injects workflow run and artifact links into issue body context', () => {
  const summary = {
    ...buildSummary(),
    p1CandidateReasons: [
      {
        reason: 'workspace-startup-failed',
        current: 4,
        previous: 2,
        delta: 2,
        history: [4, 2, 1],
        signals: ['budget-exceeded', 'consecutive-weekly-up']
      }
    ]
  };

  const plan = buildDispatchPlan({
    summary,
    config: {
      issue: {
        titlePrefix: '[W15-06]',
        defaultOwnerRoute: 'workspace-platform'
      }
    },
    openIssues: [],
    runtimeContext: {
      workflowRunUrl: 'https://example.test/zfrog/actions/runs/901',
      workflowArtifactsUrl: 'https://example.test/zfrog/actions/runs/901#artifacts',
      workflowRunId: '901',
      workflowRunAttempt: '2'
    }
  });

  assert.equal(plan.actions.length, 1);
  const action = plan.actions[0];
  assert.equal(action.decision, 'create');
  assert.match(action.payload.body, /Dispatch workflow run URL: https:\/\/example\.test\/zfrog\/actions\/runs\/901/);
  assert.match(action.payload.body, /Dispatch workflow artifacts URL: https:\/\/example\.test\/zfrog\/actions\/runs\/901#artifacts/);
  assert.match(action.payload.body, /Dispatch workflow run ID: 901/);
  assert.match(action.payload.body, /Dispatch workflow run attempt: 2/);
});

test('renderDispatchReport includes link comment decision in actions table', () => {
  const summary = buildSummary();
  const plan = buildDispatchPlan({
    summary,
    config: { issue: {} },
    openIssues: []
  });
  const action = plan.actions.find((item) => item.decision === 'create');
  assert.ok(action);

  const report = renderDispatchReport({
    generatedAt: new Date('2026-03-23T12:00:00Z'),
    configPath: '.github/release-gates/v2-p1-escalation-dispatch.json',
    summaryPath: 'reports/v2-release-health-summary.json',
    repository: 'zfrog/test',
    mode: 'apply',
    summary,
    plan,
    results: {
      runtimeContext: {
        workflowRunUrl: 'https://example.test/actions/runs/999',
        workflowArtifactsUrl: 'https://example.test/actions/runs/999#artifacts'
      },
      linkCommentStats: {
        linked: 1,
        skipped: 0,
        failed: 0
      },
      actions: [
        {
          ...action,
          decision: 'created',
          issueNumber: 88,
          issueUrl: 'https://example.test/issues/88',
          linkCommentDecision: 'linked'
        }
      ]
    }
  });

  assert.match(report, /Link comment posted/);
  assert.match(report, /Link Comment/);
  assert.match(report, /\| linked \|/);
});

test('buildDispatchPlan blocks create when summary freshness gate fails', () => {
  const summary = buildSummary();
  const config = {
    issue: {
      titlePrefix: '[Freshness Gate]',
      defaultOwnerRoute: 'release-ops'
    },
    summaryFreshness: {
      passed: false,
      checks: [
        {
          id: 'dispatch-summary-recency',
          pass: false
        }
      ]
    }
  };

  const plan = buildDispatchPlan({ summary, config, openIssues: [] });
  assert.equal(plan.actions.length, 2);
  assert.equal(plan.actions.every((item) => item.decision === 'skip-summary-freshness'), true);
});

test('validateDispatchSchema passes for valid owner-route and issue-form mappings', () => {
  const config = {
    issue: {
      ownerRouteLabelPrefix: 'owner-route',
      defaultOwnerRoute: 'release-ops',
      reasonOwnerRoutes: {
        'workspace-startup-failed': 'workspace-platform'
      },
      ownerRoutePatterns: [
        {
          pattern: '^manual-',
          ownerRoute: 'release-triage'
        }
      ],
      failOnMissingOwnerRoute: true,
      issueForm: {
        requiredFieldIds: ['reason', 'owner_route', 'owner_route_source'],
        fieldMap: {
          reason: 'reason',
          owner_route: 'ownerRoute',
          owner_route_source: 'ownerRouteSource'
        }
      }
    }
  };

  const templates = {
    defaultTemplate:
      '{{reasonMarker}}\nReason={{reason}}\nOwner={{ownerRoute}}\nOwnerSource={{ownerRouteSource}}\nDelta={{deltaSigned}}'
  };

  const validation = validateDispatchSchema({ config, templates });
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
});

test('validateDispatchSchema fails on invalid owner-route regex and template coverage', () => {
  const config = {
    issue: {
      ownerRoutePatterns: [
        {
          pattern: '(invalid',
          ownerRoute: 'release-triage'
        }
      ],
      issueForm: {
        requiredFieldIds: ['reason', 'summary_verdict'],
        fieldMap: {
          reason: 'reason',
          summary_verdict: 'summaryVerdictMissing'
        }
      }
    }
  };

  const templates = {
    defaultTemplate: '{{reason}}'
  };

  const validation = validateDispatchSchema({ config, templates });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join('\n'), /invalid regex/i);
  assert.match(validation.errors.join('\n'), /not present in templates/i);
});

test('validateDispatchSchema fails on invalid summary freshness config', () => {
  const validation = validateDispatchSchema({
    config: {
      summary: {
        requireGeneratedAt: 'yes',
        maxAgeHours: 0,
        maxFutureSkewMinutes: -1
      }
    },
    templates: {
      defaultTemplate: '{{reason}}'
    }
  });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join('\n'), /summary\.requireGeneratedAt/);
  assert.match(validation.errors.join('\n'), /summary\.maxAgeHours/);
  assert.match(validation.errors.join('\n'), /summary\.maxFutureSkewMinutes/);
});

test('buildDispatchIdempotencyKey is stable for reason/titlePrefix pair', () => {
  const key = buildDispatchIdempotencyKey({
    titlePrefix: '[V2-W15-05][P1 Escalation]',
    reason: 'workspace-startup-failed'
  });
  assert.equal(key, '[V2-W15-05][P1 Escalation]::workspace-startup-failed');
});

test('runWithRetry retries retryable issue-create errors and succeeds', async () => {
  let invocations = 0;
  const delays = [];
  const policy = toRetryPolicy({
    maxAttempts: 4,
    baseDelayMs: 5,
    maxDelayMs: 20,
    retryOnStatuses: [429, 503]
  });

  const result = await runWithRetry({
    task: async () => {
      invocations += 1;
      if (invocations < 3) {
        const error = new Error('temporary');
        error.status = 503;
        throw error;
      }
      return { ok: true };
    },
    policy,
    shouldRetry: (error, _attempt, retryPolicy) => isRetryableIssueCreateError(error, retryPolicy.retryStatusSet),
    sleep: async (delayMs) => {
      delays.push(delayMs);
    }
  });

  assert.equal(result.attempts, 3);
  assert.deepEqual(delays, [5, 10]);
});

test('runWithRetry stops on non-retryable issue-create error', async () => {
  const policy = toRetryPolicy({
    maxAttempts: 3,
    retryOnStatuses: [503]
  });

  await assert.rejects(
    () =>
      runWithRetry({
        task: async () => {
          const error = new Error('bad request');
          error.status = 400;
          throw error;
        },
        policy,
        shouldRetry: (error, _attempt, retryPolicy) => isRetryableIssueCreateError(error, retryPolicy.retryStatusSet),
        sleep: async () => {}
      }),
    (error) => {
      assert.equal(error.attempts, 1);
      return true;
    }
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertV3DashboardDrillEvidenceGate,
  evaluateV3DashboardDrillEvidenceGate
} from './v3-dashboard-drill-evidence-gate-lib.mjs';
import { buildV3DashboardDrillArtifactDigest } from './v3-dashboard-drill-run-manifest-lib.mjs';

const PASS_SHA = '8b16ef5b67f52791e1f4f0f4f166b95f2a65a7d3';

const passDrillPayload = {
  generatedAt: '2026-03-24T00:00:00Z',
  runId: '778899',
  runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
  drill: {
    smokeResult: 'pass',
    conclusion: '可发布'
  }
};

const passDrillJsonRaw = `${JSON.stringify(passDrillPayload, null, 2)}\n`;

const passSnippet = `## V3-RC-02 执行记录回写片段（自动生成）

1. 已完成（\`2026-03-24\`）：在 \`ci\` 触发 \`v3-beta-regression-matrix\` run \`778899\`（https://github.com/example/zfrog/actions/runs/778899），\`V3Dashboard\` 双态 smoke=\`pass\`，演练结论=\`可发布\`。
2. 已归档：\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.md\`、\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.json\`。
3. 下一点：回写 backlog 执行记录中的 run URL 与 PASS 证据，正式关闭 \`V3-RC-02\`。
`;

const passReportMd = `# V3Dashboard 运营冻结/回滚演练记录

## 2. 入口门禁快照

- 证据链接：https://github.com/example/zfrog/actions/runs/778899
- workflow run id：778899

## 5. 验证与结论

- Playwright 双态 smoke 结果：pass
- 结论：可发布
`;

const passBacklogApplied = `# Example

### \`V3-RC-02\` Admin 双态 Smoke 实跑证据与首份演练归档

8. 执行记录（\`2026-03-24\`）：
   1. 已交付：脚本。
   2. 已完成（\`2026-03-24\`）：执行 \`v3-dashboard-drill-backlog-apply\` 自动回写，纳入 run \`778899\`（https://github.com/example/zfrog/actions/runs/778899）证据。
   3. 已归档：\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.md\`、\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.json\`。
   4. 结论更新：\`V3-RC-02\` 满足 PASS 证据闭环，可执行正式关闭流程。
9. 下一点执行清单（\`2026-03-24\`）：
   1. 下一点：回写 backlog 执行记录中的 run URL 与 PASS 证据，正式关闭 \`V3-RC-02\`。

### \`V3-RC-03\` Follow-up
`;

const blockedDrillPayload = {
  generatedAt: '2026-03-24T00:00:00Z',
  runId: '778899',
  runUrl: 'n/a',
  drill: {
    smokeResult: 'fail',
    conclusion: '暂缓发布'
  }
};

const blockedDrillJsonRaw = `${JSON.stringify(blockedDrillPayload, null, 2)}\n`;

const blockedSnippet = `## V3-RC-02 执行记录回写片段（自动生成）

1. 已完成（\`2026-03-24\`）：在 \`ci\` 触发 \`v3-beta-regression-matrix\` run \`778899\`（n/a），\`V3Dashboard\` 双态 smoke=\`fail\`，演练结论=\`暂缓发布\`。
2. 已归档：\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.md\`、\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.json\`。
3. 下一点：保持 \`暂缓发布\`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。
`;

const blockedReportMd = `# V3Dashboard 运营冻结/回滚演练记录

## 2. 入口门禁快照

- 证据链接：n/a
- workflow run id：778899

## 5. 验证与结论

- Playwright 双态 smoke 结果：fail
- 结论：暂缓发布
`;

const blockedBacklogApplied = `# Example

### \`V3-RC-02\` Admin 双态 Smoke 实跑证据与首份演练归档

8. 执行记录（\`2026-03-24\`）：
   1. 已交付：脚本。
   2. 已完成（\`2026-03-24\`）：执行 \`v3-dashboard-drill-backlog-apply\` 自动回写，纳入 run \`778899\`（n/a）证据。
   3. 已归档：\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.md\`、\`./reports/v3/v3-dashboard-freeze-rollback-drill-778899.json\`。
   4. 结论维持：\`暂缓发布\`，继续阻塞态回滚收口。
9. 下一点执行清单（\`2026-03-24\`）：
   1. 下一点：保持 \`暂缓发布\`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。

### \`V3-RC-03\` Follow-up
`;

const buildRunManifestWithDigests = ({
  runId,
  runUrl,
  serverUrl = 'https://github.com',
  generatedAt,
  drillReportMd,
  drillJsonRaw,
  backlogSnippet,
  backlogApplied
}) => ({
  runId,
  runUrl,
  serverUrl,
  workflowName: 'v3-beta-regression-matrix',
  workflowFile: '.github/workflows/v3-beta-regression-matrix.yml',
  eventName: 'workflow_dispatch',
  repository: 'example/zfrog',
  ref: 'refs/heads/main',
  sha: PASS_SHA,
  runAttempt: '1',
  generatedAt,
  artifactDigests: {
    drillReportMd: buildV3DashboardDrillArtifactDigest({
      path: `./reports/v3/v3-dashboard-freeze-rollback-drill-${runId}.md`,
      content: drillReportMd
    }),
    drillJson: buildV3DashboardDrillArtifactDigest({
      path: `./reports/v3/v3-dashboard-freeze-rollback-drill-${runId}.json`,
      content: drillJsonRaw
    }),
    backlogSnippetMd: buildV3DashboardDrillArtifactDigest({
      path: `./reports/v3/v3-dashboard-freeze-rollback-drill-${runId}-backlog.md`,
      content: backlogSnippet
    }),
    backlogAppliedMd: buildV3DashboardDrillArtifactDigest({
      path: `./reports/v3/v3-dashboard-freeze-rollback-drill-${runId}-backlog-applied.md`,
      content: backlogApplied
    })
  }
});

const passRunManifest = buildRunManifestWithDigests({
  runId: '778899',
  runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
  generatedAt: '2026-03-24T00:05:00Z',
  drillReportMd: passReportMd,
  drillJsonRaw: passDrillJsonRaw,
  backlogSnippet: passSnippet,
  backlogApplied: passBacklogApplied
});

const blockedRunManifest = buildRunManifestWithDigests({
  runId: '778899',
  runUrl: 'n/a',
  generatedAt: '2026-03-24T00:05:00Z',
  drillReportMd: blockedReportMd,
  drillJsonRaw: blockedDrillJsonRaw,
  backlogSnippet: blockedSnippet,
  backlogApplied: blockedBacklogApplied
});

test('evaluateV3DashboardDrillEvidenceGate passes for publishable evidence triad', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRunAttempt: '1',
    expectedRef: 'refs/heads/main',
    expectedSha: PASS_SHA
  });

  assert.equal(result.passed, true);
  assert.equal(result.publishable, true);
  assert.equal(result.readyToClose, true);
  assert.equal(result.manifestRunAttempt, '1');
  assert.equal(result.expectedRunAttempt, '1');
  assert.equal(result.manifestRef, 'refs/heads/main');
  assert.equal(result.expectedRef, 'refs/heads/main');
  assert.equal(result.manifestSha, PASS_SHA);
  assert.equal(result.expectedSha, PASS_SHA);

  assert.doesNotThrow(() =>
    assertV3DashboardDrillEvidenceGate({
      result,
      requirePublishable: true
    })
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable run misses expected identity inputs', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z')
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find((check) => check.name === 'publishable expected server url is provided')?.pass,
    false
  );
  assert.equal(
    result.checks.find((check) => check.name === 'publishable expected repository is provided')?.pass,
    false
  );
  assert.equal(
    result.checks.find((check) => check.name === 'publishable expected run attempt is provided')?.pass,
    false
  );
  assert.equal(
    result.checks.find((check) => check.name === 'publishable expected ref is provided')?.pass,
    false
  );
  assert.equal(
    result.checks.find((check) => check.name === 'publishable expected sha is provided')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate rejects expected server url with path segment', () => {
  assert.throws(
    () =>
      evaluateV3DashboardDrillEvidenceGate({
        runId: '778899',
        taskId: 'V3-RC-02',
        reportsDir: './reports/v3',
        drillPayload: passDrillPayload,
        drillPayloadRaw: passDrillJsonRaw,
        drillReportMd: passReportMd,
        backlogSnippet: passSnippet,
        backlogAppliedDoc: passBacklogApplied,
        runManifest: passRunManifest,
        now: new Date('2026-03-24T00:10:00Z'),
        expectedServerUrl: 'https://github.com/enterprise',
        expectedRepository: 'example/zfrog',
        expectedRunAttempt: '1',
        expectedRef: 'refs/heads/main',
        expectedSha: PASS_SHA
      }),
    /expectedServerUrl must not include path/
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when manifest runAttempt mismatches expected run attempt', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRunAttempt: '2'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find((check) => check.name === 'manifest runAttempt matches expected run attempt')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable expected sha is not canonical', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRunAttempt: '1',
    expectedRef: 'refs/heads/main',
    expectedSha: 'abc123'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find(
      (check) => check.name === 'publishable expected sha is canonical 40-char git commit'
    )?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable expected ref is not canonical', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRunAttempt: '1',
    expectedRef: 'main',
    expectedSha: PASS_SHA
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find(
      (check) => check.name === 'publishable expected ref is canonical full git ref'
    )?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable manifest ref is not canonical', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: {
      ...passRunManifest,
      ref: 'main'
    },
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRunAttempt: '1',
    expectedRef: 'refs/heads/main',
    expectedSha: PASS_SHA
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find(
      (check) => check.name === 'publishable manifest ref is canonical full git ref'
    )?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when manifest ref mismatches expected ref', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRef: 'refs/heads/release'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find((check) => check.name === 'manifest ref matches expected ref')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when manifest sha mismatches expected sha', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedSha: '0f9d18f4a7de1f6b80e1ad4f6d73ebf3b53c76f1'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find((check) => check.name === 'manifest sha matches expected sha')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable manifest sha is not canonical', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: {
      ...passRunManifest,
      sha: 'abc123'
    },
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog',
    expectedRunAttempt: '1',
    expectedRef: 'refs/heads/main',
    expectedSha: PASS_SHA
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find(
      (check) => check.name === 'publishable manifest sha is canonical 40-char git commit'
    )?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails on snippet runUrl mismatch', () => {
  const mismatchSnippet = passSnippet.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    'https://github.com/example/zfrog/actions/runs/778900'
  );

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: mismatchSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.match(
    result.checks.find((check) => check.name === 'snippet runUrl equals drill runUrl')?.actual || '',
    /778900/
  );

  assert.throws(
    () =>
      assertV3DashboardDrillEvidenceGate({
        result
      }),
    /evidence gate failed checks/
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails on drill report mismatch', () => {
  const mismatchReport = passReportMd.replace('Playwright 双态 smoke 结果：pass', 'Playwright 双态 smoke 结果：fail');

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: mismatchReport,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.match(
    result.checks.find((check) => check.name === 'report smokeResult equals drill smokeResult')?.actual || '',
    /fail/
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable runUrl is not canonical actions link', () => {
  const invalidRunUrl = 'https://github.com/example/zfrog/runs/778899';
  const canonicalRunUrl = 'https://github.com/example/zfrog/actions/runs/778899';

  const payload = {
    ...passDrillPayload,
    runUrl: invalidRunUrl
  };
  const drillJsonRaw = `${JSON.stringify(payload, null, 2)}\n`;
  const snippet = passSnippet.split(canonicalRunUrl).join(invalidRunUrl);
  const reportMd = passReportMd.split(canonicalRunUrl).join(invalidRunUrl);
  const backlogApplied = passBacklogApplied.split(canonicalRunUrl).join(invalidRunUrl);
  const runManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl: invalidRunUrl,
    generatedAt: '2026-03-24T00:05:00Z',
    drillReportMd: reportMd,
    drillJsonRaw,
    backlogSnippet: snippet,
    backlogApplied
  });

  assert.throws(
    () =>
      evaluateV3DashboardDrillEvidenceGate({
        runId: '778899',
        taskId: 'V3-RC-02',
        reportsDir: './reports/v3',
        drillPayload: payload,
        drillPayloadRaw: drillJsonRaw,
        drillReportMd: reportMd,
    backlogSnippet: snippet,
    backlogAppliedDoc: backlogApplied,
    runManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
      }),
    /canonical workflow run URL bound to runId/
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable manifest repository is unknown', () => {
  const unknownRepositoryManifest = {
    ...passRunManifest,
    repository: 'unknown'
  };

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: unknownRepositoryManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find((check) => check.name === 'publishable manifest repository is known')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable repository mismatches expected repository', () => {
  const runUrl = 'https://github.com/example/forked-zfrog/actions/runs/778899';
  const payload = {
    ...passDrillPayload,
    runUrl
  };
  const drillJsonRaw = `${JSON.stringify(payload, null, 2)}\n`;
  const snippet = passSnippet.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    runUrl
  );
  const reportMd = passReportMd.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    runUrl
  );
  const backlogApplied = passBacklogApplied.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    runUrl
  );
  const runManifest = {
    ...buildRunManifestWithDigests({
      runId: '778899',
      runUrl,
      generatedAt: '2026-03-24T00:05:00Z',
      drillReportMd: reportMd,
      drillJsonRaw,
      backlogSnippet: snippet,
      backlogApplied
    }),
    repository: 'example/forked-zfrog'
  };

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: payload,
    drillPayloadRaw: drillJsonRaw,
    drillReportMd: reportMd,
    backlogSnippet: snippet,
    backlogAppliedDoc: backlogApplied,
    runManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com',
    expectedRepository: 'example/zfrog'
  });

  assert.equal(result.passed, false);
  assert.equal(result.readyToClose, false);
  assert.equal(
    result.checks.find(
      (check) => check.name === 'publishable manifest repository matches expected repository'
    )?.pass,
    false
  );
  assert.equal(
    result.checks.find(
      (check) => check.name === 'publishable runUrl repository matches expected repository'
    )?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable manifest server host is unknown', () => {
  const unknownServerManifest = {
    ...passRunManifest,
    serverUrl: 'unknown',
    serverHost: 'unknown'
  };

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: unknownServerManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, false);
  assert.equal(
    result.checks.find((check) => check.name === 'publishable manifest server host is known')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when publishable runUrl host mismatches expected server host', () => {
  const runUrl = 'https://ghe.example.com/example/zfrog/actions/runs/778899';
  const payload = {
    ...passDrillPayload,
    runUrl
  };
  const drillJsonRaw = `${JSON.stringify(payload, null, 2)}\n`;
  const snippet = passSnippet.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    runUrl
  );
  const reportMd = passReportMd.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    runUrl
  );
  const backlogApplied = passBacklogApplied.replace(
    'https://github.com/example/zfrog/actions/runs/778899',
    runUrl
  );
  const runManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl,
    serverUrl: 'https://ghe.example.com',
    generatedAt: '2026-03-24T00:05:00Z',
    drillReportMd: reportMd,
    drillJsonRaw,
    backlogSnippet: snippet,
    backlogApplied
  });

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: payload,
    drillPayloadRaw: drillJsonRaw,
    drillReportMd: reportMd,
    backlogSnippet: snippet,
    backlogAppliedDoc: backlogApplied,
    runManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, false);
  assert.equal(
    result.checks.find(
      (check) =>
        check.name === 'publishable runUrl host matches expected server host'
    )?.pass,
    false
  );
});

test('assertV3DashboardDrillEvidenceGate blocks closure when publishable is required', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: blockedDrillPayload,
    drillPayloadRaw: blockedDrillJsonRaw,
    drillReportMd: blockedReportMd,
    backlogSnippet: blockedSnippet,
    backlogAppliedDoc: blockedBacklogApplied,
    runManifest: blockedRunManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, true);
  assert.equal(result.publishable, false);
  assert.equal(result.readyToClose, false);

  assert.throws(
    () =>
      assertV3DashboardDrillEvidenceGate({
        result,
        requirePublishable: true
      }),
    /not publishable/
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when manifest is stale', () => {
  const staleManifest = {
    ...passRunManifest,
    generatedAt: '2026-03-20T00:00:00Z'
  };

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: staleManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    maxManifestAgeHours: 24,
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, false);
  assert.match(
    result.checks.find((check) => check.name === 'manifest generatedAt is within freshness window')?.actual || '',
    /96\./
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when manifest digest is tampered', () => {
  const tamperedManifest = {
    ...passRunManifest,
    artifactDigests: {
      ...passRunManifest.artifactDigests,
      drillJson: {
        ...passRunManifest.artifactDigests.drillJson,
        sha256: '0'.repeat(64)
      }
    }
  };

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: tamperedManifest,
    now: new Date('2026-03-24T00:10:00Z'),
    expectedServerUrl: 'https://github.com'
  });

  assert.equal(result.passed, false);
  assert.equal(
    result.checks.find((check) => check.name === 'manifest drillJson sha256 matches artifact content')?.pass,
    false
  );
});

test('evaluateV3DashboardDrillEvidenceGate fails when artifact paths are outside expected run scope', () => {
  const result = evaluateV3DashboardDrillEvidenceGate({
    runId: '778899',
    taskId: 'V3-RC-02',
    reportsDir: './reports/v3',
    drillPayload: passDrillPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passBacklogApplied,
    runManifest: passRunManifest,
    artifactPaths: {
      reportMdPath: './reports/v3/v3-dashboard-freeze-rollback-drill-778899.md',
      drillJsonPath: './reports/v3/v3-dashboard-freeze-rollback-drill-778899.json',
      snippetMdPath: '../tmp/778899-backlog.md',
      backlogAppliedPath: './reports/v3/v3-dashboard-freeze-rollback-drill-778899-backlog-applied.md'
    },
    now: new Date('2026-03-24T00:10:00Z')
  });

  assert.equal(result.passed, false);
  assert.equal(
    result.checks.find((check) => check.name === 'artifact backlog snippet path matches expected run path')
      ?.pass,
    false
  );
});

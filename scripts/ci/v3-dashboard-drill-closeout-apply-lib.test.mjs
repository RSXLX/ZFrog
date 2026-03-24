import assert from 'node:assert/strict';
import test from 'node:test';
import { applyV3DashboardBacklogSnippetToDoc } from './v3-dashboard-drill-backlog-apply-lib.mjs';
import { applyV3DashboardDrillCloseoutPreview } from './v3-dashboard-drill-closeout-apply-lib.mjs';
import { finalizeV3DashboardDrillCloseout } from './v3-dashboard-drill-closeout-lib.mjs';
import { buildV3DashboardDrillArtifactDigest } from './v3-dashboard-drill-run-manifest-lib.mjs';

const PASS_SHA = '8b16ef5b67f52791e1f4f0f4f166b95f2a65a7d3';

const baseBacklogDoc = `# Example

### \`V3-RC-02\` Admin 双态 Smoke 实跑证据与首份演练归档

8. 执行记录（\`2026-03-24\`）：
   1. 已交付：新增脚本 A。
   2. 已交付：新增脚本 B。
9. 下一点执行清单（\`2026-03-24\`）：
   1. 已完成（\`2026-03-24\`）：已交付回写片段。
   2. 下一点：在 CI/staging 获取 run URL。

### \`V3-RC-03\` Follow-up
`;

const passSnippet = `## V3-RC-02 执行记录回写片段（自动生成）

1. 已完成（\`2026-03-24\`）：在 \`ci\` 触发 \`v3-beta-regression-matrix\` run \`778899\`（https://github.com/example/zfrog/actions/runs/778899），\`V3Dashboard\` 双态 smoke=\`pass\`，演练结论=\`可发布\`。
2. 已归档：\`reports/v3/v3-dashboard-freeze-rollback-drill-778899.md\`、\`reports/v3/v3-dashboard-freeze-rollback-drill-778899.json\`。
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

const blockedSnippet = `## V3-RC-02 执行记录回写片段（自动生成）

1. 已完成（\`2026-03-24\`）：在 \`sandbox\` 触发 \`v3-beta-regression-matrix\` run \`local\`（n/a），\`V3Dashboard\` 双态 smoke=\`fail\`，演练结论=\`暂缓发布\`。
2. 已归档：\`reports/v3/v3-dashboard-freeze-rollback-drill-local.md\`、\`reports/v3/v3-dashboard-freeze-rollback-drill-local.json\`。
3. 下一点：保持 \`暂缓发布\`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。
`;

const blockedReportMd = `# V3Dashboard 运营冻结/回滚演练记录

## 2. 入口门禁快照

- 证据链接：n/a
- workflow run id：local

## 5. 验证与结论

- Playwright 双态 smoke 结果：fail
- 结论：暂缓发布
`;

const passPayload = {
  generatedAt: '2026-03-24T00:11:00Z',
  runId: '778899',
  runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
  drill: {
    smokeResult: 'pass',
    conclusion: '可发布'
  }
};

const blockedPayload = {
  generatedAt: '2026-03-24T00:12:00Z',
  runId: 'local',
  runUrl: 'n/a',
  drill: {
    smokeResult: 'fail',
    conclusion: '暂缓发布'
  }
};

const buildRunManifestWithDigests = ({
  runId,
  runUrl,
  generatedAt,
  drillReportMd,
  drillJsonRaw,
  backlogSnippet,
  backlogApplied,
  serverUrl = 'https://github.com'
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
      path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}.md`,
      content: drillReportMd
    }),
    drillJson: buildV3DashboardDrillArtifactDigest({
      path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}.json`,
      content: drillJsonRaw
    }),
    backlogSnippetMd: buildV3DashboardDrillArtifactDigest({
      path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}-backlog.md`,
      content: backlogSnippet
    }),
    backlogAppliedMd: buildV3DashboardDrillArtifactDigest({
      path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}-backlog-applied.md`,
      content: backlogApplied
    })
  }
});

const publishableExpectedIdentity = {
  expectedServerUrl: 'https://github.com',
  expectedRepository: 'example/zfrog',
  expectedRunAttempt: '1',
  expectedRef: 'refs/heads/main',
  expectedSha: PASS_SHA
};

test('applyV3DashboardDrillCloseoutPreview applies publishable preview after deterministic re-check', () => {
  const passApplied = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: passSnippet,
    expectedRunId: '778899'
  });
  const passDrillJsonRaw = `${JSON.stringify(passPayload, null, 2)}\n`;
  const passRunManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
    generatedAt: '2026-03-24T00:11:30Z',
    drillReportMd: passReportMd,
    drillJsonRaw: passDrillJsonRaw,
    backlogSnippet: passSnippet,
    backlogApplied: passApplied.updatedContent
  });

  const preview = finalizeV3DashboardDrillCloseout({
    runId: '778899',
    reportsDir: 'reports/v3',
    drillPayload: passPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passApplied.updatedContent,
    runManifest: passRunManifest,
    backlogDoc: baseBacklogDoc,
    requirePublishable: true,
    now: new Date('2026-03-24T00:13:00Z'),
    ...publishableExpectedIdentity
  });

  const applied = applyV3DashboardDrillCloseoutPreview({
    runId: '778899',
    reportsDir: 'reports/v3',
    drillPayload: passPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passApplied.updatedContent,
    runManifest: passRunManifest,
    backlogDoc: baseBacklogDoc,
    closeoutPreviewDoc: preview.updatedContent,
    requirePublishable: true,
    now: new Date('2026-03-24T00:13:00Z'),
    ...publishableExpectedIdentity
  });

  assert.equal(applied.evidenceResult.readyToClose, true);
  assert.equal(applied.meta.publishable, true);
  assert.equal(applied.appliedContent, preview.updatedContent);
});

test('applyV3DashboardDrillCloseoutPreview fails when preview content is tampered', () => {
  const passApplied = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: passSnippet,
    expectedRunId: '778899'
  });
  const passDrillJsonRaw = `${JSON.stringify(passPayload, null, 2)}\n`;
  const passRunManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
    generatedAt: '2026-03-24T00:11:30Z',
    drillReportMd: passReportMd,
    drillJsonRaw: passDrillJsonRaw,
    backlogSnippet: passSnippet,
    backlogApplied: passApplied.updatedContent
  });

  const preview = finalizeV3DashboardDrillCloseout({
    runId: '778899',
    reportsDir: 'reports/v3',
    drillPayload: passPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passApplied.updatedContent,
    runManifest: passRunManifest,
    backlogDoc: baseBacklogDoc,
    requirePublishable: true,
    now: new Date('2026-03-24T00:13:00Z'),
    ...publishableExpectedIdentity
  });

  const tamperedPreview = preview.updatedContent.replace(
    '可执行正式关闭流程。',
    '可执行正式关闭流程（tampered）。'
  );

  assert.throws(
    () =>
      applyV3DashboardDrillCloseoutPreview({
        runId: '778899',
        reportsDir: 'reports/v3',
        drillPayload: passPayload,
        drillPayloadRaw: passDrillJsonRaw,
        drillReportMd: passReportMd,
        backlogSnippet: passSnippet,
        backlogAppliedDoc: passApplied.updatedContent,
        runManifest: passRunManifest,
        backlogDoc: baseBacklogDoc,
        closeoutPreviewDoc: tamperedPreview,
        requirePublishable: true,
        now: new Date('2026-03-24T00:13:00Z'),
        ...publishableExpectedIdentity
      }),
    /does not match deterministic closeout output/
  );
});

test('applyV3DashboardDrillCloseoutPreview enforces strict publishable requirement', () => {
  const blockedApplied = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: blockedSnippet,
    expectedRunId: 'local'
  });
  const blockedDrillJsonRaw = `${JSON.stringify(blockedPayload, null, 2)}\n`;
  const blockedRunManifest = buildRunManifestWithDigests({
    runId: 'local',
    runUrl: 'n/a',
    generatedAt: '2026-03-24T00:12:30Z',
    drillReportMd: blockedReportMd,
    drillJsonRaw: blockedDrillJsonRaw,
    backlogSnippet: blockedSnippet,
    backlogApplied: blockedApplied.updatedContent
  });

  const blockedPreview = finalizeV3DashboardDrillCloseout({
    runId: 'local',
    reportsDir: 'reports/v3',
    drillPayload: blockedPayload,
    drillPayloadRaw: blockedDrillJsonRaw,
    drillReportMd: blockedReportMd,
    backlogSnippet: blockedSnippet,
    backlogAppliedDoc: blockedApplied.updatedContent,
    runManifest: blockedRunManifest,
    backlogDoc: baseBacklogDoc,
    requirePublishable: false,
    now: new Date('2026-03-24T00:13:00Z')
  });

  assert.throws(
    () =>
      applyV3DashboardDrillCloseoutPreview({
        runId: 'local',
        reportsDir: 'reports/v3',
        drillPayload: blockedPayload,
        drillPayloadRaw: blockedDrillJsonRaw,
        drillReportMd: blockedReportMd,
        backlogSnippet: blockedSnippet,
        backlogAppliedDoc: blockedApplied.updatedContent,
        runManifest: blockedRunManifest,
        backlogDoc: baseBacklogDoc,
        closeoutPreviewDoc: blockedPreview.updatedContent,
        requirePublishable: true,
        now: new Date('2026-03-24T00:13:00Z')
      }),
    /not publishable/
  );
});

test('applyV3DashboardDrillCloseoutPreview blocks apply when runAttempt mismatches expected run attempt', () => {
  const passApplied = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: passSnippet,
    expectedRunId: '778899'
  });
  const passDrillJsonRaw = `${JSON.stringify(passPayload, null, 2)}\n`;
  const passRunManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
    generatedAt: '2026-03-24T00:11:30Z',
    drillReportMd: passReportMd,
    drillJsonRaw: passDrillJsonRaw,
    backlogSnippet: passSnippet,
    backlogApplied: passApplied.updatedContent
  });

  const preview = finalizeV3DashboardDrillCloseout({
    runId: '778899',
    reportsDir: 'reports/v3',
    drillPayload: passPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passApplied.updatedContent,
    runManifest: passRunManifest,
    backlogDoc: baseBacklogDoc,
    requirePublishable: true,
    now: new Date('2026-03-24T00:13:00Z'),
    ...publishableExpectedIdentity
  });

  assert.throws(
    () =>
      applyV3DashboardDrillCloseoutPreview({
        runId: '778899',
        reportsDir: 'reports/v3',
        drillPayload: passPayload,
        drillPayloadRaw: passDrillJsonRaw,
        drillReportMd: passReportMd,
        backlogSnippet: passSnippet,
        backlogAppliedDoc: passApplied.updatedContent,
        runManifest: passRunManifest,
        backlogDoc: baseBacklogDoc,
        closeoutPreviewDoc: preview.updatedContent,
        requirePublishable: true,
        now: new Date('2026-03-24T00:13:00Z'),
        expectedServerUrl: 'https://github.com',
        expectedRepository: 'example/zfrog',
        expectedRunAttempt: '2',
        expectedRef: 'refs/heads/main',
        expectedSha: PASS_SHA
      }),
    /runAttempt matches expected run attempt/
  );
});

test('applyV3DashboardDrillCloseoutPreview blocks apply when expected ref is not canonical', () => {
  const passApplied = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: passSnippet,
    expectedRunId: '778899'
  });
  const passDrillJsonRaw = `${JSON.stringify(passPayload, null, 2)}\n`;
  const passRunManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
    generatedAt: '2026-03-24T00:11:30Z',
    drillReportMd: passReportMd,
    drillJsonRaw: passDrillJsonRaw,
    backlogSnippet: passSnippet,
    backlogApplied: passApplied.updatedContent
  });

  const preview = finalizeV3DashboardDrillCloseout({
    runId: '778899',
    reportsDir: 'reports/v3',
    drillPayload: passPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passApplied.updatedContent,
    runManifest: passRunManifest,
    backlogDoc: baseBacklogDoc,
    requirePublishable: true,
    now: new Date('2026-03-24T00:13:00Z'),
    ...publishableExpectedIdentity
  });

  assert.throws(
    () =>
      applyV3DashboardDrillCloseoutPreview({
        runId: '778899',
        reportsDir: 'reports/v3',
        drillPayload: passPayload,
        drillPayloadRaw: passDrillJsonRaw,
        drillReportMd: passReportMd,
        backlogSnippet: passSnippet,
        backlogAppliedDoc: passApplied.updatedContent,
        runManifest: passRunManifest,
        backlogDoc: baseBacklogDoc,
        closeoutPreviewDoc: preview.updatedContent,
        requirePublishable: true,
        now: new Date('2026-03-24T00:13:00Z'),
        expectedServerUrl: 'https://github.com',
        expectedRepository: 'example/zfrog',
        expectedRunAttempt: '1',
        expectedRef: 'main',
        expectedSha: PASS_SHA
      }),
    /expected ref is canonical full git ref/
  );
});

test('applyV3DashboardDrillCloseoutPreview blocks apply when sha mismatches expected sha', () => {
  const passApplied = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: passSnippet,
    expectedRunId: '778899'
  });
  const passDrillJsonRaw = `${JSON.stringify(passPayload, null, 2)}\n`;
  const passRunManifest = buildRunManifestWithDigests({
    runId: '778899',
    runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
    generatedAt: '2026-03-24T00:11:30Z',
    drillReportMd: passReportMd,
    drillJsonRaw: passDrillJsonRaw,
    backlogSnippet: passSnippet,
    backlogApplied: passApplied.updatedContent
  });

  const preview = finalizeV3DashboardDrillCloseout({
    runId: '778899',
    reportsDir: 'reports/v3',
    drillPayload: passPayload,
    drillPayloadRaw: passDrillJsonRaw,
    drillReportMd: passReportMd,
    backlogSnippet: passSnippet,
    backlogAppliedDoc: passApplied.updatedContent,
    runManifest: passRunManifest,
    backlogDoc: baseBacklogDoc,
    requirePublishable: true,
    now: new Date('2026-03-24T00:13:00Z'),
    ...publishableExpectedIdentity
  });

  assert.throws(
    () =>
      applyV3DashboardDrillCloseoutPreview({
        runId: '778899',
        reportsDir: 'reports/v3',
        drillPayload: passPayload,
        drillPayloadRaw: passDrillJsonRaw,
        drillReportMd: passReportMd,
        backlogSnippet: passSnippet,
        backlogAppliedDoc: passApplied.updatedContent,
        runManifest: passRunManifest,
        backlogDoc: baseBacklogDoc,
        closeoutPreviewDoc: preview.updatedContent,
        requirePublishable: true,
        now: new Date('2026-03-24T00:13:00Z'),
        expectedServerUrl: 'https://github.com',
        expectedRepository: 'example/zfrog',
        expectedRunAttempt: '1',
        expectedRef: 'refs/heads/main',
        expectedSha: '0f9d18f4a7de1f6b80e1ad4f6d73ebf3b53c76f1'
      }),
    /sha matches expected sha/
  );
});

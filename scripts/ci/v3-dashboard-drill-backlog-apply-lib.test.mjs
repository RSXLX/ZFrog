import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyV3DashboardBacklogSnippetToDoc,
  parseV3DashboardBacklogSnippet
} from './v3-dashboard-drill-backlog-apply-lib.mjs';

const passSnippet = `## V3-RC-02 执行记录回写片段（自动生成）

1. 已完成（\`2026-03-24\`）：在 \`ci\` 触发 \`v3-beta-regression-matrix\` run \`778899\`（https://github.com/example/zfrog/actions/runs/778899），\`V3Dashboard\` 双态 smoke=\`pass\`，演练结论=\`可发布\`。
2. 已归档：\`reports/v3/v3-dashboard-freeze-rollback-drill-778899.md\`、\`reports/v3/v3-dashboard-freeze-rollback-drill-778899.json\`。
3. 下一点：回写 backlog 执行记录中的 run URL 与 PASS 证据，正式关闭 \`V3-RC-02\`。
`;

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

test('parseV3DashboardBacklogSnippet parses publishable snippet', () => {
  const parsed = parseV3DashboardBacklogSnippet({
    snippet: passSnippet,
    expectedRunId: '778899'
  });

  assert.equal(parsed.publishable, true);
  assert.equal(parsed.generatedDate, '2026-03-24');
  assert.equal(parsed.runId, '778899');
  assert.equal(parsed.conclusion, '可发布');
});

test('applyV3DashboardBacklogSnippetToDoc appends execution and next-action entries', () => {
  const result = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc: baseBacklogDoc,
    snippet: passSnippet,
    expectedRunId: '778899'
  });

  assert.match(result.updatedContent, /3\. 已完成（`2026-03-24`）：执行 `v3-dashboard-drill-backlog-apply` 自动回写/);
  assert.match(result.updatedContent, /4\. 已归档：`reports\/v3\/v3-dashboard-freeze-rollback-drill-778899\.md`、`reports\/v3\/v3-dashboard-freeze-rollback-drill-778899\.json`。/);
  assert.match(result.updatedContent, /5\. 结论更新：`V3-RC-02` 满足 PASS 证据闭环，可执行正式关闭流程。/);
  assert.match(result.updatedContent, /3\. 下一点：回写 backlog 执行记录中的 run URL 与 PASS 证据，正式关闭 `V3-RC-02`。/);
});

test('applyV3DashboardBacklogSnippetToDoc rejects duplicate archive evidence', () => {
  const duplicateDoc = baseBacklogDoc.replace(
    '   2. 已交付：新增脚本 B。',
    '   2. 已交付：新增脚本 B。\\n   3. 已归档：`reports/v3/v3-dashboard-freeze-rollback-drill-778899.md`。'
  );

  assert.throws(
    () =>
      applyV3DashboardBacklogSnippetToDoc({
        backlogDoc: duplicateDoc,
        snippet: passSnippet
      }),
    /already contains this drill archive evidence/
  );
});

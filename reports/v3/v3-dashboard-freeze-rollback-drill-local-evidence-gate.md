# V3Dashboard RC-02 证据对账报告

- 生成时间（UTC）：2026-03-24T01:50:50.705Z
- 任务卡：`V3-RC-02`
- run id：`local`
- 目标目录：`reports/v3`
- workflow 期望：`v3-beta-regression-matrix`
- workflow 文件期望：`.github/workflows/v3-beta-regression-matrix.yml`
- manifest 生成时间（UTC）：2026-03-24T01:50:46.006Z
- manifest 新鲜度（小时）：0.00 / <=72
- manifest 摘要条目数：4
- 对账 verdict：**PASS**
- 发布证据状态：暂缓发布
- 可关闭状态（readyToClose）：no
- require-publishable：false

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| manifest runId equals drill runId | local | local | PASS |
| manifest runUrl equals drill runUrl | n/a | n/a | PASS |
| manifest workflow name matches expected | v3-beta-regression-matrix | v3-beta-regression-matrix | PASS |
| manifest workflow file matches expected | .github/workflows/v3-beta-regression-matrix.yml | .github/workflows/v3-beta-regression-matrix.yml | PASS |
| manifest generatedAt is within freshness window | <=72h and future skew <=5m | 0.00h | PASS |
| manifest includes drillReportMd digest | present | present | PASS |
| manifest drillReportMd path matches artifact path | reports/v3/v3-dashboard-freeze-rollback-drill-local.md | ./reports/v3/v3-dashboard-freeze-rollback-drill-local.md | PASS |
| manifest drillReportMd sha256 matches artifact content | 3007bbba371a5971b7477ce08e2a3b00d3fcb7b88a3b5d53666088d6a0f89eea | 3007bbba371a5971b7477ce08e2a3b00d3fcb7b88a3b5d53666088d6a0f89eea | PASS |
| manifest drillReportMd bytes matches artifact content | 1697 | 1697 | PASS |
| manifest includes drillJson digest | present | present | PASS |
| manifest drillJson path matches artifact path | reports/v3/v3-dashboard-freeze-rollback-drill-local.json | ./reports/v3/v3-dashboard-freeze-rollback-drill-local.json | PASS |
| manifest drillJson sha256 matches artifact content | 051816d219bd8e086ce761f91ba8b1198ce6ea02c890153732f76b1f3d7c5b9b | 051816d219bd8e086ce761f91ba8b1198ce6ea02c890153732f76b1f3d7c5b9b | PASS |
| manifest drillJson bytes matches artifact content | 806 | 806 | PASS |
| manifest includes backlogSnippetMd digest | present | present | PASS |
| manifest backlogSnippetMd path matches artifact path | reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md | ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md | PASS |
| manifest backlogSnippetMd sha256 matches artifact content | 372eaaf56a11455a98f8c185e337b7f84a59d21c4cee0c105d95e2df5d97440a | 372eaaf56a11455a98f8c185e337b7f84a59d21c4cee0c105d95e2df5d97440a | PASS |
| manifest backlogSnippetMd bytes matches artifact content | 486 | 486 | PASS |
| manifest includes backlogAppliedMd digest | present | present | PASS |
| manifest backlogAppliedMd path matches artifact path | reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-applied.md | ./reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-applied.md | PASS |
| manifest backlogAppliedMd sha256 matches artifact content | d57e2fee7c76c87ed9be41f377e33674d9fb0263e899727c5c7ed0514c762d38 | d57e2fee7c76c87ed9be41f377e33674d9fb0263e899727c5c7ed0514c762d38 | PASS |
| manifest backlogAppliedMd bytes matches artifact content | 65098 | 65098 | PASS |
| report runId equals drill runId | local | local | PASS |
| report runUrl equals drill runUrl | n/a | n/a | PASS |
| report smokeResult equals drill smokeResult | fail | fail | PASS |
| report conclusion equals drill conclusion | 暂缓发布 | 暂缓发布 | PASS |
| snippet runId equals drill runId | local | local | PASS |
| snippet runUrl equals drill runUrl | n/a | n/a | PASS |
| snippet smokeResult equals drill smokeResult | fail | fail | PASS |
| snippet conclusion equals drill conclusion | 暂缓发布 | 暂缓发布 | PASS |
| artifact report markdown path matches expected run path | reports/v3/v3-dashboard-freeze-rollback-drill-local.md | reports/v3/v3-dashboard-freeze-rollback-drill-local.md | PASS |
| artifact drill json path matches expected run path | reports/v3/v3-dashboard-freeze-rollback-drill-local.json | reports/v3/v3-dashboard-freeze-rollback-drill-local.json | PASS |
| artifact backlog snippet path matches expected run path | reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md | reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog.md | PASS |
| artifact backlog applied path matches expected run path | reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-applied.md | reports/v3/v3-dashboard-freeze-rollback-drill-local-backlog-applied.md | PASS |
| snippet report path targets current run artifact | reports/v3/v3-dashboard-freeze-rollback-drill-local.md | ./reports/v3/v3-dashboard-freeze-rollback-drill-local.md | PASS |
| snippet drill json path targets current run artifact | reports/v3/v3-dashboard-freeze-rollback-drill-local.json | ./reports/v3/v3-dashboard-freeze-rollback-drill-local.json | PASS |
| backlog applied preview includes run evidence | run `local`（n/a） | run `local`（n/a） | PASS |
| backlog applied preview includes archive evidence | `./reports/v3/v3-dashboard-freeze-rollback-drill-local.md`、`./reports/v3/v3-dashboard-freeze-rollback-drill-local.json` | `./reports/v3/v3-dashboard-freeze-rollback-drill-local.md`、`./reports/v3/v3-dashboard-freeze-rollback-drill-local.json` | PASS |
| backlog applied preview includes expected conclusion line | 结论维持：`暂缓发布`，继续阻塞态回滚收口。 | 结论维持：`暂缓发布`，继续阻塞态回滚收口。 | PASS |
| backlog applied preview includes expected next action | 下一点：保持 `暂缓发布`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。 | 下一点：保持 `暂缓发布`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。 | PASS |

import { isPlaceholderRunUrl } from './v3-dashboard-drill-report-lib.mjs';

const SECTION_EXECUTION_TITLE = '8. 执行记录';
const SECTION_NEXT_ACTIONS_TITLE = '9. 下一点执行清单';

const toTrimmedString = (value) => String(value ?? '').trim();

const splitLines = (content) => String(content ?? '').split(/\r?\n/);

const findHeadingLine = (lines, predicate, startIndex = 0) => {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (predicate(lines[index], index)) {
      return index;
    }
  }
  return -1;
};

const parseNumberedItem = (line, expectedIndent = '   ') => {
  const matcher = new RegExp(`^${expectedIndent.replace(/ /g, '\\s')}(\\d+)\\.\\s`).exec(line);
  if (!matcher) {
    return null;
  }
  return Number(matcher[1]);
};

export const parseV3DashboardBacklogSnippet = ({
  snippet,
  taskId = 'V3-RC-02',
  expectedRunId
}) => {
  const lines = splitLines(snippet)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 4) {
    throw new Error('Backlog snippet content is incomplete');
  }

  const expectedHeader = `## ${taskId} 执行记录回写片段（自动生成）`;
  if (lines[0] !== expectedHeader) {
    throw new Error(`Backlog snippet task header mismatch: expected ${expectedHeader}`);
  }

  const lineOneMatcher = /^1\.\s已完成（`([^`]+)`）：在 `([^`]+)` 触发 `v3-beta-regression-matrix` run `([^`]+)`（([^）]+)），`V3Dashboard` 双态 smoke=`([^`]+)`，演练结论=`([^`]+)`。$/.exec(
    lines[1]
  );
  if (!lineOneMatcher) {
    throw new Error('Backlog snippet line 1 format is invalid');
  }

  const lineTwoMatcher = /^2\.\s已归档：`([^`]+)`、`([^`]+)`。$/.exec(lines[2]);
  if (!lineTwoMatcher) {
    throw new Error('Backlog snippet line 2 format is invalid');
  }

  const lineThreeMatcher = /^3\.\s下一点：(.+)$/.exec(lines[3]);
  if (!lineThreeMatcher) {
    throw new Error('Backlog snippet line 3 format is invalid');
  }

  const generatedDate = toTrimmedString(lineOneMatcher[1]);
  const environment = toTrimmedString(lineOneMatcher[2]);
  const runId = toTrimmedString(lineOneMatcher[3]);
  const runUrl = toTrimmedString(lineOneMatcher[4]);
  const smokeResult = toTrimmedString(lineOneMatcher[5]).toLowerCase();
  const conclusion = toTrimmedString(lineOneMatcher[6]);
  const reportMdPath = toTrimmedString(lineTwoMatcher[1]);
  const drillJsonPath = toTrimmedString(lineTwoMatcher[2]);
  const nextAction = toTrimmedString(lineThreeMatcher[1]);

  if (!generatedDate || !runId || !runUrl || !reportMdPath || !drillJsonPath || !nextAction) {
    throw new Error('Backlog snippet contains empty required fields');
  }

  const expected = toTrimmedString(expectedRunId);
  if (expected && expected !== runId) {
    throw new Error(`Backlog snippet runId mismatch: expected ${expected}, got ${runId}`);
  }

  const publishable = smokeResult === 'pass' && conclusion === '可发布';
  const blocked = smokeResult === 'fail' && conclusion === '暂缓发布';
  if (!publishable && !blocked) {
    throw new Error(
      `Backlog snippet inconsistent status: smokeResult=${smokeResult}, conclusion=${conclusion}`
    );
  }

  if (publishable && isPlaceholderRunUrl(runUrl)) {
    throw new Error('Publishable backlog snippet requires a workflow run URL');
  }

  return {
    taskId,
    generatedDate,
    environment,
    runId,
    runUrl,
    smokeResult,
    conclusion,
    publishable,
    reportMdPath,
    drillJsonPath,
    nextAction
  };
};

const findSectionRange = (lines, taskId) => {
  const start = findHeadingLine(lines, (line) => line.trim().startsWith(`### \`${taskId}\``));
  if (start < 0) {
    throw new Error(`Task section not found in backlog doc: ${taskId}`);
  }

  const nextHeading = findHeadingLine(lines, (line, index) => index > start && line.startsWith('### '));
  const nextDivider = findHeadingLine(lines, (line, index) => index > start && line.trim() === '---');

  let end = lines.length;
  if (nextHeading >= 0) {
    end = nextHeading;
  }
  if (nextDivider >= 0 && nextDivider < end) {
    end = nextDivider;
  }

  return {
    start,
    end
  };
};

const findMaxSubItemNumber = (lines, start, end, indent = '   ') => {
  let maxNumber = 0;
  for (let index = start; index < end; index += 1) {
    const value = parseNumberedItem(lines[index], indent);
    if (value && value > maxNumber) {
      maxNumber = value;
    }
  }
  return maxNumber;
};

const findSubListInsertIndex = (sectionLines, headingIndex, indent = '   ') => {
  let lastItemIndex = headingIndex;
  for (let index = headingIndex + 1; index < sectionLines.length; index += 1) {
    if (parseNumberedItem(sectionLines[index], indent)) {
      lastItemIndex = index;
      continue;
    }

    if (sectionLines[index].startsWith('### ') || sectionLines[index].trim() === '---') {
      break;
    }
  }
  return lastItemIndex + 1;
};

const renderExecutionUpdates = (meta, startNumber) => {
  const lines = [];

  lines.push(
    `   ${startNumber}. 已完成（\`${meta.generatedDate}\`）：执行 \`v3-dashboard-drill-backlog-apply\` 自动回写，纳入 run \`${meta.runId}\`（${meta.runUrl}）证据。`
  );
  lines.push(
    `   ${startNumber + 1}. 已归档：\`${meta.reportMdPath}\`、\`${meta.drillJsonPath}\`。`
  );

  if (meta.publishable) {
    lines.push(`   ${startNumber + 2}. 结论更新：\`V3-RC-02\` 满足 PASS 证据闭环，可执行正式关闭流程。`);
  } else {
    lines.push(`   ${startNumber + 2}. 结论维持：\`暂缓发布\`，继续阻塞态回滚收口。`);
  }

  return lines;
};

export const applyV3DashboardBacklogSnippetToDoc = ({
  backlogDoc,
  snippet,
  taskId = 'V3-RC-02',
  expectedRunId
}) => {
  const meta = parseV3DashboardBacklogSnippet({
    snippet,
    taskId,
    expectedRunId
  });

  const newline = String(backlogDoc ?? '').includes('\r\n') ? '\r\n' : '\n';
  const lines = splitLines(backlogDoc);
  const sectionRange = findSectionRange(lines, taskId);

  const sectionLines = lines.slice(sectionRange.start, sectionRange.end);
  const sectionContent = sectionLines.join('\n');

  if (
    sectionContent.includes(`\`${meta.reportMdPath}\``) ||
    sectionContent.includes(`\`${meta.drillJsonPath}\``)
  ) {
    throw new Error('Backlog doc already contains this drill archive evidence');
  }

  const executionHeading = findHeadingLine(sectionLines, (line) => line.trim().startsWith(SECTION_EXECUTION_TITLE));
  if (executionHeading < 0) {
    throw new Error(`Task section missing '${SECTION_EXECUTION_TITLE}' block`);
  }

  const nextActionsHeading = findHeadingLine(
    sectionLines,
    (line, index) => index > executionHeading && line.trim().startsWith(SECTION_NEXT_ACTIONS_TITLE)
  );
  if (nextActionsHeading < 0) {
    throw new Error(`Task section missing '${SECTION_NEXT_ACTIONS_TITLE}' block`);
  }

  const maxExecutionNumber = findMaxSubItemNumber(sectionLines, executionHeading + 1, nextActionsHeading, '   ');
  const executionInsertLines = renderExecutionUpdates(meta, maxExecutionNumber + 1);

  const sectionWithExecution = [
    ...sectionLines.slice(0, nextActionsHeading),
    ...executionInsertLines,
    ...sectionLines.slice(nextActionsHeading)
  ];

  const updatedNextActionsHeading = findHeadingLine(sectionWithExecution, (line) =>
    line.trim().startsWith(SECTION_NEXT_ACTIONS_TITLE)
  );

  const nextActionsInsertIndex = findSubListInsertIndex(sectionWithExecution, updatedNextActionsHeading, '   ');
  const maxNextActionNumber = findMaxSubItemNumber(
    sectionWithExecution,
    updatedNextActionsHeading + 1,
    nextActionsInsertIndex,
    '   '
  );
  const nextActionLine = `   ${maxNextActionNumber + 1}. 下一点：${meta.nextAction}`;

  const finalSection = [
    ...sectionWithExecution.slice(0, nextActionsInsertIndex),
    nextActionLine,
    ...sectionWithExecution.slice(nextActionsInsertIndex)
  ];

  const finalLines = [...lines.slice(0, sectionRange.start), ...finalSection, ...lines.slice(sectionRange.end)];

  return {
    meta,
    updatedContent: finalLines.join(newline)
  };
};

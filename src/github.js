import { Octokit } from '@octokit/rest';
import { config } from './config.js';

const octokit = new Octokit({ auth: config.githubToken });
const owner = config.repoOwner;
const repo = config.repoName;

const SERVICE_TO_AREA = {
  'loen-backend': 'area/backend',
  'loen-frontend': 'area/frontend',
  'obs-beta-web': 'area/obs-web',
  'ai-server-loen': 'area/ai',
};

// 트랙별 최상위 라벨 (dedup·필터 기준)
const KIND_LABEL = { bug: 'qa-제보', feedback: 'feedback' };

// 제목 키워드로 기존 open 이슈 검색 (dedup) — 트랙(label)별로 분리 검색
export async function findDuplicate(title, kind = 'bug') {
  const label = KIND_LABEL[kind] || KIND_LABEL.bug;
  const keywords = title
    .replace(/\[QA\]|\[FEEDBACK\]/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  const q = `repo:${owner}/${repo} is:issue is:open label:${label} ${keywords}`;
  try {
    const res = await octokit.rest.search.issuesAndPullRequests({ q, per_page: 3 });
    return res.data.items[0] || null;
  } catch (err) {
    console.warn('dedup 검색 실패(무시하고 생성 진행):', err.message);
    return null;
  }
}

export async function createIssue(result, opts) {
  return result.kind === 'feedback'
    ? createFeedbackIssue(result, opts)
    : createBugIssue(result, opts);
}

// QA(버그) 이슈 — 기존 동작
async function createBugIssue(result, { threadUrl, attachments }) {
  const labels = ['qa-제보'];
  const area = SERVICE_TO_AREA[result.service];
  if (area) labels.push(area);
  if (result.feature) labels.push(result.feature);
  if (result.severity) labels.push(result.severity);
  if (result.confidence === 'low') labels.push('needs-triage');

  const repro = result.repro?.length
    ? result.repro.map((r) => `- ${r}`).join('\n')
    : '- (미상)';
  const attBlock = attachments?.length
    ? `\n\n## 첨부\n${attachments.map((u) => `![](${u})`).join('\n')}`
    : '';

  const body =
    `${result.summary}\n\n` +
    `## 재현\n${repro}\n\n` +
    `## 기기\n${result.device || '(미상)'}` +
    attBlock +
    `\n\n---\n출처: ${threadUrl} · confidence: ${result.confidence}`;

  const res = await octokit.rest.issues.create({ owner, repo, title: result.title, body, labels });
  return res.data;
}

// 베타 피드백 이슈 — QA와 분리(라벨 feedback). 기종·재현·심각도 없이 가볍게.
async function createFeedbackIssue(result, { threadUrl, attachments }) {
  const labels = ['feedback'];
  const area = SERVICE_TO_AREA[result.service];
  if (area) labels.push(area);
  if (result.feature) labels.push(result.feature);
  if (result.feedbackType) labels.push(`feedback/${result.feedbackType}`);
  if (result.confidence === 'low') labels.push('needs-triage');

  const attBlock = attachments?.length
    ? `\n\n## 첨부\n${attachments.map((u) => `![](${u})`).join('\n')}`
    : '';

  const body =
    `${result.summary}\n\n` +
    `## 유형\n${result.feedbackType || '(미상)'}` +
    attBlock +
    `\n\n---\n출처: ${threadUrl} · confidence: ${result.confidence}`;

  const res = await octokit.rest.issues.create({ owner, repo, title: result.title, body, labels });
  return res.data;
}

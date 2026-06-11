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

// 제목 키워드로 기존 open 제보 이슈 검색 (dedup)
export async function findDuplicate(title) {
  const keywords = title
    .replace(/\[QA\]/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  const q = `repo:${owner}/${repo} is:issue is:open label:qa-제보 ${keywords}`;
  try {
    const res = await octokit.rest.search.issuesAndPullRequests({ q, per_page: 3 });
    return res.data.items[0] || null;
  } catch (err) {
    console.warn('dedup 검색 실패(무시하고 생성 진행):', err.message);
    return null;
  }
}

export async function createIssue(result, { threadUrl, attachments }) {
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

  const res = await octokit.rest.issues.create({
    owner,
    repo,
    title: result.title,
    body,
    labels,
  });
  return res.data;
}

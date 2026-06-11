// 연결 점검: Gemini 분류 호출 + GitHub 토큰/repo 접근 (이슈 생성은 안 함)
// 실행: node scripts/check-env.js
import { config } from '../src/config.js';
import { classify } from '../src/classify.js';
import { Octokit } from '@octokit/rest';

const SAMPLE = '테스터1: OBS 복습에서 빈칸 채우고 제출했는데 정답이 계속 틀렸다고 떠요. iPhone 15에서요.';

console.log(`\n[1/2] Gemini 분류 점검 (provider=${config.provider})`);
try {
  const r = await classify(SAMPLE);
  console.log('  ✓ 분류 성공:');
  console.log('   ', JSON.stringify(r));
} catch (e) {
  console.error('  ✗ 분류 실패:', e.message);
}

console.log('\n[2/2] GitHub 토큰/repo 접근 점검');
try {
  const octokit = new Octokit({ auth: config.githubToken });
  const { data } = await octokit.rest.repos.get({
    owner: config.repoOwner,
    repo: config.repoName,
  });
  console.log(`  ✓ repo 접근: ${data.full_name} (${data.private ? 'private' : 'public'})`);
  const labels = await octokit.rest.issues.listLabelsForRepo({
    owner: config.repoOwner,
    repo: config.repoName,
    per_page: 100,
  });
  console.log(`  ✓ 라벨 ${labels.data.length}개 확인 (qa-제보 있음: ${labels.data.some((l) => l.name === 'qa-제보')})`);
} catch (e) {
  console.error('  ✗ GitHub 접근 실패:', e.status || '', e.message);
}

console.log('');
process.exit(0);

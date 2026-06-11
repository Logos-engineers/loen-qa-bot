// E2E: 디스코드만 빼고 풀파이프라인 (분류 → dedup → 실제 이슈 생성)
// 실행: node scripts/e2e-test.js
import { classify } from '../src/classify.js';
import { findDuplicate, createIssue } from '../src/github.js';

const SAMPLE =
  '테스터1: [E2E테스트] 신앙노트에서 감사 내용 적고 엔터 쳤는데 저장이 안 되고 입력창이 그대로예요. 갤럭시 S24입니다.';

console.log('제보:', SAMPLE, '\n');

const result = await classify(SAMPLE);
console.log('① 분류 결과:', JSON.stringify(result, null, 0), '\n');

const dup = await findDuplicate(result.title);
if (dup) {
  console.log(`② dedup: 기존 이슈 발견 → ${dup.html_url} (#${dup.number}) — 생성 스킵`);
  process.exit(0);
}
console.log('② dedup: 중복 없음 → 생성 진행');

const issue = await createIssue(result, {
  threadUrl: 'https://discord.com/(E2E-테스트-스레드)',
  attachments: [],
});
console.log(`③ 이슈 생성 ✅ → ${issue.html_url} (#${issue.number})`);
console.log('   라벨:', issue.labels.map((l) => l.name || l).join(', '));
process.exit(0);

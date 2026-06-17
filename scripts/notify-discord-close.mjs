// GitHub 이슈가 닫히면, 이슈 본문의 디스코드 출처 스레드에 "해결됨" 답글을 남긴다.
// QA 봇이 만든 이슈만 대상으로 한다 — 본문에 `출처: https://discord.com/channels/...` 가
// 있는 이슈만 처리하고, 그 외(수동 이슈 등)는 조용히 통과한다.
//
// 트리거: .github/workflows/qa-close-notify.yml (on: issues: closed)
// 필요 시크릿: DISCORD_BOT_TOKEN (봇이 해당 포럼에 "스레드에서 메시지 보내기" 권한 필요)

const token = process.env.DISCORD_BOT_TOKEN;
const body = process.env.ISSUE_BODY || '';
const number = process.env.ISSUE_NUMBER || '';
const title = process.env.ISSUE_TITLE || '';
const issueUrl = process.env.ISSUE_URL || '';

// 출처 URL: https://discord.com/channels/{guild}/{thread}/{message}
// 포럼 글은 thread == 답글을 달 채널. 2번째 숫자 세그먼트가 스레드(채널) ID.
const match = body.match(/discord\.com\/channels\/(\d+)\/(\d+)(?:\/(\d+))?/);
if (!match) {
  console.log('디스코드 출처 URL 없음 — QA 봇 이슈가 아니므로 통과.');
  process.exit(0);
}
const channelId = match[2];

if (!token) {
  console.error('DISCORD_BOT_TOKEN 시크릿이 설정돼 있지 않습니다.');
  process.exit(1);
}

const content =
  `✅ **해결됨** — GitHub 이슈 #${number} 닫힘\n` +
  `${title}\n${issueUrl}`;

const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  },
  // allowed_mentions parse:[] — 본문에 멘션/역할이 섞여도 실제 핑은 보내지 않음
  body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
});

if (!res.ok) {
  const text = await res.text().catch(() => '');
  console.error(`Discord API 실패 (${res.status}): ${text}`);
  process.exit(1);
}

console.log(`스레드 ${channelId}에 해결 답글 게시 완료 (이슈 #${number}).`);

import 'dotenv/config';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 누락: ${name} (.env 확인)`);
  return v;
}

const provider = process.env.QA_MODEL_PROVIDER || 'gemini'; // 'gemini' | 'anthropic'

// R2: 5개 키가 모두 있으면 활성. 없으면 디스코드 원본 URL fallback.
const r2Enabled = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_PUBLIC_URL
);

export const config = {
  discordToken: req('DISCORD_BOT_TOKEN'),
  forumChannelId: req('QA_FORUM_CHANNEL_ID'),
  // 베타 피드백(불편·개선) 전용 포럼. 비우면 피드백 트랙 비활성(QA만 동작).
  feedbackForumChannelId: process.env.FEEDBACK_FORUM_CHANNEL_ID || null,

  // 분류 모델 (provider 스위치)
  provider,
  geminiKey: provider === 'gemini' ? req('GEMINI_API_KEY') : process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  anthropicKey: provider === 'anthropic' ? req('ANTHROPIC_API_KEY') : process.env.ANTHROPIC_API_KEY,
  haikuModel: process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001',

  // GitHub
  githubToken: req('GITHUB_TOKEN'),
  repoOwner: process.env.REPO_OWNER || 'Logos-engineers',
  repoName: process.env.REPO_NAME || 'loen-qa-bot',

  // R2 (첨부 영속화) — prefix로 프로덕션과 격리
  r2: {
    enabled: r2Enabled,
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
    prefix: process.env.R2_KEY_PREFIX || 'qa/', // 프로덕션('')·dev('dev/')와 분리
  },

  maxRounds: Number(process.env.MAX_ROUNDS || 2),
};

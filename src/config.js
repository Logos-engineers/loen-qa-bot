import 'dotenv/config';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 누락: ${name} (.env 확인)`);
  return v;
}

const provider = process.env.QA_MODEL_PROVIDER || 'gemini'; // 'gemini' | 'anthropic'

export const config = {
  discordToken: req('DISCORD_BOT_TOKEN'),
  forumChannelId: req('QA_FORUM_CHANNEL_ID'),

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

  maxRounds: Number(process.env.MAX_ROUNDS || 2),
};

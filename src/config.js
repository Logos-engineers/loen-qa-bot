import 'dotenv/config';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 누락: ${name} (.env 확인)`);
  return v;
}

export const config = {
  discordToken: req('DISCORD_BOT_TOKEN'),
  forumChannelId: req('QA_FORUM_CHANNEL_ID'),
  anthropicKey: req('ANTHROPIC_API_KEY'),
  haikuModel: process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001',
  githubToken: req('GITHUB_TOKEN'),
  repoOwner: process.env.REPO_OWNER || 'Logos-engineers',
  repoName: process.env.REPO_NAME || 'loen-qa-bot',
  maxRounds: Number(process.env.MAX_ROUNDS || 2),
};

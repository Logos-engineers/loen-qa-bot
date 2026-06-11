import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { config } from './config.js';
import { classify } from './classify.js';
import { findDuplicate, createIssue } from './github.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// 스레드별 상태: { rounds, transcript[], attachments[], status }
const threads = new Map();

function isQaThread(channel) {
  return channel?.isThread?.() && channel.parentId === config.forumChannelId;
}

client.once(Events.ClientReady, (c) => {
  console.log(`✓ QA봇 로그인: ${c.user.tag} · 포럼 ${config.forumChannelId} 감시`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!isQaThread(message.channel)) return;

    const id = message.channel.id;
    const state =
      threads.get(id) || { rounds: 0, transcript: [], attachments: [], status: 'open' };
    threads.set(id, state);
    if (state.status === 'done') return; // 이미 이슈화된 스레드는 무시

    const atts = [...message.attachments.values()].map((a) => a.url);
    state.attachments.push(...atts);
    state.transcript.push(
      `${message.author.username}: ${message.content}` +
        (atts.length ? `\n[첨부: ${atts.join(', ')}]` : ''),
    );

    const result = await classify(state.transcript.join('\n'));

    // 핵심 부족 + 라운드 여유 → 되묻기
    if (!result.enough && state.rounds < config.maxRounds) {
      state.rounds += 1;
      const qs = (result.questions || [])
        .slice(0, 2)
        .map((q) => `• ${q}`)
        .join('\n');
      await message.channel.send(`조금만 더 알려주세요 🙏\n${qs}`);
      return;
    }

    // enough 또는 라운드 초과 → 이슈 생성
    if (!result.enough) result.confidence = 'low'; // 라운드 초과 추정 → needs-triage

    const dup = await findDuplicate(result.title);
    if (dup) {
      state.status = 'done';
      await message.channel.send(
        `이미 등록된 제보로 보여요 → ${dup.html_url} (#${dup.number})`,
      );
      return;
    }

    const issue = await createIssue(result, {
      threadUrl: message.url,
      attachments: state.attachments,
    });
    state.status = 'done';
    const labelNames = issue.labels.map((l) => l.name || l).join(', ');
    await message.channel.send(
      `이슈로 등록했어요 ✅ → ${issue.html_url} (#${issue.number})\n라벨: ${labelNames}`,
    );
  } catch (err) {
    console.error('처리 오류:', err);
    try {
      await message.channel.send(`⚠️ 처리 중 오류가 났어요. 로그 확인 필요: ${err.message}`);
    } catch {
      /* 채널 전송도 실패하면 콘솔 로그로 끝 */
    }
  }
});

client.login(config.discordToken);

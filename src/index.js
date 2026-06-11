import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { config } from './config.js';
import { classify } from './classify.js';
import { findDuplicate, createIssue } from './github.js';
import { rehostAttachment } from './storage.js';
import { issueMessage, dupMessage, askMessage } from './messages.js';
import { loadThreads, scheduleSave } from './store.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// 스레드별 상태: { rounds, transcript[], attachments[], status, queue }
// 재시작 대비 data/threads.json에 영속화 (store.js). queue는 복원 시 새로 부여.
const threads = await loadThreads();

function isQaThread(channel) {
  return channel?.isThread?.() && channel.parentId === config.forumChannelId;
}

client.once(Events.ClientReady, (c) => {
  const model = config.provider === 'anthropic' ? config.haikuModel : config.geminiModel;
  console.log(
    `✓ QA봇 로그인: ${c.user.tag} · 포럼 ${config.forumChannelId} 감시 · 분류=${config.provider}(${model})`,
  );
});

client.on(Events.MessageCreate, (message) => {
  if (message.author.bot) return;
  if (!isQaThread(message.channel)) return;

  const id = message.channel.id;
  const existing = threads.get(id);
  const state =
    existing || { rounds: 0, transcript: [], attachments: [], status: 'open', queue: Promise.resolve() };
  if (!existing) {
    threads.set(id, state);
    // 포럼 글 "제목"(스레드 이름)도 핵심 맥락 — 본문만 보면 놓친다
    if (message.channel.name) state.transcript.push(`[제보 제목] ${message.channel.name}`);
  }

  // 같은 스레드는 직렬 처리 → 동시 메시지로 인한 중복 이슈 방지
  state.queue = state.queue
    .then(() => handleMessage(message, state, id))
    .then(() => scheduleSave(threads)) // 처리 후 상태 영속화
    .catch((e) => console.error('스레드 큐 오류:', e));
});

async function handleMessage(message, state, id) {
  if (state.status === 'done') return; // 이미 이슈화된 스레드는 무시
  try {
    const atts = [...message.attachments.values()].map((a) => ({
      url: a.url,
      name: a.name,
      messageId: message.id,
    }));
    state.attachments.push(...atts);
    state.transcript.push(
      `${message.author.username}: ${message.content}` +
        (atts.length ? `\n[첨부: ${atts.map((a) => a.name).join(', ')}]` : ''),
    );

    const result = await classify(state.transcript.join('\n'));

    // 필수 정보 부족 + 라운드 여유 → 되묻기
    if (!result.enough && state.rounds < config.maxRounds) {
      state.rounds += 1;
      await message.channel.send(askMessage(result.questions));
      return;
    }
    if (!result.enough) result.confidence = 'low'; // 라운드 초과 추정 → needs-triage

    const dup = await findDuplicate(result.title);
    if (dup) {
      state.status = 'done';
      await message.channel.send(dupMessage(dup));
      return;
    }

    // 첨부를 R2로 재업로드(만료되는 디스코드 URL → 영구 URL)
    const hostedUrls = [];
    for (const a of state.attachments) {
      hostedUrls.push(await rehostAttachment({ ...a, threadId: id }));
    }

    const issue = await createIssue(result, { threadUrl: message.url, attachments: hostedUrls });
    state.status = 'done';
    await message.channel.send(issueMessage(result, issue));
  } catch (err) {
    console.error('처리 오류:', err);
    const overloaded = /503|429|UNAVAILABLE|overloaded|high demand|rate limit/i.test(
      String(err.message || ''),
    );
    const friendly = overloaded
      ? '지금 분류 서버가 잠깐 혼잡해요 🙏 잠시 후 메시지 한 번만 더 남겨주시면 다시 정리해드릴게요.'
      : '처리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요. (관리자 확인 필요)';
    try {
      await message.channel.send(friendly);
    } catch {
      /* 채널 전송도 실패하면 콘솔 로그로 끝 */
    }
  }
}

// 예기치 못한 에러로 프로세스가 죽지 않게 (PM2와 별개 안전망)
process.on('unhandledRejection', (r) => console.error('unhandledRejection:', r));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));

client.login(config.discordToken);

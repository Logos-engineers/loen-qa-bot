import { config } from './config.js';
import { ROUTING_MAP } from './routingMap.js';

const SYSTEM = `너는 로엔(LOEN) 앱의 QA 제보 분류 봇이다.
아래 [라우팅 맵] 기준으로 디스코드 제보 스레드를 분류해 JSON 하나로만 답한다.

규칙:
- [라우팅 맵]의 "필수 데이터"가 모두 있으면(또는 자명하면) enough=true.
- 필수 데이터 중 빠진 게 있으면 enough=false 로, 빠진 항목만 questions에 1~2개 짧은 한국어 질문으로 담는다.
- 기대 동작은 필수지만, 증상에서 자명하면(크래시·먹통·로그인 불가 등) 묻지 않고 통과한다.
- 기종(iOS/Android)은 UI·화면 문제일 때만 필수다. 서버·데이터·로직 문제면 묻지 않는다.
- "권장/선택" 데이터(재현 절차·빈도·스크린샷 등)는 없어도 되묻지 않는다 → 추정하고 confidence로 표시.
- 마크다운/설명 없이 아래 스키마의 JSON 객체 하나만 출력한다.

[라우팅 맵]
${ROUTING_MAP}

[출력 스키마]
{
  "enough": true,
  "questions": [],
  "title": "[QA] <한 줄 요약>",
  "service": "loen-frontend|loen-backend|obs-beta-web|ai-server-loen|unknown",
  "feature": "feat/auth|feat/home|feat/note|feat/obs|feat/bible|feat/oikos",
  "severity": "severity/P0|severity/P1|severity/P2|severity/P3",
  "summary": "증상 1~2줄",
  "repro": [],
  "device": "",
  "confidence": "high|medium|low"
}`;

export async function classify(transcript) {
  const userMsg = `제보 스레드 전체:\n${transcript}`;
  const call = (attempt) =>
    config.provider === 'anthropic' ? viaAnthropic(userMsg) : viaGemini(userMsg, attempt);
  const text = await withRetry(call);
  return parseJson(text);
}

// 일시적 과부하(503/429/overloaded)에 모델 폴백 + 지수백오프 재시도 — 무료티어 대비
async function withRetry(fn, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      last = e;
      const msg = String(e.message || '');
      const transient = /503|429|UNAVAILABLE|overloaded|high demand|rate limit/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      const wait = 1000 * 2 ** i; // 1s, 2s, 4s
      console.warn(`  분류 일시 오류, ${wait}ms 후 재시도(${i + 1}/${tries - 1}): ${msg.slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

// --- Gemini (무료 티어 테스트 기본값) ---
// 과부하 시 시도마다 덜 붐비는 모델로 폴백
const GEMINI_MODELS = [
  ...new Set([config.geminiModel, 'gemini-2.0-flash', 'gemini-2.5-flash-lite']),
];
let geminiClient;
async function viaGemini(userMsg, attempt = 0) {
  const { GoogleGenAI } = await import('@google/genai');
  geminiClient ||= new GoogleGenAI({ apiKey: config.geminiKey });
  const model = GEMINI_MODELS[Math.min(attempt, GEMINI_MODELS.length - 1)];
  const res = await geminiClient.models.generateContent({
    model,
    contents: userMsg,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: 'application/json', // JSON 출력 강제
      temperature: 0,
    },
  });
  return res.text;
}

// --- Anthropic Haiku (운영 전환용) ---
let anthropicClient;
async function viaAnthropic(userMsg) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  anthropicClient ||= new Anthropic({ apiKey: config.anthropicKey });
  const msg = await anthropicClient.messages.create({
    model: config.haikuModel,
    max_tokens: 1024,
    // 라우팅 맵은 매 호출 동일 → 프롬프트 캐시로 비용 절감
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  });
  return msg.content.map((b) => b.text || '').join('');
}

function parseJson(text) {
  const cleaned = (text || '').replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('분류 JSON 파싱 실패: ' + cleaned.slice(0, 200));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

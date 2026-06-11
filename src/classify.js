import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { ROUTING_MAP } from './routingMap.js';

const client = new Anthropic({ apiKey: config.anthropicKey });

const SYSTEM = `너는 로엔(LOEN) 앱의 QA 제보 분류 봇이다.
아래 [라우팅 맵] 기준으로 디스코드 제보 스레드를 분류해 JSON 하나로만 답한다.

규칙:
- 서비스·기능·증상이 대략 파악되면 enough=true 로 바로 진행한다(관대하게).
- 정말 핵심(무슨 화면/기능, 증상)이 빠졌을 때만 enough=false 로 questions에 1~2개 짧은 한국어 질문을 담는다.
- 기기·재현 디테일이 없다고 되묻지 않는다 → 추정하고 confidence로 표시.
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
  const msg = await client.messages.create({
    model: config.haikuModel,
    max_tokens: 1024,
    // 라우팅 맵은 매 호출 동일 → 프롬프트 캐시로 비용 절감
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `제보 스레드 전체:\n${transcript}` }],
  });
  const text = msg.content.map((b) => b.text || '').join('').trim();
  return parseJson(text);
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('분류 JSON 파싱 실패: ' + text.slice(0, 200));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

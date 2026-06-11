# loen-qa-bot

로엔 QA 제보 봇 — 디스코드 `#qa-제보` 포럼 글을 **Haiku로 분류**해 **GitHub 이슈로 큐잉**한다.
이슈에서 끌어와 분석·PR 만드는 단계는 아직 범위 밖 (knowledge 볼트 [[QA-에이전트-구축-runbook]] §유보).

## 흐름
```
디스코드 포럼 글(=스레드) → 봇이 스레드 맥락 수집 → Haiku 분류(라우팅맵)
  → enough=false면 1~2개 되물음(최대 MAX_ROUNDS) → GitHub 이슈 생성(라벨) → 스레드에 링크 답글
```

## 셋업
1. `npm install`
2. `cp .env.example .env` 후 값 채우기:
   - `DISCORD_BOT_TOKEN` — discord.com/developers 봇 토큰
   - `QA_FORUM_CHANNEL_ID` — `#qa-제보` 포럼 채널 ID (개발자모드 → 우클릭 → ID 복사)
   - **분류 모델** — `QA_MODEL_PROVIDER=gemini`(기본, 무료티어 테스트) → `GEMINI_API_KEY` / `anthropic`(운영) → `ANTHROPIC_API_KEY`
   - `GITHUB_TOKEN` — fine-grained PAT, `Logos-engineers/loen-qa-bot`의 `Issues: write`
3. 로컬 실행: `npm run dev` / 운영: `pm2 start ecosystem.config.cjs`

## 분류 모델 전환
`.env`의 `QA_MODEL_PROVIDER`로 스위치 (코드 불변):
- `gemini` (기본): `GEMINI_MODEL=gemini-2.0-flash`, JSON 출력 강제(`responseMimeType`). 무료티어 테스트용.
- `anthropic`: `HAIKU_MODEL=claude-haiku-4-5-20251001`, 프롬프트 캐시 적용. 운영 권장(설계 확정 모델).

## 디스코드 봇 권한
- 인텐트: **Message Content Intent** 켜기 (Developer Portal → Bot → Privileged Gateway Intents)
- 권한: Read Messages, Send Messages, Create Public Threads, Read Message History

## 구조
- `src/index.js` — 디스코드 리스너 + 스레드 상태 머신
- `src/classify.js` — Haiku 분류 (프롬프트 캐시 적용)
- `src/routingMap.js` — 분류 기준 (볼트 [[QA-라우팅-맵]] 동기화)
- `src/github.js` — dedup 검색 + 이슈 생성
- `src/config.js` — env 로딩

## 라벨
`qa-제보` · `area/{backend,frontend,obs-web,ai}` · `feat/{auth,home,note,obs,bible,oikos}` · `severity/P0~P3` · `needs-triage` · `needs-human`

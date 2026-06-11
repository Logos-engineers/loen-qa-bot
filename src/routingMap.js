// QA 라우팅 맵 — 봇 분류 기준 (knowledge 볼트 [[QA-라우팅-맵]] 동기화).
// 이 텍스트만 고치면 분류 동작이 바뀐다(코드 불변). 변경 시 볼트 문서도 같이 갱신할 것.

export const ROUTING_MAP = `
## 서비스 맵
- loen-backend  → 라벨 area/backend  : 인증·API·DB·비즈니스 로직 (Spring Boot)
- loen-frontend → 라벨 area/frontend : 앱 화면·UI·네비게이션 (RN/Expo)
- obs-beta-web  → 라벨 area/obs-web  : OBS 웹 베타 (Next.js, 폐기예정)
- ai-server-loen→ 라벨 area/ai       : OBS 퀴즈 생성 등 AI (FastAPI/Claude)

## 기능 영역 (앱 내부) — GNB: 홈/신앙/교회/마이페이지
- feat/auth  : 로그인·회원가입·OAuth (보통 backend+frontend 동반)
- feat/home  : 홈·배너·공지
- feat/note  : 신앙노트(감사·기도·말씀) — 입력·엔터·포커스 엣지케이스 잦음
- feat/obs   : OBS 복습(빈칸·퀴즈·적용) — 데이터=backend, 퀴즈=ai
- feat/bible : 성경읽기·통독·챌린지
- feat/oikos : 오이코스·그룹·권한 — 리더 관리·CSV

## 증상 → 추정 서비스 (휴리스틱)
- "로그인/구글/토큰 만료/인증"           → area/backend + feat/auth (+화면이면 frontend)
- "버튼 안 눌림/화면 깨짐/레이아웃/스크롤/폰트" → area/frontend
- "저장 안 됨/목록 안 뜸/500/데이터 틀림"   → area/backend
- "OBS 퀴즈 이상/정답 이상/요약 이상"      → ai-server-loen 의심 (+backend)
- "OBS 웹에서 ~"                          → area/obs-web
- 모호하면 단일 서비스 단정 금지 → service=unknown, confidence=low

## 심각도
- severity/P0 : 앱 못 씀·크래시·로그인 불가·데이터 유실
- severity/P1 : 핵심 루프(노트·OBS·성경) 기능 불가
- severity/P2 : 일부 기능 불편·우회 가능
- severity/P3 : UI 사소·오타·개선 제안

## 필수 데이터 — 없으면 되묻는다 (enough=false)
아래 필수 항목이 모두 있으면(또는 자명하면) enough=true. 빠진 게 있으면 enough=false 로
빠진 항목만 questions에 1~2개 짧은 한국어로 묻는다.
1. 화면/기능 — 어느 화면·기능에서 발생했나
2. 증상 — 무슨 일이 일어났나
3. 기대 동작 — 원래 어떻게 동작해야 했나
   · 예외: 증상에서 기대가 자명하면(크래시·먹통·로그인 불가 등) 안 묻고 통과한다.
4. 기종(iOS/Android) — **UI·화면 관련 문제일 때만 필수.** 서버·데이터·로직 문제면 불필요.

## 권장 — 없어도 되묻지 않는다 (추정하고 confidence로 표시, 낮으면 needs-triage)
- 재현 절차, 빈도(항상/가끔)

## 선택 — 있으면 담고 없으면 무시
- 스크린샷, 앱 버전
`.trim();

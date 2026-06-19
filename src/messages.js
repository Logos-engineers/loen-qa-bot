// 디스코드 스레드에 나가는 안내 메시지 (비개발자 친화 텍스트 카드)

const SEVERITY_KO = {
  'severity/P0': 'P0 · 긴급',
  'severity/P1': 'P1 · 높음',
  'severity/P2': 'P2 · 보통',
  'severity/P3': 'P3 · 낮음',
};
const AREA_KO = {
  'area/frontend': '앱(프론트)',
  'area/backend': '서버(백엔드)',
  'area/obs-web': 'OBS 웹',
  'area/ai': 'AI 서비스',
};
const FEAT_KO = {
  'feat/auth': '로그인/인증',
  'feat/home': '홈/배너',
  'feat/note': '신앙노트',
  'feat/obs': 'OBS 복습',
  'feat/bible': '성경읽기',
  'feat/oikos': '오이코스',
};

export function issueMessage(result, issue) {
  const names = issue.labels.map((l) => l.name || l);
  const area = names.find((l) => l.startsWith('area/'));
  const feat = names.find((l) => l.startsWith('feat/'));
  const sev = names.find((l) => l.startsWith('severity/'));
  const triage = names.includes('needs-triage');

  const lines = [
    `✅ 제보를 이슈로 등록했어요! (#${issue.number})`,
    `> ${result.summary || issue.title}`,
    '',
    `🗂 분류 · ${AREA_KO[area] || area || '미정'} / ${FEAT_KO[feat] || feat || '미정'}`,
    `🔥 심각도 · ${SEVERITY_KO[sev] || sev || '미정'}`,
  ];
  if (result.device) lines.push(`📱 기종 · ${result.device}`);
  if (result.repro?.length) lines.push(`🔁 재현 · ${result.repro.join(' → ')}`);
  lines.push('', `🔗 ${issue.html_url}`, '');
  lines.push(
    triage
      ? '제보 감사합니다 🙏 일부 내용은 제가 추정으로 채웠으니 이슈에서 한 번 확인해주세요.'
      : '제보 감사합니다 🙏 진행 상황은 위 링크에서 확인할 수 있어요.',
  );
  return lines.join('\n');
}

const FEEDBACK_TYPE_KO = {
  ux: '사용성 불편',
  request: '기능 요청',
  content: '콘텐츠/문구',
  etc: '일반 의견',
};

export function feedbackIssueMessage(result, issue) {
  const names = issue.labels.map((l) => l.name || l);
  const area = names.find((l) => l.startsWith('area/'));
  const feat = names.find((l) => l.startsWith('feat/'));
  const triage = names.includes('needs-triage');

  const lines = [
    `✅ 피드백을 등록했어요! (#${issue.number})`,
    `> ${result.summary || issue.title}`,
    '',
    `💡 유형 · ${FEEDBACK_TYPE_KO[result.feedbackType] || result.feedbackType || '미정'}`,
    `🗂 영역 · ${AREA_KO[area] || area || '미정'}${feat ? ` / ${FEAT_KO[feat] || feat}` : ''}`,
    '',
    `🔗 ${issue.html_url}`,
    '',
    triage
      ? '소중한 의견 감사합니다 🙏 일부는 제가 추정으로 채웠으니 한 번 확인해주세요.'
      : '소중한 의견 감사합니다 🙏 검토 후 반영을 고려할게요.',
  ];
  return lines.join('\n');
}

export function dupMessage(dup) {
  return [
    `🔎 이미 등록된 제보 같아요 (#${dup.number})`,
    '같은 내용으로 보이는 이슈가 있어서 새로 만들지 않았어요.',
    `🔗 ${dup.html_url}`,
    '',
    '혹시 다른 문제라면, 한 번 더 자세히 적어주시면 새로 등록해드릴게요!',
  ].join('\n');
}

// 되묻기 안내 (필수 정보가 빠졌을 때)
export function askMessage(questions) {
  const qs = (questions || []).slice(0, 2).map((q) => `• ${q}`).join('\n');
  return `조금만 더 알려주시면 바로 정리해드릴게요 🙏\n${qs}`;
}

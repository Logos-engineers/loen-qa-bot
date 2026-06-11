// 스레드 상태 영속화 — 봇 재시작 시 진행 중 맥락 + done 표시 보존.
// 저빈도라 JSON 파일로 충분. 원자적(tmp→rename) 저장으로 크래시 중 손상 방지.
import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const FILE = join(DATA_DIR, 'threads.json');

// queue(Promise)는 직렬화 불가 → 제외하고 복원 시 새로 부여
export async function loadThreads() {
  try {
    const obj = JSON.parse(await readFile(FILE, 'utf8'));
    const map = new Map();
    for (const [id, s] of Object.entries(obj)) {
      map.set(id, {
        rounds: s.rounds || 0,
        transcript: s.transcript || [],
        attachments: s.attachments || [],
        status: s.status || 'open',
        queue: Promise.resolve(),
      });
    }
    console.log(`✓ 스레드 상태 복원: ${map.size}건`);
    return map;
  } catch {
    return new Map(); // 파일 없음/손상 → 빈 상태로 시작
  }
}

let saving = null;
let pending = false;
export function scheduleSave(map) {
  if (saving) {
    pending = true; // 진행 중이면 한 번 더 예약(디바운스)
    return;
  }
  saving = doSave(map)
    .catch((e) => console.error('상태 저장 실패:', e.message))
    .finally(() => {
      saving = null;
      if (pending) {
        pending = false;
        scheduleSave(map);
      }
    });
}

async function doSave(map) {
  const obj = {};
  for (const [id, s] of map.entries()) {
    // done은 경량화(맥락 불필요), open은 맥락 보존
    obj[id] =
      s.status === 'done'
        ? { status: 'done', rounds: s.rounds }
        : { status: s.status, rounds: s.rounds, transcript: s.transcript, attachments: s.attachments };
  }
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(obj));
  await rename(tmp, FILE); // 원자적 교체
}

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

const r2 = config.r2;
let client;
function s3() {
  client ||= new S3Client({
    region: 'auto',
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
  });
  return client;
}

const TYPE_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
};

function guessType(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  return TYPE_BY_EXT[ext] || 'application/octet-stream';
}

// 디스코드 첨부(만료되는 서명 URL)를 R2로 재업로드하고 영구 public URL 반환.
// R2 미설정/실패 시 원본 URL로 fallback (이슈는 항상 생성되게).
// 안전: prefix(qa/)·고유 키로 프로덕션 객체와 충돌·덮어쓰기 없음. 업로드만 수행.
const MAX_BYTES = 15 * 1024 * 1024; // 15MB 초과 첨부는 메모리 보호 위해 R2 스킵(원본 URL 유지)

export async function rehostAttachment({ url, name, threadId, messageId }) {
  if (!r2.enabled) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`다운로드 실패 ${res.status}`);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared && declared > MAX_BYTES) {
      console.warn(`첨부 용량 초과(${declared}B), R2 스킵: ${name}`);
      return url;
    }
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > MAX_BYTES) {
      console.warn(`첨부 용량 초과(${body.length}B), R2 스킵: ${name}`);
      return url;
    }
    const contentType = res.headers.get('content-type') || guessType(name);
    const safeName = (name || 'file').replace(/[^\w.\-]/g, '_');
    const key = `${r2.prefix}${threadId}/${messageId}-${safeName}`;
    await s3().send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return `${r2.publicUrl.replace(/\/$/, '')}/${key}`;
  } catch (e) {
    console.warn('R2 재업로드 실패, 원본 URL 사용:', e.message);
    return url;
  }
}

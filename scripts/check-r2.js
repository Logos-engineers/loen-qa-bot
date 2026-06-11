// R2 연결·격리·공개접근 점검: qa/_selftest/ 에 작은 파일 업로드 → public URL 확인
// 실행: node scripts/check-r2.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../src/config.js';

const r2 = config.r2;
console.log(`R2 enabled=${r2.enabled} · bucket=${r2.bucket} · prefix="${r2.prefix}"`);
if (!r2.enabled) {
  console.log('✗ R2 미설정 (.env 확인)');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
});

const key = `${r2.prefix}_selftest/ping.txt`;
await client.send(
  new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: 'qa-bot r2 selftest', ContentType: 'text/plain' }),
);
const url = `${r2.publicUrl.replace(/\/$/, '')}/${key}`;
console.log(`① 업로드 OK → ${url}`);

const res = await fetch(url);
console.log(`② public GET: HTTP ${res.status} ${res.status === 200 ? '✓ 공개 접근 가능' : '✗ 공개 안 됨(버킷 public 설정 확인)'}`);
if (res.status === 200) console.log('   내용:', (await res.text()).slice(0, 40));
process.exit(0);

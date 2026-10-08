// One-time copy of existing uploaded images (backend/uploads/**) into the S3
// uploads bucket, keeping the same paths, so the "/uploads/…" URLs already in
// the database resolve in production. Files already in S3 are skipped.
//
// Usage (needs AWS credentials with s3:PutObject / s3:ListBucket on the bucket):
//   S3_BUCKET=pos-system-uploads node scripts/upload-images-to-s3.js
//   (PowerShell: $env:S3_BUCKET='pos-system-uploads'; node scripts/upload-images-to-s3.js)
const fs = require('fs');
const path = require('path');

if (!process.env.S3_BUCKET) {
  console.error('Set S3_BUCKET to the uploads bucket name first.');
  process.exit(1);
}
const { BUCKET, REGION, KEY_PREFIX, LOCAL_ROOT, contentTypeFor } = require('../storage');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const client = new S3Client({ region: REGION });

function listLocalFiles(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listLocalFiles(path.join(dir, entry.name), rel) : [rel];
  });
}

async function listBucketKeys() {
  const keys = new Set();
  let token;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: KEY_PREFIX, ContinuationToken: token }));
    (page.Contents || []).forEach(o => keys.add(o.Key));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

(async () => {
  const files = listLocalFiles(LOCAL_ROOT);
  console.log(`Bucket: ${BUCKET} (${REGION}) — ${files.length} local file(s) under ${LOCAL_ROOT}`);
  const existing = await listBucketKeys();
  let uploaded = 0;
  let skipped = 0;
  for (const rel of files) {
    const key = KEY_PREFIX + rel;
    if (existing.has(key)) { skipped += 1; continue; }
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fs.readFileSync(path.join(LOCAL_ROOT, rel)),
      ContentType: contentTypeFor(rel),
    }));
    uploaded += 1;
    console.log(`  ↑ ${key}`);
  }
  console.log(`Done: ${uploaded} uploaded, ${skipped} already in S3.`);
})().catch(err => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});

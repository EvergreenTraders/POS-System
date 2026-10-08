// ============================================================
// Uploaded image storage.
//
// Production (S3_BUCKET set): files live in S3 under "uploads/…", so they
// survive Elastic Beanstalk deploys (which replace the app folder) and are
// shared by every instance. The EB instance role supplies the credentials.
// Development (no S3_BUCKET): files live in backend/uploads/ as before.
//
// Either way the stored URL is the same server-relative "/uploads/<folder>/<file>"
// and GET /uploads/… serves it (local disk first, then S3), so image URLs
// already saved in the database keep working.
// ============================================================
const fs = require('fs');
const path = require('path');
const express = require('express');

const BUCKET = process.env.S3_BUCKET || null;
const REGION = process.env.S3_REGION || process.env.AWS_REGION || 'ca-central-1';
const KEY_PREFIX = 'uploads/';
const LOCAL_ROOT = path.join(__dirname, 'uploads');

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

let s3Client = null;
let s3Commands = null;
function s3() {
  if (!s3Client) {
    s3Commands = require('@aws-sdk/client-s3');
    s3Client = new s3Commands.S3Client({ region: REGION });
  }
  return { client: s3Client, cmd: s3Commands };
}

// "jewelry/item-1.jpg" or "/uploads/jewelry/item-1.jpg" → "jewelry/item-1.jpg".
// Anything that could escape the uploads folder is rejected.
function toRelativePath(urlOrPath) {
  const rel = String(urlOrPath || '').replace(/^\/?uploads\//, '').replace(/^\/+/, '');
  const normalized = path.posix.normalize(rel);
  if (!rel || normalized.startsWith('..') || normalized.includes('/../') || path.isAbsolute(normalized)) {
    throw new Error(`Invalid upload path: ${urlOrPath}`);
  }
  return normalized;
}

const contentTypeFor = (rel) => CONTENT_TYPES[path.extname(rel).toLowerCase()] || 'application/octet-stream';

// Saves a file and returns its URL ("/uploads/<relPath>").
async function saveUpload(relPath, buffer, contentType) {
  const rel = toRelativePath(relPath);
  if (BUCKET) {
    const { client, cmd } = s3();
    await client.send(new cmd.PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY_PREFIX + rel,
      Body: buffer,
      ContentType: contentType || contentTypeFor(rel),
    }));
  } else {
    const target = path.join(LOCAL_ROOT, rel);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, buffer);
  }
  return `/uploads/${rel}`;
}

// Deletes a stored file; a missing file is not an error.
async function deleteUpload(urlOrPath) {
  const rel = toRelativePath(urlOrPath);
  if (BUCKET) {
    const { client, cmd } = s3();
    await client.send(new cmd.DeleteObjectCommand({ Bucket: BUCKET, Key: KEY_PREFIX + rel }));
  }
  // Also remove a local copy (dev, or files bundled before S3 was enabled).
  await fs.promises.unlink(path.join(LOCAL_ROOT, rel)).catch(() => {});
}

// GET /uploads/… — local disk first (development), then S3 (production).
function serveUploads(app) {
  app.use('/uploads', express.static(LOCAL_ROOT));
  if (!BUCKET) return;
  app.get('/uploads/*', async (req, res) => {
    let rel;
    try {
      rel = toRelativePath(decodeURIComponent(req.params[0]));
    } catch (e) {
      return res.status(400).end();
    }
    try {
      const { client, cmd } = s3();
      const obj = await client.send(new cmd.GetObjectCommand({ Bucket: BUCKET, Key: KEY_PREFIX + rel }));
      res.set('Content-Type', obj.ContentType || contentTypeFor(rel));
      if (obj.ContentLength !== undefined) res.set('Content-Length', String(obj.ContentLength));
      if (obj.ETag) res.set('ETag', obj.ETag);
      // Some names are reused (jewelry/hardgoods "ITEM-1.jpg" when an image is
      // replaced), so cache briefly rather than forever.
      res.set('Cache-Control', 'public, max-age=3600');
      obj.Body.on('error', () => res.destroy());
      obj.Body.pipe(res);
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return res.status(404).end();
      console.error('Error reading upload from S3:', rel, err.message);
      res.status(502).end();
    }
  });
}

module.exports = { saveUpload, deleteUpload, serveUploads, toRelativePath, contentTypeFor, BUCKET, REGION, KEY_PREFIX, LOCAL_ROOT };

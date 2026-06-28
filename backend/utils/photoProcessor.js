const sharp = require('sharp');
const crypto = require('crypto');

/**
 * Process photo: compress with sharp, generate thumbnail, compute SHA256 hash.
 * Returns { buffer, thumbnailBuffer, hash, mimeType }
 */
async function processPhoto(buffer, mimeType) {
  // Compute SHA256 hash of original buffer
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Compress image (resize to max 1200px, JPEG 80%)
  const compressed = await sharp(buffer)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Generate thumbnail (200x200)
  const thumbnail = await sharp(buffer)
    .rotate()
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 60 })
    .toBuffer();

  return {
    buffer: compressed,
    thumbnailBuffer: thumbnail,
    hash,
    mimeType: 'image/jpeg',
  };
}

/**
 * Mock face detection (Google Vision API fallback).
 * In production, replace with actual Google Vision API call.
 */
async function detectFace(buffer) {
  // Mock implementation - always returns true
  // In production, call Google Vision API:
  // POST https://vision.googleapis.com/v1/images:annotate
  // with feature type: FACE_DETECTION
  return {
    hasFace: true,
    confidence: 0.95,
    faceCount: 1,
  };
}

module.exports = { processPhoto, detectFace };

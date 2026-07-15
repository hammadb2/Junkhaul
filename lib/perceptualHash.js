// ============================================================
// PERCEPTUAL HASH (dHash — difference hash)
//
// Computes a 128-bit perceptual hash from an image buffer.
// dHash is simple, fast, and good at detecting "same scene,
// slightly different" photos (e.g. a customer retaking a photo
// from a slightly different angle, or adding one item to a pile).
//
// dHash works by:
//   1. Resize image to 17x16 (one extra column per row)
//   2. Convert to grayscale
//   3. Compare adjacent pixels: if left > right, bit=1, else bit=0
//   4. Pack the 256 bits (16 rows x 16 comparisons) into a hex string
// ============================================================

import sharp from 'sharp';

// Compute a dHash (difference hash) of an image.
// Returns a 16-byte (128-bit) hash as a 32-char hex string.
export async function computeDHash(imageBuffer) {
  // Resize to 17x16 grayscale, get raw pixel data.
  // 17 columns per 16 rows → 16 horizontal differences per row → 256 bits total.
  const { data } = await sharp(imageBuffer)
    .resize(17, 16, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // For each row, compare adjacent pixels (left vs right).
  let bits = '';
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const left = data[row * 17 + col];
      const right = data[row * 17 + col + 1];
      bits += left > right ? '1' : '0';
    }
  }

  // Convert the 256-bit binary string into a 64-char hex string.
  // (We keep the full hex rather than truncating so the Hamming
  // distance math stays exact over all 256 bits.)
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

// Compute Hamming distance between two hex hashes.
// Returns Infinity if the hashes are missing or mismatched in length.
export function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    let xor = n1 ^ n2;
    while (xor) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

// Similarity score: 0 to 1, where 1 = identical, 0 = completely different.
// For our 256-bit dHash, distance of 0 = identical, ~128 = unrelated.
export function similarityScore(hash1, hash2) {
  const dist = hammingDistance(hash1, hash2);
  const maxDist = 256; // 256-bit hash (16x16 comparisons)
  return Math.max(0, 1 - dist / maxDist);
}

// Threshold: above this similarity, we consider photos "same scene,
// different shot" and run the diff-based analysis instead of a full
// re-analysis. 0.75 means at most ~25% of bits differ.
export const SIMILARITY_THRESHOLD = 0.75;

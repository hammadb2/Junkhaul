// ============================================================
// Barcode scanner — reads PDF417 from license back using
// the native BarcodeDetector API (Chrome/Edge/Safari 17+)
// with @zxing/library fallback. Parses AAMVA data.
// All client-side, no server.
// ============================================================

import { BrowserMultiFormatReader } from '@zxing/library';
import { parse as parseAAMVA } from 'aamva-parser';

/**
 * Try to decode a PDF417 barcode from an image element/canvas/video.
 * Returns the raw barcode string or null.
 */
export async function decodeBarcode(imageSource) {
  // 1. Try native BarcodeDetector (fastest, best on mobile)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['pdf417', 'qr_code', 'code_128', 'code_39'],
      });
      const results = await detector.detect(imageSource);
      if (results && results.length > 0) {
        return results[0].rawValue;
      }
    } catch (e) {
      // Fall through to ZXing
    }
  }

  // 2. Fallback: ZXing library
  try {
    const reader = new BrowserMultiFormatReader();
    // imageSource can be a canvas, img, or video element
    const result = await reader.decodeFromImageElement(imageSource);
    if (result && result.getText) {
      return result.getText();
    }
  } catch (e) {
    // No barcode found
  }

  return null;
}

/**
 * Decode + parse AAMVA barcode from a canvas/image.
 * Returns { raw, parsed } or { raw: null, parsed: null }.
 */
export async function scanLicenseBarcode(imageSource) {
  const raw = await decodeBarcode(imageSource);
  if (!raw) return { raw: null, parsed: null };

  try {
    const parsed = parseAAMVA(raw);
    return { raw, parsed };
  } catch (e) {
    return { raw, parsed: null };
  }
}

/**
 * Convert a parsed AAMVA license to a plain JSON object
 * safe for API storage.
 */
export function licenseToJSON(parsed) {
  if (!parsed) return null;
  return {
    firstName: parsed.firstName || null,
    lastName: parsed.lastName || null,
    middleName: parsed.middleName || null,
    dateOfBirth: parsed.dateOfBirth ? parsed.dateOfBirth.toISOString().split('T')[0] : null,
    expirationDate: parsed.expirationDate ? parsed.expirationDate.toISOString().split('T')[0] : null,
    issueDate: parsed.issueDate ? parsed.issueDate.toISOString().split('T')[0] : null,
    gender: parsed.gender || null,
    driversLicenseId: parsed.driversLicenseId || null,
    documentId: parsed.documentId || null,
    streetAddress: parsed.streetAddress || null,
    city: parsed.city || null,
    state: parsed.state || null,
    postalCode: parsed.postalCode || null,
    country: parsed.country || null,
    isExpired: typeof parsed.isExpired === 'function' ? parsed.isExpired() : parsed.expired,
    version: parsed.version || null,
    pdf417: parsed.pdf417 || null,
  };
}

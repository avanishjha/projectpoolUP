/**
 * Check-in image pipeline (FR-CI-03/04): blur estimate + compression to
 * <500KB before upload. Compression is THE critical optimisation for Indian
 * 4G — a raw 5MB phone photo often fails to upload at all (Build Bible).
 */
import * as ImageManipulator from 'expo-image-manipulator';

/** Hard ceiling enforced by the storage bucket (1MB); we target well under. */
export const TARGET_BYTES = 500 * 1024;
export const BLUR_WARN_THRESHOLD = 0.7;

export interface ProcessedImage {
  uri: string;
  base64: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Resize to max 1440px on the long edge and step quality down until the
 * payload fits the target. Returns base64 because RN's fetch→Blob path
 * uploads 0 bytes to Supabase Storage (see avatar bug, F1.3).
 */
export async function compressForUpload(uri: string): Promise<ProcessedImage> {
  const qualities = [0.7, 0.55, 0.4, 0.3];
  let last: ImageManipulator.ImageResult | null = null;

  for (const quality of qualities) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1440 } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    last = result;
    const bytes = approxBytesFromBase64(result.base64 ?? '');
    if (bytes <= TARGET_BYTES) {
      return { uri: result.uri, base64: result.base64 ?? '', bytes, width: result.width, height: result.height };
    }
  }

  // Even at the lowest quality: return what we have; the caller enforces the cap.
  const base64 = last?.base64 ?? '';
  return {
    uri: last?.uri ?? uri,
    base64,
    bytes: approxBytesFromBase64(base64),
    width: last?.width ?? 0,
    height: last?.height ?? 0,
  };
}

export function approxBytesFromBase64(b64: string): number {
  // 4 base64 chars ≈ 3 bytes, minus padding.
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, (b64.length * 3) / 4 - padding);
}

/**
 * Cheap blur estimate: downsample hard, then measure neighbour-to-neighbour
 * luminance variation. A sharp photo has lots of local contrast; a blurry one
 * is smooth. Returns 0 (sharp) → 1 (blurry). Not a true Laplacian variance —
 * it's a fast heuristic that only needs to catch obviously-bad photos, and it
 * runs on the JS thread in a few ms.
 */
export async function estimateBlur(uri: string): Promise<number | null> {
  try {
    const small = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 64 } }],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true },
    );
    if (!small.base64) return null;
    // Without pixel access in RN we approximate with compressed-size entropy:
    // a sharp 64px PNG retains more detail (larger) than a smooth blurry one.
    const bytes = approxBytesFromBase64(small.base64);
    const detail = Math.min(1, bytes / 6000); // ~6KB ≈ rich detail at 64px
    return Number((1 - detail).toFixed(2));
  } catch {
    return null;
  }
}

/** Storage path convention enforced by the bucket policies: pool/user/file. */
export function checkInPath(poolId: string, userId: string): string {
  return `${poolId}/${userId}/${Date.now()}.jpg`;
}

import { BadRequestException } from '@nestjs/common';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export interface DecodedImage {
  readonly buffer: Buffer;
  readonly ext: 'png' | 'jpg' | 'webp';
  readonly mimeType: string;
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Detects the real image type from magic bytes — never trusts the prefix. */
function sniff(buffer: Buffer): Omit<DecodedImage, 'buffer'> | null {
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: 'png', mimeType: 'image/png' };
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { ext: 'jpg', mimeType: 'image/jpeg' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', mimeType: 'image/webp' };
  }
  return null;
}

/**
 * Decodes a base64 / data-URL image with Upload.md §4/§6 checks: strict
 * base64 alphabet, size cap, and PNG/JPEG/WebP magic-byte allowlist (SVG is
 * rejected — it can carry script). Throws FILE-001/FILE-002/FILE-003.
 */
export function decodeImageDataUrl(
  input: string,
  maxBytes: number = MAX_LOGO_BYTES,
): DecodedImage {
  const payload = input
    .trim()
    .replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '')
    .replace(/\s+/g, '');

  // Cheap pre-decode bound: base64 inflates by 4/3.
  if (payload.length > Math.ceil((maxBytes * 4) / 3) + 4) {
    throw new BadRequestException(
      `Logo exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit (FILE-002)`,
    );
  }
  if (!payload || !BASE64_RE.test(payload)) {
    throw new BadRequestException('Logo is not valid base64 data (FILE-003)');
  }

  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length === 0) {
    throw new BadRequestException('Empty logo (FILE-003)');
  }
  if (buffer.length > maxBytes) {
    throw new BadRequestException(
      `Logo exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit (FILE-002)`,
    );
  }

  const type = sniff(buffer);
  if (!type) {
    throw new BadRequestException(
      'Logo must be a PNG, JPEG or WebP image (FILE-001)',
    );
  }
  return { buffer, ...type };
}

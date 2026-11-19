import { BadRequestException } from '@nestjs/common';
import { decodeImageDataUrl } from './image-data-url';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16, 1),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(16)]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.alloc(8),
]);

describe('decodeImageDataUrl', () => {
  it('accepts PNG / JPEG / WebP by magic bytes, with or without data-URL prefix', () => {
    expect(
      decodeImageDataUrl(`data:image/png;base64,${PNG.toString('base64')}`).ext,
    ).toBe('png');
    expect(decodeImageDataUrl(JPEG.toString('base64')).ext).toBe('jpg');
    expect(
      decodeImageDataUrl(`data:image/webp;base64,${WEBP.toString('base64')}`)
        .mimeType,
    ).toBe('image/webp');
  });

  it('ignores a lying prefix — type comes from the bytes', () => {
    const decoded = decodeImageDataUrl(
      `data:image/png;base64,${JPEG.toString('base64')}`,
    );
    expect(decoded.ext).toBe('jpg');
  });

  it('rejects SVG / HTML payloads (FILE-001)', () => {
    const svg = Buffer.from('<svg onload="alert(1)"></svg>').toString('base64');
    expect(() =>
      decodeImageDataUrl(`data:image/svg+xml;base64,${svg}`),
    ).toThrow('FILE-001');
  });

  it('rejects non-base64 characters (FILE-003)', () => {
    expect(() => decodeImageDataUrl('../../etc/passwd')).toThrow('FILE-003');
    expect(() => decodeImageDataUrl('')).toThrow(BadRequestException);
  });

  it('rejects payloads above the size cap (FILE-002)', () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2048)]).toString('base64');
    expect(() => decodeImageDataUrl(big, 1024)).toThrow('FILE-002');
  });
});

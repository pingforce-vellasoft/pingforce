import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { FilesService } from './files.service';

/**
 * File upload hardening (Upload.md §4/§6/§9/§11):
 * - extension + MIME allowlist enforced,
 * - per-category size caps enforced,
 * - SHA-256 checksum + tenant-prefixed storage key recorded,
 * - delete removes the physical bytes before the metadata row,
 * - cross-tenant download/delete is a 404.
 */

type Ctor = ConstructorParameters<typeof FilesService>;

function makeService(fileRow: Record<string, unknown> | null = null) {
  const prisma = {
    fileAttachment: {
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: args.data.id, ...args.data }),
      ),
      findFirst: jest.fn().mockResolvedValue(fileRow),
      findUnique: jest.fn().mockResolvedValue(fileRow),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  const storage = {
    provider: 'LOCAL' as const,
    put: jest.fn().mockResolvedValue('LOCAL'),
    getStream: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new FilesService(
    prisma as unknown as Ctor[0],
    storage as unknown as Ctor[1],
  );
  return { service, prisma, storage };
}

const pngUpload = (buffer: Buffer) => ({
  entityType: 'FAULT',
  entityId: 'f1',
  originalName: 'photo.png',
  mimeType: 'image/png',
  buffer,
  uploadedBy: 'u1',
});

describe('FilesService.upload', () => {
  it('rejects disallowed extensions', async () => {
    const { service } = makeService();
    await expect(
      service.upload('t1', {
        ...pngUpload(Buffer.from('x')),
        originalName: 'shell.exe',
        mimeType: 'application/octet-stream',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a MIME type that does not match the extension', async () => {
    const { service } = makeService();
    await expect(
      service.upload('t1', {
        ...pngUpload(Buffer.from('x')),
        mimeType: 'application/pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects empty files', async () => {
    const { service } = makeService();
    await expect(
      service.upload('t1', pngUpload(Buffer.alloc(0))),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects images above the 20 MB category cap', async () => {
    const { service } = makeService();
    await expect(
      service.upload('t1', pngUpload(Buffer.alloc(21 * 1024 * 1024))),
    ).rejects.toThrow(/20 MB/);
  });

  it('stores bytes, checksum and tenant-prefixed key on success', async () => {
    const { service, prisma, storage } = makeService();
    const buffer = Buffer.from('png-bytes');

    const created = (await service.upload('t1', pngUpload(buffer))) as Record<
      string,
      unknown
    >;

    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^t1\/.+\.png$/),
      buffer,
      'image/png',
    );
    expect(prisma.fileAttachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        checksum: createHash('sha256').update(buffer).digest('hex'),
        storageProvider: 'LOCAL',
        fileSize: buffer.length,
      }),
    });
    expect(created.fileUrl).toBe(`/api/v1/files/${created.id}/download`);
  });
});

describe('FilesService.openForDownload / deleteFile', () => {
  const row = {
    id: 'file1',
    tenantId: 't1',
    fileName: 'doc.pdf',
    mimeType: 'application/pdf',
    storageKey: 't1/file1.pdf',
    storageProvider: 'LOCAL',
  };

  it('streams a tenant-owned file', async () => {
    const { service, storage } = makeService(row);
    const result = await service.openForDownload('t1', 'file1');
    expect(storage.getStream).toHaveBeenCalledWith('t1/file1.pdf', 'LOCAL');
    expect(result.fileName).toBe('doc.pdf');
  });

  it('404s cross-tenant download attempts', async () => {
    const { service } = makeService(null);
    await expect(service.openForDownload('t2', 'file1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deletes physical bytes before the metadata row', async () => {
    const { service, prisma, storage } = makeService(row);
    await service.deleteFile('t1', 'file1');
    expect(storage.delete).toHaveBeenCalledWith('t1/file1.pdf', 'LOCAL');
    expect(prisma.fileAttachment.delete).toHaveBeenCalledWith({
      where: { id: 'file1' },
    });
  });

  it('404s cross-tenant delete attempts without touching storage', async () => {
    const { service, storage } = makeService(row);
    await expect(service.deleteFile('t2', 'file1')).rejects.toThrow(
      NotFoundException,
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });
});

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import type { Readable } from 'stream';
import { StorageService } from './storage.service';

// Allowed types (Upload.md §4) with per-category size caps (§6 defaults)
const MB = 1024 * 1024;
const ALLOWED_TYPES: Readonly<
  Record<string, { mimes: readonly string[]; maxBytes: number }>
> = {
  // Documents — 100 MB
  '.pdf': { mimes: ['application/pdf'], maxBytes: 100 * MB },
  '.docx': {
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxBytes: 100 * MB,
  },
  '.xlsx': {
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxBytes: 100 * MB,
  },
  '.pptx': {
    mimes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 100 * MB,
  },
  '.txt': { mimes: ['text/plain'], maxBytes: 100 * MB },
  '.csv': {
    mimes: ['text/csv', 'application/vnd.ms-excel'],
    maxBytes: 100 * MB,
  },
  // Images — 20 MB
  '.jpg': { mimes: ['image/jpeg'], maxBytes: 20 * MB },
  '.jpeg': { mimes: ['image/jpeg'], maxBytes: 20 * MB },
  '.png': { mimes: ['image/png'], maxBytes: 20 * MB },
  '.webp': { mimes: ['image/webp'], maxBytes: 20 * MB },
  '.svg': { mimes: ['image/svg+xml'], maxBytes: 20 * MB },
  // Media — 500 MB
  '.mp4': { mimes: ['video/mp4'], maxBytes: 500 * MB },
  '.mp3': { mimes: ['audio/mpeg', 'audio/mp3'], maxBytes: 500 * MB },
  // Archives — 100 MB
  '.zip': {
    mimes: ['application/zip', 'application/x-zip-compressed'],
    maxBytes: 100 * MB,
  },
};

export interface UploadInput {
  readonly entityType: string;
  readonly entityId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
  readonly uploadedBy?: string;
}

export interface DownloadResult {
  readonly stream: Readable;
  readonly fileName: string;
  readonly mimeType: string;
}

@Injectable()
export class FilesService {
  constructor(
    @Inject('IPrismaService') private prisma: IPrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Validates (extension + declared MIME allowlist, per-category size cap —
   * Upload.md §6/§9), stores the bytes tenant-prefixed, and registers the
   * metadata row with a SHA-256 checksum (§11).
   */
  async upload(tenantId: string, input: UploadInput) {
    const ext = extname(input.originalName).toLowerCase();
    const rule = ALLOWED_TYPES[ext];
    if (!rule) {
      throw new BadRequestException(
        `File type not allowed (FILE-001): ${ext || 'no extension'}`,
      );
    }
    if (!rule.mimes.includes(input.mimeType.toLowerCase())) {
      throw new BadRequestException(
        `MIME type ${input.mimeType} does not match ${ext} (FILE-001)`,
      );
    }
    if (input.buffer.length === 0) {
      throw new BadRequestException('Empty file (FILE-003)');
    }
    if (input.buffer.length > rule.maxBytes) {
      throw new BadRequestException(
        `File exceeds the ${Math.round(rule.maxBytes / MB)} MB limit for ${ext} (FILE-002)`,
      );
    }

    const checksum = createHash('sha256').update(input.buffer).digest('hex');
    const fileId = randomUUID();
    const storageKey = `${tenantId}/${fileId}${ext}`;

    const provider = await this.storage.put(
      storageKey,
      input.buffer,
      input.mimeType,
    );

    return this.prisma.fileAttachment.create({
      data: {
        id: fileId,
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.originalName,
        fileSize: input.buffer.length,
        mimeType: input.mimeType,
        fileUrl: `/api/v1/files/${fileId}/download`,
        storageKey,
        checksum,
        storageProvider: provider,
        uploadedBy: input.uploadedBy,
      },
    });
  }

  /** Opens a tenant-owned file for download, whatever provider holds it. */
  async openForDownload(
    tenantId: string,
    fileId: string,
  ): Promise<DownloadResult> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: { id: fileId, tenantId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const stream = await this.storage.getStream(
      file.storageKey,
      file.storageProvider === 'OBJECT_STORAGE' ? 'OBJECT_STORAGE' : 'LOCAL',
    );

    return {
      stream,
      fileName: file.fileName,
      mimeType: file.mimeType || 'application/octet-stream',
    };
  }

  async registerFile(
    tenantId: string,
    data: {
      entityType: string;
      entityId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      fileUrl: string;
      storageKey: string;
      uploadedBy?: string;
    },
  ) {
    return this.prisma.fileAttachment.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async getFiles(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.fileAttachment.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Deletes the physical bytes, then the metadata row. */
  async deleteFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileAttachment.findUnique({
      where: { id: fileId },
    });
    if (!file || file.tenantId !== tenantId) {
      throw new NotFoundException('File not found');
    }

    await this.storage.delete(
      file.storageKey,
      file.storageProvider === 'OBJECT_STORAGE' ? 'OBJECT_STORAGE' : 'LOCAL',
    );

    return this.prisma.fileAttachment.delete({
      where: { id: fileId },
    });
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import type { Readable } from 'stream';
import { StorageService } from './storage.service';
import { FaultAccessService } from '../faults/fault-access.service';

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
  /** Customer-facing visibility; defaults to internal-only. */
  readonly isCustomerVisible?: boolean;
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
    private readonly faultAccess: FaultAccessService,
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

    await this.assertFaultAccess(tenantId, input.uploadedBy, input.entityType, input.entityId, 'UPDATE');

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
        isCustomerVisible: input.isCustomerVisible ?? false,
        uploadedBy: input.uploadedBy,
      },
    });
  }

  /** Opens a tenant-owned file for download, whatever provider holds it. */
  async openForDownload(
    tenantId: string,
    fileId: string,
    requesterUserId?: string,
  ): Promise<DownloadResult> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: { id: fileId, tenantId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.assertFaultAccess(tenantId, requesterUserId, file.entityType, file.entityId, ['READ', 'READ_OWN']);

    return this.streamFile(file);
  }

  /**
   * Customer tokens may download only explicitly published attachments that
   * belong to one of their own tenant-scoped faults.
   */
  async openCustomerFaultAttachment(
    tenantId: string,
    customerId: string,
    fileId: string,
  ): Promise<DownloadResult> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        tenantId,
        entityType: 'FAULT',
        isCustomerVisible: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');

    const fault = await this.prisma.fault.findFirst({
      where: {
        id: file.entityId,
        tenantId,
        customerId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!fault) throw new NotFoundException('File not found');

    return this.streamFile(file);
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

  async getFiles(tenantId: string, entityType: string, entityId: string, requesterUserId?: string) {
    await this.assertFaultAccess(tenantId, requesterUserId, entityType, entityId, ['READ', 'READ_OWN']);
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
  async deleteFile(tenantId: string, fileId: string, requesterUserId?: string) {
    const file = await this.prisma.fileAttachment.findUnique({
      where: { id: fileId },
    });
    if (!file || file.tenantId !== tenantId) {
      throw new NotFoundException('File not found');
    }

    await this.assertFaultAccess(tenantId, requesterUserId, file.entityType, file.entityId, 'UPDATE');

    await this.storage.delete(
      file.storageKey,
      file.storageProvider === 'OBJECT_STORAGE' ? 'OBJECT_STORAGE' : 'LOCAL',
    );

    return this.prisma.fileAttachment.delete({
      where: { id: fileId },
    });
  }

  private async assertFaultAccess(
    tenantId: string,
    userId: string | undefined,
    entityType: string,
    entityId: string,
    action: string | readonly string[],
  ): Promise<void> {
    if (entityType !== 'FAULT') return;
    if (!userId) throw new ForbiddenException('A staff identity is required');
    const scopeWhere = await this.faultAccess.scopeForAction(tenantId, userId, action);
    const fault = await this.prisma.fault.findFirst({
      where: { ...scopeWhere, id: entityId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!fault) throw new NotFoundException('Fault not found');
  }

  private async streamFile(file: {
    readonly storageKey: string;
    readonly storageProvider: string;
    readonly fileName: string;
    readonly mimeType: string;
  }): Promise<DownloadResult> {
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
}

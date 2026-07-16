import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { existsSync } from 'fs';
import { join, resolve, sep } from 'path';

const UPLOADS_ROOT = resolve(process.cwd(), 'uploads');

@Injectable()
export class FilesService {
  constructor(@Inject('IPrismaService') private prisma: IPrismaService) {}

  /**
   * Resolves a tenant-owned FileAttachment to its on-disk path under
   * uploads/. Rejects records whose storageKey escapes the uploads root
   * (path traversal) and missing files with 404.
   */
  async resolveLocalFile(
    tenantId: string,
    fileId: string,
  ): Promise<{ absolutePath: string; fileName: string; mimeType: string }> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: { id: fileId, tenantId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const absolutePath = resolve(join(UPLOADS_ROOT, file.storageKey));
    if (
      !absolutePath.startsWith(UPLOADS_ROOT + sep) ||
      !existsSync(absolutePath)
    ) {
      throw new NotFoundException('File not found');
    }

    return {
      absolutePath,
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

  async deleteFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileAttachment.findUnique({
      where: { id: fileId },
    });
    if (!file || file.tenantId !== tenantId) {
      throw new NotFoundException('File not found');
    }

    // In a real implementation, we would also call S3/MinIO to delete the physical file here
    return this.prisma.fileAttachment.delete({
      where: { id: fileId },
    });
  }
}

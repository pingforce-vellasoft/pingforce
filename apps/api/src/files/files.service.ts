import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class FilesService {
  constructor(
    @Inject('IPrismaService') private prisma: IPrismaService
  ) {}

  async registerFile(tenantId: string, data: {
    entityType: string;
    entityId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    storageKey: string;
    uploadedBy?: string;
  }) {
    return this.prisma.fileAttachment.create({
      data: {
        tenantId,
        ...data
      }
    });
  }

  async getFiles(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.fileAttachment.findMany({
      where: {
        tenantId,
        entityType,
        entityId
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileAttachment.findUnique({ where: { id: fileId } });
    if (!file || file.tenantId !== tenantId) {
      throw new NotFoundException('File not found');
    }
    
    // In a real implementation, we would also call S3/MinIO to delete the physical file here
    return this.prisma.fileAttachment.delete({
      where: { id: fileId }
    });
  }
}

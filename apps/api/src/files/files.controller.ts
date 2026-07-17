import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';

interface AuthRequest {
  user: { userId: string; tenantId: string; role: string };
}

// Shape multer puts on the request for memory-storage uploads
interface UploadedFileLike {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

/**
 * File upload/download (Upload.md §14). Downloads are streamed through this
 * guarded controller instead of ServeStaticModule (which bypasses Nest
 * guards — security audit B4). Every operation is scoped to the caller's
 * tenant; validation, checksums and physical storage live in FilesService/
 * StorageService.
 */
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // Multer cap slightly above the largest per-category cap so FilesService
  // returns the descriptive FILE-002 error instead of a bare 413.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 501 * 1024 * 1024 } }),
  )
  async upload(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Body() dto: UploadFileDto,
    @UploadedFile() file?: UploadedFileLike,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided (field name: file)');
    }
    return this.filesService.upload(tenantId, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      uploadedBy: req.user.userId,
    });
  }

  @Get()
  async list(
    @CurrentTenant() tenantId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType and entityId are required');
    }
    return this.filesService.getFiles(tenantId, entityType, entityId);
  }

  @Get(':id/download')
  async download(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.filesService.openForDownload(tenantId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    return new StreamableFile(file.stream);
  }

  @Delete(':id')
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.filesService.deleteFile(tenantId, id);
  }
}

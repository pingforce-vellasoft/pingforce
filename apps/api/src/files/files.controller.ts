import {
  Controller,
  Get,
  Param,
  StreamableFile,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { FilesService } from './files.service';

/**
 * File downloads are streamed through this guarded controller instead of
 * ServeStaticModule (which bypasses Nest guards — security audit B4).
 * Access requires a valid JWT and the file must belong to the caller's tenant.
 */
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id/download')
  async download(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.filesService.resolveLocalFile(tenantId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    return new StreamableFile(createReadStream(file.absolutePath));
  }
}

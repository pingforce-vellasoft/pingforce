import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { CreateMasterDataDto } from './dto/create-master-datum.dto';
import { UpdateMasterDataDto } from './dto/update-master-datum.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';

// In a real app, this would be a custom decorator @CurrentUser() extracting from JWT.
// For now, we will extract tenantId from headers for flexibility, or you can wire it to the AuthGuard.

@UseGuards(JwtAuthGuard)
@Controller('v1/master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Post(':type')
  create(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Body() createMasterDataDto: CreateMasterDataDto,
  ) {
    return this.masterDataService.create(tenantId, type, createMasterDataDto);
  }

  @Get(':type')
  findAll(@CurrentTenant() tenantId: string, @Param('type') type: string) {
    return this.masterDataService.findAll(tenantId, type);
  }

  @Get(':type/:id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.masterDataService.findOne(tenantId, type, id);
  }

  @Patch(':type/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() updateMasterDataDto: UpdateMasterDataDto,
  ) {
    return this.masterDataService.update(
      tenantId,
      type,
      id,
      updateMasterDataDto,
    );
  }

  @Delete(':type/:id')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.masterDataService.remove(tenantId, type, id);
  }
}

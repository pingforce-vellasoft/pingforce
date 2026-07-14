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
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentTenant } from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Post(':type')
  @RequirePermission('MASTER_DATA', 'CREATE')
  create(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Body() createMasterDataDto: CreateMasterDataDto,
  ) {
    return this.masterDataService.create(tenantId, type, createMasterDataDto);
  }

  @Get(':type')
  @RequirePermission('MASTER_DATA', 'READ')
  findAll(@CurrentTenant() tenantId: string, @Param('type') type: string) {
    return this.masterDataService.findAll(tenantId, type);
  }

  @Get(':type/:id')
  @RequirePermission('MASTER_DATA', 'READ')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.masterDataService.findOne(tenantId, type, id);
  }

  @Patch(':type/:id')
  @RequirePermission('MASTER_DATA', 'UPDATE')
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
  @RequirePermission('MASTER_DATA', 'DELETE')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.masterDataService.remove(tenantId, type, id);
  }
}

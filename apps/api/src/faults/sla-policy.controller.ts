import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SlaPolicyService } from './sla-policy.service';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard)
@Controller('sla-policies')
export class SlaPolicyController {
  constructor(private readonly slaPolicyService: SlaPolicyService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSlaPolicyDto) {
    return this.slaPolicyService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.slaPolicyService.findAll(
      tenantId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.slaPolicyService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSlaPolicyDto,
  ) {
    return this.slaPolicyService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.slaPolicyService.remove(tenantId, id);
  }
}

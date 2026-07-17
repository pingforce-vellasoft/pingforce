import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortalUserGuard } from '../guards/portal-user.guard';
import { PortalFeatureGuard } from '../guards/portal-feature.guard';
import { PortalFaultsService } from './portal-faults.service';
import {
  PortalCreateFaultDto,
  PortalFaultCommentDto,
  PortalFaultListQueryDto,
  PortalFaultRatingDto,
} from './portal-faults.dto';

@ApiTags('Customer Portal — Faults')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PortalUserGuard, PortalFeatureGuard)
@Controller('portal/faults')
export class PortalFaultsController {
  constructor(private readonly faultsService: PortalFaultsService) {}

  @ApiOperation({ summary: 'Raise a complaint' })
  @Throttle({ burst: { limit: 5, ttl: 60000 }, sustained: { limit: 20, ttl: 60000 } })
  @Post()
  async create(@Request() req: any, @Body() dto: PortalCreateFaultDto) {
    return this.faultsService.create(
      req.user.tenantId,
      req.user.customerId,
      req.user.userId,
      dto,
    );
  }

  @ApiOperation({ summary: 'List own complaints' })
  @Get()
  async list(@Request() req: any, @Query() query: PortalFaultListQueryDto) {
    return this.faultsService.list(
      req.user.tenantId,
      req.user.customerId,
      query,
    );
  }

  @ApiOperation({ summary: 'Complaint detail with customer-visible timeline' })
  @Get(':id')
  async findOne(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.faultsService.findOne(
      req.user.tenantId,
      req.user.customerId,
      id,
    );
  }

  @ApiOperation({ summary: 'Add a comment to an open complaint' })
  @Throttle({ burst: { limit: 10, ttl: 60000 }, sustained: { limit: 30, ttl: 60000 } })
  @Post(':id/comments')
  async comment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PortalFaultCommentDto,
  ) {
    return this.faultsService.comment(
      req.user.tenantId,
      req.user.customerId,
      req.user.userId,
      id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Reopen a resolved complaint (within window)' })
  @Post(':id/reopen')
  async reopen(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PortalFaultCommentDto,
  ) {
    return this.faultsService.reopen(
      req.user.tenantId,
      req.user.customerId,
      req.user.userId,
      id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Rate a resolved/closed complaint (once)' })
  @Post(':id/rating')
  async rate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PortalFaultRatingDto,
  ) {
    return this.faultsService.rate(
      req.user.tenantId,
      req.user.customerId,
      req.user.userId,
      id,
      dto,
    );
  }
}

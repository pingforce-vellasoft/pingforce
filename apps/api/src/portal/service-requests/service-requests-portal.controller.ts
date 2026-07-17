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
import { ServiceRequestsService } from './service-requests.service';
import {
  PortalCreateServiceRequestDto,
  PortalListServiceRequestQueryDto,
} from './dto/service-request.dto';

/**
 * Customer-facing service requests (3.8_CustomerPortal P4, BR-4). All access
 * scoped tenantId + customerId from the JWT.
 */
@ApiTags('Customer Portal — Service Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PortalUserGuard, PortalFeatureGuard)
@Controller('portal/service-requests')
export class ServiceRequestsPortalController {
  constructor(private readonly service: ServiceRequestsService) {}

  @ApiOperation({ summary: 'Submit a service request' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 20, ttl: 60000 },
  })
  @Post()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submit(@Request() req: any, @Body() dto: PortalCreateServiceRequestDto) {
    return this.service.submit(
      req.user.tenantId,
      req.user.customerId,
      req.user.userId,
      dto,
    );
  }

  @ApiOperation({ summary: 'List own service requests' })
  @Get()
  list(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() req: any,
    @Query() query: PortalListServiceRequestQueryDto,
  ) {
    return this.service.listOwn(req.user.tenantId, req.user.customerId, query);
  }

  @ApiOperation({ summary: 'Request detail with customer-visible timeline' })
  @Get(':id')
  findOne(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOwn(req.user.tenantId, req.user.customerId, id);
  }

  @ApiOperation({ summary: 'Cancel an open request' })
  @Post(':id/cancel')
  cancel(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancelOwn(
      req.user.tenantId,
      req.user.customerId,
      req.user.userId,
      id,
    );
  }
}

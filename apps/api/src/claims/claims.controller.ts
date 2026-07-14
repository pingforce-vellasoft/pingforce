import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import {
  CurrentTenant,
  CurrentUserContext,
  CurrentUser,
} from '@pingforce-monorepo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ProcessClaimDto } from './dto/process-claim.dto';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @RequirePermission('CLAIMS', 'CREATE')
  submitClaim(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: CreateClaimDto,
  ) {
    // employeeId is derived from the authenticated user — clients cannot
    // submit claims on behalf of someone else.
    return this.claimsService.submitClaim(tenantId, currentUser.userId, dto);
  }

  @Get('pending')
  @RequirePermission('CLAIMS', 'READ')
  listPendingClaims(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.claimsService.listPendingClaims(
      tenantId,
      currentUser.userId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Post(':id/process')
  @RequirePermission('CLAIMS', 'APPROVE')
  processClaim(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: ProcessClaimDto,
  ) {
    return this.claimsService.processClaim(
      tenantId,
      id,
      currentUser.userId,
      dto.status,
      dto.notes,
    );
  }
}

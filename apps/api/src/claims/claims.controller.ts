import { Controller, Get, Post, Body, Param, Request, Query, UseGuards } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { CurrentTenant, CurrentUserContext, CurrentUser } from '@pingforce-monorepo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  submitClaim(@CurrentTenant() tenantId: string, @Body() data: any) {
    return this.claimsService.submitClaim(tenantId, data);
  }

  @Get('pending')
  listPendingClaims(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.claimsService.listPendingClaims(tenantId, skip ? parseInt(skip, 10) : undefined, take ? parseInt(take, 10) : undefined);
  }

  @Post(':id/process')
  processClaim(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id') id: string, 
    @Body() data: { status: string; notes?: string }
  ) {
    return this.claimsService.processClaim(
      tenantId, 
      id, 
      currentUser.userId, 
      data.status, 
      data.notes
    );
  }
}

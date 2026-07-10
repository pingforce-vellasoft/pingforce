import { Injectable, BadRequestException } from '@nestjs/common';
import { ClaimsRepository } from './claims.repository';

@Injectable()
export class ClaimsService {
  constructor(private readonly claimsRepository: ClaimsRepository) {}

  async submitClaim(tenantId: string, data: any) {
    return this.claimsRepository.create(tenantId, {
      ...data,
      status: 'PENDING',
    });
  }

  async listPendingClaims(tenantId: string, skip?: number, take?: number) {
    return this.claimsRepository.listPendingClaims(tenantId, skip, take);
  }

  async processClaim(tenantId: string, claimId: string, approverId: string, status: string, notes?: string) {
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException('Invalid status transition');
    }

    return this.claimsRepository.processClaim(tenantId, claimId, approverId, status, notes);
  }
}

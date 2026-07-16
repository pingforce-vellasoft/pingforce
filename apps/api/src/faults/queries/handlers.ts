import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  GetFaultsQuery,
  GetAssignedFaultsQuery,
  GetFaultByIdQuery,
  GetBreachedFaultsQuery,
} from './impl';
import { FaultsRepository } from '../faults.repository';
import { NotFoundException } from '@nestjs/common';
import { RbacService } from '../../rbac/rbac.service';

// Faults are visible to their assignee and creator within the caller's
// data scope (DataScope.md §9 "Fault Tickets").
const FAULT_SCOPE_FIELDS = ['assignedToId', 'createdBy'] as const;

@QueryHandler(GetFaultsQuery)
export class GetFaultsHandler implements IQueryHandler<GetFaultsQuery> {
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly rbacService: RbacService,
  ) {}
  async execute(query: GetFaultsQuery) {
    const scope = await this.rbacService.resolveScopeIds(
      query.tenantId,
      query.requesterUserId,
      'FAULTS',
      ['READ'],
    );
    const scopeWhere = this.rbacService.userScopeWhere(
      scope,
      FAULT_SCOPE_FIELDS,
    );
    if (scopeWhere === null) return [];
    return await this.faultsRepository.findAll(
      query.tenantId,
      query.skip,
      query.take,
      scopeWhere,
    );
  }
}

@QueryHandler(GetAssignedFaultsQuery)
export class GetAssignedFaultsHandler
  implements IQueryHandler<GetAssignedFaultsQuery>
{
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetAssignedFaultsQuery) {
    return await this.faultsRepository.findAssignedToMe(
      query.tenantId,
      query.userId,
      query.skip,
      query.take,
    );
  }
}

@QueryHandler(GetFaultByIdQuery)
export class GetFaultByIdHandler implements IQueryHandler<GetFaultByIdQuery> {
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetFaultByIdQuery) {
    const fault = await this.faultsRepository.findById(
      query.tenantId,
      query.id,
    );
    if (!fault)
      throw new NotFoundException(`Fault with ID ${query.id} not found`);
    return fault;
  }
}

@QueryHandler(GetBreachedFaultsQuery)
export class GetBreachedFaultsHandler
  implements IQueryHandler<GetBreachedFaultsQuery>
{
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly rbacService: RbacService,
  ) {}
  async execute(query: GetBreachedFaultsQuery) {
    const scope = await this.rbacService.resolveScopeIds(
      query.tenantId,
      query.requesterUserId,
      'FAULTS',
      ['READ'],
    );
    const scopeWhere = this.rbacService.userScopeWhere(
      scope,
      FAULT_SCOPE_FIELDS,
    );
    if (scopeWhere === null) return [];
    return await this.faultsRepository.findBreached(
      query.tenantId,
      query.skip,
      query.take,
      scopeWhere,
    );
  }
}

export const QueryHandlers = [
  GetFaultsHandler,
  GetAssignedFaultsHandler,
  GetFaultByIdHandler,
  GetBreachedFaultsHandler,
];

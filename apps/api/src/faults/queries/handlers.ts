import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  GetFaultsQuery,
  GetAssignedFaultsQuery,
  GetFaultByIdQuery,
  GetBreachedFaultsQuery,
} from './impl';
import {
  AssignedFault,
  BreachedFault,
  FaultDetail,
  FaultsRepository,
  PaginatedFaults,
} from '../faults.repository';
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
  async execute(query: GetFaultsQuery): Promise<PaginatedFaults> {
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
    if (scopeWhere === null) return { items: [], total: 0 };
    return await this.faultsRepository.findAllPaginated(
      query.tenantId,
      query.filter,
      scopeWhere,
    );
  }
}

@QueryHandler(GetAssignedFaultsQuery)
export class GetAssignedFaultsHandler
  implements IQueryHandler<GetAssignedFaultsQuery>
{
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetAssignedFaultsQuery): Promise<AssignedFault[]> {
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
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly rbacService: RbacService,
  ) {}
  async execute(query: GetFaultByIdQuery): Promise<FaultDetail> {
    // The list endpoints scope by assignee/creator; fetching one fault by id
    // must honour the same scope, or READ_OWN would expose the whole tenant
    // register to anyone who can guess an id. The scope is pushed into the
    // query rather than re-checked in memory so both paths share one rule.
    const scope = await this.rbacService.resolveScopeIds(
      query.tenantId,
      query.requesterUserId,
      'FAULTS',
      ['READ', 'READ_OWN'],
    );
    const scopeWhere = this.rbacService.userScopeWhere(
      scope,
      FAULT_SCOPE_FIELDS,
    );

    const fault =
      scopeWhere === null
        ? null
        : await this.faultsRepository.findById(
            query.tenantId,
            query.id,
            scopeWhere,
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
  async execute(query: GetBreachedFaultsQuery): Promise<BreachedFault[]> {
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

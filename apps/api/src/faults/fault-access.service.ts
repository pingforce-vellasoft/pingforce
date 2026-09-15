import { ForbiddenException, Injectable } from '@nestjs/common';
import { RbacService } from '../rbac/rbac.service';

const FAULT_SCOPE_FIELDS = ['assignedToId', 'createdBy'] as const;

/** Resolves write scope as well as permissions for online and offline commands. */
@Injectable()
export class FaultAccessService {
  constructor(private readonly rbacService: RbacService) {}

  async scopeForAction(
    tenantId: string,
    userId: string,
    action: string | readonly string[],
  ): Promise<Record<string, unknown>> {
    const actions = typeof action === 'string' ? [action] : action;
    const scope = await this.rbacService.resolveScopeIds(
      tenantId,
      userId,
      'FAULTS',
      actions,
    );
    const where = this.rbacService.userScopeWhere(scope, FAULT_SCOPE_FIELDS);
    if (where === null) {
      throw new ForbiddenException(
        `Missing FAULTS:${actions.join('|')} permission`,
      );
    }
    return where;
  }

  async assertAssignmentAllowed(
    tenantId: string,
    userId: string,
    assignedToId?: string,
  ): Promise<void> {
    if (!assignedToId || assignedToId === userId) return;
    const scope = await this.rbacService.resolveScopeIds(
      tenantId,
      userId,
      'FAULTS',
      ['ASSIGN'],
    );
    if (
      scope.kind !== 'ALL' &&
      !(scope.kind === 'IDS' && scope.userIds.includes(assignedToId))
    ) {
      throw new ForbiddenException(
        'The technician is outside your FAULTS:ASSIGN scope',
      );
    }
  }
}

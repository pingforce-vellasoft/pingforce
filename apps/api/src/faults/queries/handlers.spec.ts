import { NotFoundException } from '@nestjs/common';
import { GetFaultByIdHandler, GetFaultsHandler } from './handlers';
import { GetFaultByIdQuery, GetFaultsQuery } from './impl';
import { FaultState } from '../domain/fault-state';

/**
 * Fault read scoping (DataScope.md §9).
 *
 * The list endpoints have always applied the caller's data scope; fetching one
 * fault by id did not, so a holder of FAULTS:READ_OWN could read any fault in
 * the tenant by guessing an id. These tests pin the scope onto both paths.
 */

const TENANT = 't1';
const USER = 'u1';
const FAULT_ID = 'f1';

function makeHandlers(scopeWhere: Record<string, unknown> | null) {
  const repository = {
    findById: jest.fn().mockResolvedValue({ id: FAULT_ID }),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  const rbacService = {
    resolveScopeIds: jest.fn().mockResolvedValue({ kind: 'IDS' }),
    userScopeWhere: jest.fn().mockReturnValue(scopeWhere),
  };

  return {
    byId: new GetFaultByIdHandler(repository as never, rbacService as never),
    list: new GetFaultsHandler(repository as never, rbacService as never),
    repository,
    rbacService,
  };
}

describe('GetFaultByIdHandler', () => {
  it('pushes the caller scope into the query rather than checking after', async () => {
    const scope = { OR: [{ assignedToId: { in: [USER] } }] };
    const { byId, repository } = makeHandlers(scope);

    await byId.execute(new GetFaultByIdQuery(TENANT, FAULT_ID, USER));

    expect(repository.findById).toHaveBeenCalledWith(TENANT, FAULT_ID, scope);
  });

  it('resolves scope against both READ and READ_OWN', async () => {
    const { byId, rbacService } = makeHandlers({});

    await byId.execute(new GetFaultByIdQuery(TENANT, FAULT_ID, USER));

    expect(rbacService.resolveScopeIds).toHaveBeenCalledWith(
      TENANT,
      USER,
      'FAULTS',
      ['READ', 'READ_OWN'],
    );
  });

  it('404s when the caller has no scope at all, without querying', async () => {
    const { byId, repository } = makeHandlers(null);

    await expect(
      byId.execute(new GetFaultByIdQuery(TENANT, FAULT_ID, USER)),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('404s a fault outside the scope, not 403 — no existence oracle', async () => {
    const { byId, repository } = makeHandlers({ OR: [] });
    repository.findById.mockResolvedValue(null);

    await expect(
      byId.execute(new GetFaultByIdQuery(TENANT, FAULT_ID, USER)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('GetFaultsHandler', () => {
  it('returns an empty page when the caller has no scope', async () => {
    const { list, repository } = makeHandlers(null);

    const result = await list.execute(new GetFaultsQuery(TENANT, USER, {}));

    expect(result).toEqual({ items: [], total: 0 });
    expect(repository.findAllPaginated).not.toHaveBeenCalled();
  });

  it('passes filters and scope through to the repository', async () => {
    const scope = { OR: [{ createdBy: { in: [USER] } }] };
    const { list, repository } = makeHandlers(scope);
    const filter = { status: [FaultState.OPEN], take: 10 };

    await list.execute(new GetFaultsQuery(TENANT, USER, filter));

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      TENANT,
      filter,
      scope,
    );
  });
});

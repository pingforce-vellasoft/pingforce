import { NotFoundException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import type { ResolvedDataScope } from '../rbac/rbac.service';

/**
 * Single-record employee routes honour the caller's EMPLOYEES data scope
 * (DataScope.md §9), the same as the list: out of scope is a 404.
 */
type Args = ConstructorParameters<typeof EmployeeService>;

function makeService(scope: ResolvedDataScope) {
  const repository = {
    findOneWithRelations: jest.fn().mockResolvedValue({ id: 'e-in' }),
    update: jest.fn().mockResolvedValue({ id: 'e-in' }),
    delete: jest.fn().mockResolvedValue({ id: 'e-in' }),
  };
  const rbac = { resolveScopeIds: jest.fn().mockResolvedValue(scope) };
  const prisma = { employee: { findFirst: jest.fn().mockResolvedValue(null) } };
  const service = new EmployeeService(
    repository as unknown as Args[0],
    rbac as unknown as Args[1],
    prisma as unknown as Args[2],
    {} as Args[3],
  );
  return { service, repository, rbac, prisma };
}

const team: ResolvedDataScope = {
  kind: 'IDS',
  employeeIds: ['e-in'],
  userIds: ['u-in'],
};

describe('EmployeeService single-record data scope', () => {
  it('ALL scope reads any employee of the tenant', async () => {
    const { service, rbac } = makeService({ kind: 'ALL' });
    await expect(service.findOne('t1', 'e-out', 'u1')).resolves.toEqual({
      id: 'e-in',
    });
    expect(rbac.resolveScopeIds).toHaveBeenCalledWith('t1', 'u1', 'EMPLOYEES', [
      'READ',
    ]);
  });

  it('TEAM scope reads a team member', async () => {
    const { service } = makeService(team);
    await expect(service.findOne('t1', 'e-in', 'u1')).resolves.toBeTruthy();
  });

  it('TEAM scope cannot read outside the team', async () => {
    const { service, repository } = makeService(team);
    await expect(service.findOne('t1', 'e-out', 'u1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.findOneWithRelations).not.toHaveBeenCalled();
  });

  it('TEAM scope cannot update outside the team', async () => {
    const { service, repository, rbac } = makeService(team);
    await expect(
      service.update('t1', 'e-out', { firstName: 'X' }, 'u1'),
    ).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
    expect(rbac.resolveScopeIds).toHaveBeenCalledWith('t1', 'u1', 'EMPLOYEES', [
      'UPDATE',
    ]);
  });

  it('TEAM scope cannot delete outside the team', async () => {
    const { service, repository } = makeService(team);
    await expect(service.remove('t1', 'e-out', 'u1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('TEAM scope cannot re-invite outside the team', async () => {
    const { service, prisma } = makeService(team);
    await expect(service.invite('t1', 'e-out', 'u1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.employee.findFirst).not.toHaveBeenCalled();
  });

  it('NONE scope is denied even for an existing id', async () => {
    const { service } = makeService({ kind: 'NONE' });
    await expect(service.findOne('t1', 'e-in', 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

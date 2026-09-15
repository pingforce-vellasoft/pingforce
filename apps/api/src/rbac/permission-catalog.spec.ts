import { PERMISSION_CATALOG, SYSTEM_ROLE_GRANTS } from './permission-catalog';

describe('Fault SLA administration permission', () => {
  it('exists in the catalog and is included in the tenant admin defaults', () => {
    const isSlaGrant = (grant: { module: string; action: string }) =>
      grant.module === 'FAULTS' && grant.action === 'MANAGE_SLA';
    expect(PERMISSION_CATALOG.some(isSlaGrant)).toBe(true);
    expect(SYSTEM_ROLE_GRANTS['ADMIN_MANAGER'].some(isSlaGrant)).toBe(true);
  });

  it('is not granted to technician/employee roles', () => {
    for (const role of ['EMPLOYEE', 'EMPLOYEE_FIELD_STAFF']) {
      expect(
        SYSTEM_ROLE_GRANTS[role].some(
          (grant) => grant.module === 'FAULTS' && grant.action === 'MANAGE_SLA',
        ),
      ).toBe(false);
    }
  });
});

import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';
import { LEAVE_DAYS, MY_BALANCE_URL } from './leave-days';

/**
 * Phase 2 platform cases that need no extra login: files, master data,
 * roles, audit, notifications feed, login history and employees.
 */

const tag = () => randomUUID().slice(0, 8);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function adminFault(
  request: APIRequestContext,
  admin: Session,
): Promise<string> {
  const created = await request.post('/api/v1/faults', {
    headers: bearer(admin),
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title: 'QA attachment',
      description: 'Synthetic file regression',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  return (await created.json()).id as string;
}

const upload = (
  request: APIRequestContext,
  session: Session,
  entityType: string,
  entityId: string,
  name = 'evidence.png',
  mimeType = 'image/png',
  buffer = PNG,
) =>
  request.post('/api/v1/files/upload', {
    headers: bearer(session),
    multipart: {
      entityType,
      entityId,
      file: { name, mimeType, buffer },
    },
  });

test('P2-FILE-01/P2-SEC-03 attachments stay on records the caller may see', async ({
  request,
  accounts,
}) => {
  const { admin, employee, restricted, other } = accounts;
  const faultId = await adminFault(request, admin);

  // P2-FILE-01: upload, list and download with the right type.
  const stored = await upload(request, admin, 'FAULT', faultId);
  expect(stored.status(), await stored.text()).toBe(201);
  const file = (await stored.json()) as { id: string; fileUrl: string };
  const list = await request.get(
    `/api/v1/files?entityType=FAULT&entityId=${faultId}`,
    { headers: bearer(admin) },
  );
  expect(await list.text()).toContain(file.id);
  const download = await request.get(`/api/v1/files/${file.id}/download`, {
    headers: bearer(admin),
  });
  expect(download.status()).toBe(200);
  expect(download.headers()['content-type']).toContain('image/png');
  expect(Buffer.compare(await download.body(), PNG)).toBe(0);

  // P2-SEC-03: nobody outside the fault's scope gets the file.
  for (const [who, session] of [
    ['other tenant', other],
    ['field employee (not assigned)', employee],
    ['no-grant role', restricted],
  ] as const) {
    const attempt = await request.get(`/api/v1/files/${file.id}/download`, {
      headers: bearer(session),
    });
    expect([403, 404], `${who} download ${attempt.status()}`).toContain(
      attempt.status(),
    );
    const removal = await request.delete(`/api/v1/files/${file.id}`, {
      headers: bearer(session),
    });
    expect([403, 404], `${who} delete ${removal.status()}`).toContain(
      removal.status(),
    );
  }

  // Only attachable record types may hold files: anything else is refused,
  // so storage cannot hold files on records nobody scope-checks.
  const employeeDoc = await upload(
    request,
    restricted,
    'EMPLOYEE',
    randomUUID(),
  );
  expect(employeeDoc.status(), await employeeDoc.text()).toBe(400);
  const anyType = await upload(request, admin, 'CUSTOMER', randomUUID());
  expect(anyType.status(), await anyType.text()).toBe(400);
  // Type and size rules still apply on a valid record.
  const gif = await upload(
    request,
    admin,
    'FAULT',
    faultId,
    'a.gif',
    'image/gif',
  );
  expect(gif.status(), 'gif').toBe(400);
  const spoofed = await upload(
    request,
    admin,
    'FAULT',
    faultId,
    'a.png',
    'application/pdf',
  );
  expect(spoofed.status(), 'mime mismatch').toBe(400);

  // The owner can still delete it.
  const removed = await request.delete(`/api/v1/files/${file.id}`, {
    headers: bearer(admin),
  });
  expect(removed.ok(), await removed.text()).toBeTruthy();
});

test('P2-MD-01/02 master data CRUD per tenant, list refreshes after changes', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const base = '/api/v1/master-data/departments';
  const code = `QA-${tag()}`;
  // Warm the cached list first, so a stale cache would show.
  expect((await request.get(base, { headers: admin })).status()).toBe(200);

  const created = await request.post(base, {
    headers: admin,
    data: { name: `QA Dept ${code}`, code },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id as string;
  expect(await (await request.get(base, { headers: admin })).text()).toContain(
    id,
  );

  const renamed = await request.patch(`${base}/${id}`, {
    headers: admin,
    data: { name: `QA Dept renamed ${code}` },
  });
  expect(renamed.ok(), await renamed.text()).toBeTruthy();
  expect(await (await request.get(base, { headers: admin })).text()).toContain(
    `QA Dept renamed ${code}`,
  );

  // P2-MD-02: another tenant cannot read, change or delete it.
  const beta = bearer(accounts.other);
  expect((await request.get(`${base}/${id}`, { headers: beta })).status()).toBe(
    404,
  );
  expect(
    (
      await request.patch(`${base}/${id}`, {
        headers: beta,
        data: { name: 'X' },
      })
    ).status(),
  ).toBe(404);
  expect(
    (await request.delete(`${base}/${id}`, { headers: beta })).status(),
  ).toBe(404);
  expect(
    await (await request.get(base, { headers: beta })).text(),
  ).not.toContain(id);

  expect(
    (
      await request.get('/api/v1/master-data/not-a-type', { headers: admin })
    ).status(),
  ).toBe(400);

  const removed = await request.delete(`${base}/${id}`, { headers: admin });
  expect(removed.ok(), await removed.text()).toBeTruthy();
  expect(
    await (await request.get(base, { headers: admin })).text(),
  ).not.toContain(id);
});

test('P2-RBAC-05/06 custom role: grants validated, platform modules withheld', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const permissions = (await (
    await request.get('/api/v1/rbac/permissions', { headers: admin })
  ).json()) as { id: string; module: string; action: string }[];
  // The tenant catalogue hides platform modules.
  expect(
    permissions.some((p) =>
      ['TENANTS', 'BILLING', 'SETTINGS'].includes(p.module),
    ),
  ).toBeFalsy();
  const leadsRead = permissions.find(
    (p) => p.module === 'LEADS' && p.action === 'READ',
  );
  expect(leadsRead).toBeTruthy();

  const code = `QA_ROLE_${tag().toUpperCase()}`;
  const role = await request.post('/api/v1/rbac/roles', {
    headers: admin,
    data: { name: `QA read-only leads ${code}`, code },
  });
  expect(role.status(), await role.text()).toBe(201);
  const roleId = (await role.json()).id as string;
  try {
    const unknown = await request.put(
      `/api/v1/rbac/roles/${roleId}/permissions`,
      {
        headers: admin,
        data: { permissionIds: [randomUUID()] },
      },
    );
    expect(unknown.status(), await unknown.text()).toBe(400);
    const granted = await request.put(
      `/api/v1/rbac/roles/${roleId}/permissions`,
      {
        headers: admin,
        data: {
          permissionIds: [leadsRead!.id],
          grants: [{ permissionId: leadsRead!.id, dataScope: 'ALL' }],
        },
      },
    );
    expect(granted.ok(), await granted.text()).toBeTruthy();
    const body = (await granted.json()) as {
      permissions: {
        dataScope: string;
        permission: { module: string; action: string };
      }[];
    };
    expect(body.permissions).toHaveLength(1);
    expect(body.permissions[0]).toMatchObject({
      dataScope: 'ALL',
      permission: { module: 'LEADS', action: 'READ' },
    });
    // Another tenant cannot touch the role.
    const foreign = await request.put(
      `/api/v1/rbac/roles/${roleId}/permissions`,
      {
        headers: bearer(accounts.other),
        data: { permissionIds: [] },
      },
    );
    expect(foreign.status()).toBe(404);
    // A field employee cannot manage roles at all.
    expect(
      (
        await request.get('/api/v1/rbac/roles', {
          headers: bearer(accounts.employee),
        })
      ).status(),
    ).toBe(403);
  } finally {
    await request.delete(`/api/v1/rbac/roles/${roleId}`, { headers: admin });
  }
});

test('P2-SEC-02 every mutation is audited with tenant, user and request id', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const me = await (
    await request.get('/api/v1/auth/me', { headers: admin })
  ).json();
  const requestId = `qa-audit-${tag()}`;
  const created = await request.post('/api/v1/customers', {
    headers: { ...admin, 'x-request-id': requestId },
    data: { customerCode: `QA-AUD-${tag()}`, legalName: 'QA audited customer' },
  });
  expect(created.status(), await created.text()).toBe(201);
  expect(created.headers()['x-request-id']).toBe(requestId);

  await expect
    .poll(
      async () => {
        const audit = await request.get(
          `/api/v1/audit?requestId=${requestId}`,
          {
            headers: admin,
          },
        );
        return audit.status() === 200
          ? await audit.text()
          : `HTTP ${audit.status()}`;
      },
      { timeout: 10_000, intervals: [1_000] },
    )
    .toContain(requestId);
  const audit = await (
    await request.get(`/api/v1/audit?requestId=${requestId}`, {
      headers: admin,
    })
  ).text();
  expect(audit).toContain(me.userId);
  // Another tenant's admin sees none of it; field staff cannot read audit.
  expect(
    await (
      await request.get(`/api/v1/audit?requestId=${requestId}`, {
        headers: bearer(accounts.other),
      })
    ).text(),
  ).not.toContain(me.userId);
  expect(
    (
      await request.get('/api/v1/audit', { headers: bearer(accounts.employee) })
    ).status(),
  ).toBe(403);
});

test('P2-NOT-01 a leave decision reaches the in-app feed; read-all clears it', async ({
  request,
  accounts,
}) => {
  const staff = bearer(accounts.employee);
  const unread = async () =>
    (
      await (
        await request.get('/api/v1/notifications/feed/unread-count', {
          headers: staff,
        })
      ).json()
    ).count as number;
  await request.post('/api/v1/notifications/feed/read-all', { headers: staff });
  expect(await unread()).toBe(0);

  const types = (await (
    await request.get('/api/v1/leaves/types', { headers: staff })
  ).json()) as { id: string; code: string }[];
  const typeId = types.find((t) => t.code === 'QA_ANNUAL')!.id;
  const leave = await request.post('/api/v1/leaves/request', {
    headers: staff,
    data: {
      leaveTypeId: typeId,
      startDate: LEAVE_DAYS[20],
      endDate: LEAVE_DAYS[20],
      reason: 'QA feed',
    },
  });
  expect(leave.status(), await leave.text()).toBe(201);
  const leaveId = (await leave.json()).id as string;
  try {
    const decided = await request.post(`/api/v1/leaves/${leaveId}/reject`, {
      headers: bearer(accounts.admin),
      data: { reason: 'QA feed check' },
    });
    expect(decided.ok(), await decided.text()).toBeTruthy();
    await expect
      .poll(unread, { timeout: 10_000, intervals: [1_000] })
      .toBeGreaterThan(0);
    // The other tenant's feed never shows it.
    const foreign = await request.get('/api/v1/notifications/feed', {
      headers: bearer(accounts.other),
    });
    expect(await foreign.text()).not.toContain(leaveId);
    const cleared = await request.post('/api/v1/notifications/feed/read-all', {
      headers: staff,
    });
    expect(cleared.ok(), await cleared.text()).toBeTruthy();
    expect(await unread()).toBe(0);
  } finally {
    await request.get(MY_BALANCE_URL, { headers: staff });
  }
});

test('P2-AUTH-08 login history lists own sign-ins only', async ({
  request,
  accounts,
}) => {
  const history = await request.get('/api/v1/auth/login-history', {
    headers: bearer(accounts.employee),
  });
  expect(history.status(), await history.text()).toBe(200);
  const body = (await history.json()) as {
    items: { outcome: string; username?: string }[];
  };
  expect(body.items.some((i) => i.outcome === 'SUCCESS')).toBeTruthy();
  expect(JSON.stringify(body)).not.toContain('admin@qa.pingforce.test');
});

test('P2-EMP-01/02/03 employee create, edit, field flag, delete', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const code = `QA-EMP-${tag()}`;
  const created = await request.post('/api/v1/employees', {
    headers: admin,
    data: {
      employeeCode: code,
      firstName: 'Office',
      lastName: code,
      isFieldStaff: false,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id as string;

  const edited = await request.patch(`/api/v1/employees/${id}`, {
    headers: admin,
    data: { firstName: 'Office Edited' },
  });
  expect(edited.ok(), await edited.text()).toBeTruthy();
  const detail = await request.get(`/api/v1/employees/${id}`, {
    headers: admin,
  });
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({
    employeeCode: code,
    firstName: 'Office Edited',
    isFieldStaff: false,
  });

  const removed = await request.delete(`/api/v1/employees/${id}`, {
    headers: admin,
  });
  expect(removed.ok(), await removed.text()).toBeTruthy();
  expect(
    (await request.get(`/api/v1/employees/${id}`, { headers: admin })).status(),
  ).toBe(404);
  expect(
    await (
      await request.get('/api/v1/employees?take=100', { headers: admin })
    ).text(),
  ).not.toContain(id);
});

import { randomUUID } from 'node:crypto';
import { test, expect, bearer } from './fixtures';

/**
 * RBAC-002 object tenant isolation: a record created in QA_ALPHA is invisible
 * and immutable to a QA_BETA admin holding the same role and permissions.
 */

interface Resource {
  readonly name: string;
  readonly path: string;
  readonly create: (tag: string) => Record<string, unknown>;
  readonly patch: Record<string, unknown>;
  readonly field: string;
}

const resources: readonly Resource[] = [
  {
    name: 'lead',
    path: 'leads',
    create: (tag) => ({ leadNumber: `QA-L-${tag}`, firstName: `Lead ${tag}` }),
    patch: { firstName: 'Changed by other tenant' },
    field: 'firstName',
  },
  {
    name: 'customer',
    path: 'customers',
    create: (tag) => ({
      customerCode: `QA-C-${tag}`,
      legalName: `Customer ${tag}`,
    }),
    patch: { legalName: 'Changed by other tenant' },
    field: 'legalName',
  },
  {
    name: 'employee',
    path: 'employees',
    create: (tag) => ({
      employeeCode: `QA-E-${tag}`,
      firstName: `Employee ${tag}`,
      lastName: 'Isolation',
    }),
    patch: { firstName: 'Changed by other tenant' },
    field: 'firstName',
  },
];

for (const resource of resources) {
  test(`RBAC-002 ${resource.name} is isolated from another tenant`, async ({
    request,
    accounts,
  }) => {
    const alpha = bearer(accounts.admin);
    const beta = bearer(accounts.other);
    const tag = randomUUID().slice(0, 8);
    const body = resource.create(tag);

    const created = await request.post(`/api/v1/${resource.path}`, {
      headers: alpha,
      data: body,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const url = `/api/v1/${resource.path}/${id}`;
    const denied = (status: number) => [403, 404].includes(status);

    const read = await request.get(url, { headers: beta });
    expect(denied(read.status()), `GET ${read.status()}`).toBeTruthy();
    expect(await read.text()).not.toContain(tag);

    const changed = await request.patch(url, {
      headers: beta,
      data: resource.patch,
    });
    expect(denied(changed.status()), `PATCH ${changed.status()}`).toBeTruthy();

    const removed = await request.delete(url, { headers: beta });
    expect(denied(removed.status()), `DELETE ${removed.status()}`).toBeTruthy();

    const list = await request.get(`/api/v1/${resource.path}`, {
      headers: beta,
    });
    expect(list.status(), await list.text()).toBe(200);
    expect(await list.text()).not.toContain(id);

    // The owner still sees the record, unchanged.
    const own = await request.get(url, { headers: alpha });
    expect(own.status(), await own.text()).toBe(200);
    expect((await own.json())[resource.field]).toBe(body[resource.field]);
  });
}

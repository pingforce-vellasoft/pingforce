import type { PrismaClient } from '@prisma/client';

/**
 * Demo Connection Map network (3.7_ConnectionMap spec example):
 *
 * OLTE-001
 *  └── C1 ── C2 ─┬─ C5 ─┬─ C6 ── C10
 *                │      └─ C7
 *                └─ C3 ── C4 ─┬─ C8 ── C11
 *                             └─ C9 ── C12
 *
 * Idempotent: skips entirely if the demo OLTE already exists for the tenant.
 * Coordinates fan out around Tirupati, AP.
 */
export async function seedDemoNetwork(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  const existing = await prisma.olte.findFirst({
    where: { tenantId, code: 'OLTE-001' },
  });
  if (existing) {
    console.log('Demo network already present — skipping');
    return;
  }

  const olte = await prisma.olte.create({
    data: {
      tenantId,
      code: 'OLTE-001',
      name: 'Tirupati Central OLTE',
      status: 'ACTIVE',
      totalPorts: 128,
      district: 'Tirupati',
      latitude: 13.6288,
      longitude: 79.4192,
    },
  });

  const base = { lat: 13.6288, lng: 79.4192 };
  // [code, parentCode|null, latOffset, lngOffset]
  const nodes: [string, string | null, number, number][] = [
    ['CONN-001', null, 0.004, 0.003],
    ['CONN-002', 'CONN-001', 0.008, 0.006],
    ['CONN-005', 'CONN-002', 0.012, 0.003],
    ['CONN-006', 'CONN-005', 0.016, 0.001],
    ['CONN-010', 'CONN-006', 0.02, 0.0],
    ['CONN-007', 'CONN-005', 0.016, 0.006],
    ['CONN-003', 'CONN-002', 0.012, 0.01],
    ['CONN-004', 'CONN-003', 0.016, 0.013],
    ['CONN-008', 'CONN-004', 0.02, 0.011],
    ['CONN-011', 'CONN-008', 0.024, 0.01],
    ['CONN-009', 'CONN-004', 0.02, 0.016],
    ['CONN-012', 'CONN-009', 0.024, 0.017],
  ];

  const byCode = new Map<string, { id: string; path: string; depth: number }>();
  for (const [code, parentCode, latOff, lngOff] of nodes) {
    const parent = parentCode ? byCode.get(parentCode) : undefined;
    const customerNumber = code.replace('CONN-0', '').replace('CONN-', '');
    const customer = await prisma.customer.upsert({
      where: {
        tenantId_customerCode: {
          tenantId,
          customerCode: `NET-CUST-${customerNumber}`,
        },
      },
      update: {},
      create: {
        tenantId,
        customerCode: `NET-CUST-${customerNumber}`,
        legalName: `Demo Customer ${Number(customerNumber)}`,
        displayName: `Customer ${Number(customerNumber)}`,
        customerType: 'Retail',
        status: 'ACTIVE',
      },
    });

    const created = await prisma.networkConnection.create({
      data: {
        tenantId,
        connectionCode: code,
        olteId: olte.id,
        customerId: customer.id,
        parentConnectionId: parent ? parent.id : null,
        depth: parent ? parent.depth + 1 : 0,
        path: 'pending',
        nodeType: 'CUSTOMER',
        status: 'ACTIVE',
        connectionType: 'FIBER',
        installationDate: new Date(),
        latitude: base.lat + latOff,
        longitude: base.lng + lngOff,
      },
    });
    const path = parent ? `${parent.path}.${created.id}` : created.id;
    await prisma.networkConnection.update({
      where: { id: created.id },
      data: { path },
    });
    byCode.set(code, {
      id: created.id,
      path,
      depth: parent ? parent.depth + 1 : 0,
    });
  }

  const rootCount = await prisma.networkConnection.count({
    where: {
      tenantId,
      olteId: olte.id,
      parentConnectionId: null,
      deletedAt: null,
    },
  });
  await prisma.olte.update({
    where: { id: olte.id },
    data: { usedPorts: rootCount },
  });

  // Enable the module for the demo tenant so the map is visible immediately.
  await prisma.tenantSetting.upsert({
    where: { tenantId },
    update: { connectionMapEnabled: true, connectionMapEmployeeAccess: 'VIEW' },
    create: {
      tenantId,
      connectionMapEnabled: true,
      connectionMapEmployeeAccess: 'VIEW',
    },
  });

  console.log(
    `Seeded demo network: OLTE-001 with ${nodes.length} connections`,
  );
}

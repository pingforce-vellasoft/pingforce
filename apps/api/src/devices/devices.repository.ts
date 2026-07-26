import { Injectable, Inject } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { Prisma, EmployeeDevice, DeviceChangeRequest } from '@prisma/client';

/**
 * Data access for device bindings and the change-request queue.
 *
 * Every method takes tenantId and filters on it. Device identifiers are
 * client-supplied, so an unscoped lookup would resolve another tenant's row and
 * leak its existence — the same defect fixed in the attendance path.
 */
@Injectable()
export class DevicesRepository {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  /** The employee's current binding, if any. */
  async findActiveBinding(
    tenantId: string,
    employeeId: string,
  ): Promise<EmployeeDevice | null> {
    return this.prisma.employeeDevice.findFirst({
      where: { tenantId, employeeId, isTrusted: true, revokedAt: null },
    });
  }

  async findDeviceById(
    tenantId: string,
    deviceId: string,
  ): Promise<EmployeeDevice | null> {
    return this.prisma.employeeDevice.findUnique({
      where: { tenantId_deviceId: { tenantId, deviceId } },
    });
  }

  /**
   * Tenant device inventory for the admin portal. The employee's user record is
   * never included wholesale — it carries passwordHash.
   */
  async listDevices(
    tenantId: string,
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ rows: EmployeeDevice[]; total: number }> {
    const where: Prisma.EmployeeDeviceWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { deviceId: { contains: search, mode: 'insensitive' as const } },
              {
                deviceName: { contains: search, mode: 'insensitive' as const },
              },
              {
                employee: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        lastName: {
                          contains: search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        employeeCode: {
                          contains: search,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.employeeDevice.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { boundAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.employeeDevice.count({ where }),
    ]);

    return { rows, total };
  }

  async findPendingRequestForEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<DeviceChangeRequest | null> {
    return this.prisma.deviceChangeRequest.findFirst({
      where: { tenantId, employeeId, status: 'PENDING', deletedAt: null },
    });
  }

  /**
   * How many requests this employee raised in the trailing window. Backs the
   * tenant quota — a serial "lost my phone" pattern must surface, not repeat
   * silently. Rejected and cancelled requests count: what is being rate-limited
   * is the asking, otherwise the quota is trivially reset by cancelling.
   */
  async countRequestsSince(
    tenantId: string,
    employeeId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.deviceChangeRequest.count({
      where: {
        tenantId,
        employeeId,
        createdAt: { gte: since },
        deletedAt: null,
      },
    });
  }

  async findRequest(
    tenantId: string,
    id: string,
  ): Promise<DeviceChangeRequest | null> {
    return this.prisma.deviceChangeRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async listRequests(
    tenantId: string,
    status: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ rows: DeviceChangeRequest[]; total: number }> {
    const where: Prisma.DeviceChangeRequestWhereInput = {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.deviceChangeRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.deviceChangeRequest.count({ where }),
    ]);

    return { rows, total };
  }

  /** Lifetime request count per employee — context for the approver. */
  async countRequestsForEmployees(
    tenantId: string,
    employeeIds: string[],
  ): Promise<Map<string, number>> {
    if (employeeIds.length === 0) return new Map();

    const grouped = await this.prisma.deviceChangeRequest.groupBy({
      by: ['employeeId'],
      where: { tenantId, employeeId: { in: employeeIds }, deletedAt: null },
      _count: { _all: true },
    });

    return new Map(
      grouped.map((g: { employeeId: string; _count: { _all: number } }) => [
        g.employeeId,
        g._count._all,
      ]),
    );
  }
}

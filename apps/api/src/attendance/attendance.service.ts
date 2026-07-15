import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { RegisterDeviceDto, CreateGeofenceDto } from './dto/attendance.dto';
import * as crypto from 'crypto';

@Injectable()
export class AttendanceService {
  constructor(@Inject('IPrismaService') private prisma: ExtendedPrismaClient) {}

  async getDevices(user: any, skip = 0, take = 50) {
    return this.prisma.employeeDevice.findMany({
      where: { tenantId: user.tenantId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            // Never include the full user record — it carries passwordHash
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 200),
    });
  }

  async registerDevice(user: any, dto: RegisterDeviceDto) {
    // Only employees can register a device
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('User is not an employee');

    // Revoke-then-register atomically so the 1-device policy can't be
    // violated by concurrent registrations (PRISMA_GUIDELINES.md §10)
    const [, device] = await this.prisma.$transaction([
      this.prisma.employeeDevice.updateMany({
        where: { employeeId: employee.id, isTrusted: true },
        data: { isTrusted: false, revokedAt: new Date() },
      }),
      this.prisma.employeeDevice.create({
        data: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          deviceId: dto.deviceId,
          publicKey: dto.publicKey,
          isTrusted: true,
          createdBy: user.userId,
        },
      }),
    ]);

    return device;
  }

  async revokeDevice(admin: any, employeeId: string, deviceId: string) {
    // Basic check for admin (assume proper RBAC guard in real app)
    if (
      admin.roleCode !== 'SUPER_ADMIN' &&
      admin.roleCode !== 'ADMIN_MANAGER'
    ) {
      throw new UnauthorizedException('Only admins can revoke devices');
    }

    return this.prisma.employeeDevice.updateMany({
      where: { employeeId, deviceId, employee: { tenantId: admin.tenantId } },
      data: { isTrusted: false },
    });
  }

  async manualCheckout(
    admin: any,
    dto: import('./dto/manual-checkout.dto').ManualCheckoutDto,
  ) {
    if (
      admin.roleCode !== 'SUPER_ADMIN' &&
      admin.roleCode !== 'ADMIN_MANAGER'
    ) {
      throw new UnauthorizedException(
        'Only admins can perform manual checkouts',
      );
    }

    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: dto.attendanceSessionId },
    });

    if (!session || session.tenantId !== admin.tenantId) {
      throw new BadRequestException('Invalid session');
    }

    if (session.punchOut) {
      throw new BadRequestException('Session already has a checkout time');
    }

    const punchOutTime = new Date(dto.checkoutTime);

    // Update the session
    const updatedSession = await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        punchOut: punchOutTime,
        attendanceMethod: 'MANUAL', // We could use an enum, or just track in corrections
      },
    });

    // Create an AttendanceCorrection record for auditing
    await this.prisma.attendanceCorrection.create({
      data: {
        tenantId: admin.tenantId,
        attendanceId: session.attendanceId,
        employeeId: session.employeeId,
        correctionType: 'MANUAL_CHECKOUT',
        requestedValue: punchOutTime.toISOString(),
        reason: dto.reason,
        workflowStatus: 'APPROVED',
        approvedBy: admin.userId,
        approvedAt: new Date(),
      },
    });

    return updatedSession;
  }

  async getLogs(
    user: any,
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortDir?: string,
  ) {
    const skip = (page - 1) * limit;

    // Only fetch logs for the admin's tenant
    const where: any = { tenantId: user.tenantId };

    if (search) {
      where.employee = {
        user: {
          profile: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    let orderBy: any = { punchIn: 'desc' };

    if (sortBy) {
      const direction = sortDir === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'checkIn') {
        orderBy = { punchIn: direction };
      } else if (sortBy === 'checkOut') {
        orderBy = { punchOut: direction };
      } else if (sortBy === 'employee') {
        // Sorting by nested fields in Prisma requires specific syntax
        orderBy = {
          employee: {
            user: {
              profile: {
                firstName: direction,
              },
            },
          },
        };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        include: {
          employee: {
            include: {
              user: { select: { profile: true } },
              department: true,
              team: true,
              company: true,
            },
          },
          attendance: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    const mappedData = data.map((log) => {
      // Inject demo metric for shortfalls and leaves
      return {
        ...log,
        employee: {
          ...log.employee,
          shortfallDays:
            log.employee?.id === 'some-id' ? 2 : Math.floor(Math.random() * 4),
          leaveBalance:
            log.employee?.id === 'some-id'
              ? 12
              : Math.floor(Math.random() * 20) + 1,
        },
      };
    });

    return { data: mappedData, total, page, limit };
  }

  async createGeofence(user: any, dto: CreateGeofenceDto) {
    if (user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN_MANAGER') {
      throw new UnauthorizedException('Only admins can create geofences');
    }

    // Check for duplicate name
    const existingName = await this.prisma.geofence.findFirst({
      where: { tenantId: user.tenantId, name: dto.name, active: true },
    });
    if (existingName) {
      throw new BadRequestException(
        'A geofence with this name already exists.',
      );
    }

    // Check for duplicate coordinates
    const existingCoords = await this.prisma.geofence.findFirst({
      where: {
        tenantId: user.tenantId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        active: true,
      },
    });
    if (existingCoords) {
      throw new BadRequestException(
        'A geofence with these exact coordinates already exists.',
      );
    }

    // Create record using standard Prisma, then update the PostGIS location using Raw SQL
    const geofence = await this.prisma.geofence.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters,
      },
    });

    await this.prisma.$executeRaw`
      UPDATE geofences
      SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}::float, ${dto.latitude}::float), 4326)
      WHERE id = ${geofence.id}
    `;

    return geofence;
  }

  async getGeofences(user: any) {
    return this.prisma.geofence.findMany({
      where: { tenantId: user.tenantId, active: true },
    });
  }

  async deleteGeofence(user: any, id: string) {
    if (user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN_MANAGER') {
      throw new UnauthorizedException('Only admins can delete geofences');
    }
    return this.prisma.geofence.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { active: false }, // Soft delete
    });
  }
}

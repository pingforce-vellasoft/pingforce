import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import {
  RegisterDeviceDto,
  PunchDto,
  CreateGeofenceDto,
} from './dto/attendance.dto';
import * as crypto from 'crypto';

@Injectable()
export class AttendanceService {
  constructor(@Inject('IPrismaService') private prisma: ExtendedPrismaClient) {}

  async getDevices(user: any) {
    return this.prisma.employeeDevice.findMany({
      where: { employee: { tenantId: user.tenantId } },
      include: {
        employee: { include: { user: { include: { profile: true } } } },
      },
    });
  }

  async registerDevice(user: any, dto: RegisterDeviceDto) {
    // Only employees can register a device
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('User is not an employee');

    // Revoke any existing active device for this employee to enforce 1-device policy
    await this.prisma.employeeDevice.updateMany({
      where: { employeeId: employee.id, isTrusted: true },
      data: { isTrusted: false },
    });

    return this.prisma.employeeDevice.create({
      data: {
        employeeId: employee.id,
        deviceId: dto.deviceId,
        publicKey: dto.publicKey,
        isTrusted: true,
      },
    });
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

  async punch(user: any, dto: PunchDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    // 1. Check Device Trust
    const device = await this.prisma.employeeDevice.findUnique({
      where: { deviceId: dto.deviceId },
    });
    if (!device || !device.isTrusted || device.employeeId !== employee.id) {
      throw new UnauthorizedException('Untrusted device');
    }

    // 2. Cryptographic Signature Verification (Mock validation for demo)
    // In production, we'd use crypto.verify with the device.publicKey
    // const isVerified = crypto.verify('sha256', Buffer.from(dto.timestamp + dto.latitude + dto.longitude), device.publicKey, Buffer.from(dto.signature, 'base64'));
    const isVerified = true;
    if (!isVerified)
      throw new UnauthorizedException('Invalid biometric signature');

    // 3. PostGIS Geofence Validation
    // Check if the coordinates are within any active geofence for the tenant
    const geofences = await this.prisma.$queryRaw`
      SELECT id, name, "radiusMeters", ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)
      ) as distance
      FROM geofences
      WHERE "tenantId" = ${employee.tenantId} AND active = true
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326),
        "radiusMeters"
      )
    `;

    const isValidLocation = Array.isArray(geofences) && geofences.length > 0;
    if (!isValidLocation) {
      throw new BadRequestException(
        'You are outside the authorized geofence area.',
      );
    }

    // 4. 15-Minute Debounce Check
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentSession = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId: employee.id,
        punchIn: { gte: fifteenMinsAgo },
      },
    });

    if (recentSession) {
      throw new BadRequestException(
        'You have already punched recently. Please wait 15 minutes.',
      );
    }

    // 5. Create or Update Attendance Record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.prisma.attendance.findFirst({
      where: { employeeId: employee.id, attendanceDate: today },
    });

    if (!attendance) {
      attendance = await this.prisma.attendance.create({
        data: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          attendanceDate: today,
          status: 'PRESENT',
        },
      });
    }

    // Determine Punch In or Out based on existing open session
    const openSession = await this.prisma.attendanceSession.findFirst({
      where: { attendanceId: attendance.id, punchOut: null },
    });

    if (openSession) {
      // Punch Out
      return this.prisma.attendanceSession.update({
        where: { id: openSession.id },
        data: {
          punchOut: new Date(),
          checkOutLatitude: dto.latitude,
          checkOutLongitude: dto.longitude,
          punchOutDevice: dto.deviceId,
        },
      });
    } else {
      // Punch In
      return this.prisma.attendanceSession.create({
        data: {
          tenantId: employee.tenantId,
          attendanceId: attendance.id,
          employeeId: employee.id,
          punchIn: new Date(),
          checkInLatitude: dto.latitude,
          checkInLongitude: dto.longitude,
          punchInDevice: dto.deviceId,
          deviceSignature: dto.signature,
          attendanceMethod: 'BIOMETRIC',
        },
      });
    }
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

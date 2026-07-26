import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { EmployeeDevice, DeviceChangeRequest } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../auth/session.service';
import { DevicesRepository } from './devices.repository';
import {
  BindDeviceDto,
  CreateDeviceChangeRequestDto,
  DeviceChangeStatus,
} from './dto/device.dto';

/** Device error codes (DeviceManagement.md §17, extended). */
export const DeviceErrors = {
  NOT_BOUND: 'DEVICE-007',
  ALREADY_BOUND: 'DEVICE-008',
  CHANGE_QUOTA_EXCEEDED: 'DEVICE-009',
  REQUEST_ALREADY_PENDING: 'DEVICE-010',
  DEVICE_IN_USE: 'DEVICE-011',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const QUOTA_WINDOW_DAYS = 90;

interface ActorContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly requestId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Device binding and replacement (DeviceManagement.md, DeviceSecurity.md).
 *
 * An employee is bound to exactly one handset, once, at onboarding. Attendance
 * is punchable only from that handset, so an employee who could re-bind at will
 * could hand their phone to a colleague and have it punch for them — which is
 * why binding is one-shot and every later move needs DEVICES:APPROVE.
 */
@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly repo: DevicesRepository,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
  ) {}

  // ── Employee self-service ────────────────────────────────────────────────

  /**
   * One-time binding at the end of onboarding. Succeeds only while the employee
   * has no active device;; after that the change-request queue is the only path.
   */
  async bindDevice(
    actor: ActorContext,
    dto: BindDeviceDto,
  ): Promise<EmployeeDevice> {
    const employee = await this.requireEmployee(actor);

    const existing = await this.repo.findActiveBinding(
      actor.tenantId,
      employee.id,
    );
    if (existing) {
      throw new ConflictException({
        errorCode: DeviceErrors.ALREADY_BOUND,
        message:
          'This account is already bound to a device. Raise a device change request to move it.',
      });
    }

    await this.assertDeviceFree(actor.tenantId, dto.deviceId, employee.id);

    // Binding the device and marking the employee bound must not diverge: a
    // half-applied bind either blocks a bound employee or unlocks an unbound
    // one. Same transaction.
    const [device] = await this.prisma.$transaction([
      this.prisma.employeeDevice.upsert({
        where: {
          tenantId_deviceId: {
            tenantId: actor.tenantId,
            deviceId: dto.deviceId,
          },
        },
        create: {
          tenantId: actor.tenantId,
          employeeId: employee.id,
          deviceId: dto.deviceId,
          publicKey: dto.publicKey,
          isTrusted: true,
          boundAt: new Date(),
          deviceName: dto.deviceName,
          platform: dto.platform,
          osVersion: dto.osVersion,
          appVersion: dto.appVersion,
          model: dto.model,
          manufacturer: dto.manufacturer,
          createdBy: actor.userId,
        },
        // Reachable when this employee's own earlier binding was revoked: the
        // row survives (revoked), and re-binding the same handset reuses it.
        update: {
          employeeId: employee.id,
          publicKey: dto.publicKey,
          isTrusted: true,
          revokedAt: null,
          revokedReason: null,
          boundAt: new Date(),
          deviceName: dto.deviceName,
          platform: dto.platform,
          osVersion: dto.osVersion,
          appVersion: dto.appVersion,
          model: dto.model,
          manufacturer: dto.manufacturer,
          updatedBy: actor.userId,
        },
      }),
      this.prisma.employee.update({
        where: { id: employee.id },
        data: { deviceBoundAt: new Date(), updatedBy: actor.userId },
      }),
    ]);

    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'employee_device',
      entityId: device.id,
      action: 'DEVICE_BOUND',
      severity: 'MEDIUM',
      newValue: {
        employeeId: employee.id,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        platform: dto.platform,
      },
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      deviceId: dto.deviceId,
    });

    return device;
  }

  /**
   * Completes an approved change: the newly-approved handset presents its own
   * public key, which approval deliberately left empty. Only the employee named
   * on the binding can claim it, and only while the key is still unset — so a
   * second handset cannot race in behind an approval and claim the slot.
   */
  async claimApprovedDevice(
    actor: ActorContext,
    deviceId: string,
    publicKey: string,
  ): Promise<EmployeeDevice> {
    const employee = await this.requireEmployee(actor);
    const device = await this.repo.findDeviceById(actor.tenantId, deviceId);

    if (
      !device ||
      device.employeeId !== employee.id ||
      !device.isTrusted ||
      device.revokedAt
    ) {
      throw new NotFoundException({
        errorCode: DeviceErrors.NOT_BOUND,
        message: 'No approved device binding is waiting to be claimed.',
      });
    }
    if (device.publicKey) {
      throw new ConflictException({
        errorCode: DeviceErrors.ALREADY_BOUND,
        message: 'This device has already been activated.',
      });
    }

    const updated = await this.prisma.employeeDevice.update({
      where: { id: device.id },
      data: { publicKey, updatedBy: actor.userId },
    });

    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'employee_device',
      entityId: device.id,
      action: 'DEVICE_ACTIVATED',
      severity: 'MEDIUM',
      newValue: { employeeId: employee.id, deviceId },
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      deviceId,
    });

    return updated;
  }

  /** Own binding + any pending request, for the mobile profile screen. */
  async getMyDevice(actor: ActorContext): Promise<{
    device: EmployeeDevice | null;
    pendingRequest: DeviceChangeRequest | null;
  }> {
    const employee = await this.requireEmployee(actor);
    const [device, pendingRequest] = await Promise.all([
      this.repo.findActiveBinding(actor.tenantId, employee.id),
      this.repo.findPendingRequestForEmployee(actor.tenantId, employee.id),
    ]);
    return { device, pendingRequest };
  }

  async createChangeRequest(
    actor: ActorContext,
    dto: CreateDeviceChangeRequestDto,
  ): Promise<DeviceChangeRequest> {
    const employee = await this.requireEmployee(actor);

    const pending = await this.repo.findPendingRequestForEmployee(
      actor.tenantId,
      employee.id,
    );
    if (pending) {
      throw new ConflictException({
        errorCode: DeviceErrors.REQUEST_ALREADY_PENDING,
        message:
          'A device change request is already awaiting approval. Contact your administrator.',
      });
    }

    await this.assertDeviceFree(actor.tenantId, dto.newDeviceId, employee.id);

    const settings = await this.getPolicy(actor.tenantId);
    const since = new Date(Date.now() - QUOTA_WINDOW_DAYS * DAY_MS);
    const recent = await this.repo.countRequestsSince(
      actor.tenantId,
      employee.id,
      since,
    );
    if (recent >= settings.requestsPer90Days) {
      throw new ForbiddenException({
        errorCode: DeviceErrors.CHANGE_QUOTA_EXCEEDED,
        message:
          'You have reached the device change limit for this period. Your administrator must change the device for you.',
      });
    }

    const current = await this.repo.findActiveBinding(
      actor.tenantId,
      employee.id,
    );

    const request = await this.prisma.deviceChangeRequest.create({
      data: {
        tenantId: actor.tenantId,
        employeeId: employee.id,
        currentDeviceId: current?.deviceId ?? null,
        newDeviceId: dto.newDeviceId,
        newDeviceName: dto.deviceName,
        newPlatform: dto.platform,
        newOsVersion: dto.osVersion,
        newAppVersion: dto.appVersion,
        newModel: dto.model,
        newManufacturer: dto.manufacturer,
        reason: dto.reason,
        notes: dto.notes,
        status: DeviceChangeStatus.PENDING,
        expiresAt: new Date(Date.now() + settings.expiryDays * DAY_MS),
        createdBy: actor.userId,
      },
    });

    // The new device's public key is not stored on the request: it is supplied
    // again at bind time by the device that ends up being approved, so an
    // approval cannot hand trust to a key captured earlier.
    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'device_change_request',
      entityId: request.id,
      action: 'DEVICE_CHANGE_REQUESTED',
      severity: 'MEDIUM',
      newValue: {
        employeeId: employee.id,
        currentDeviceId: current?.deviceId ?? null,
        newDeviceId: dto.newDeviceId,
        reason: dto.reason,
      },
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      deviceId: dto.newDeviceId,
    });

    return request;
  }

  async cancelChangeRequest(
    actor: ActorContext,
    requestId: string,
  ): Promise<DeviceChangeRequest> {
    const employee = await this.requireEmployee(actor);
    const request = await this.repo.findRequest(actor.tenantId, requestId);

    if (!request || request.employeeId !== employee.id) {
      throw new NotFoundException('Device change request not found');
    }
    if (request.status !== DeviceChangeStatus.PENDING) {
      throw new BadRequestException(
        'Only a pending request can be cancelled.',
      );
    }

    const updated = await this.prisma.deviceChangeRequest.update({
      where: { id: request.id },
      data: {
        status: DeviceChangeStatus.CANCELLED,
        updatedBy: actor.userId,
      },
    });

    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'device_change_request',
      entityId: request.id,
      action: 'DEVICE_CHANGE_CANCELLED',
      severity: 'LOW',
      requestId: actor.requestId,
    });

    return updated;
  }

  // ── Admin / HR ───────────────────────────────────────────────────────────

  async listDevices(
    actor: ActorContext,
    search?: string,
    skip = 0,
    take = 50,
  ): Promise<{ rows: EmployeeDevice[]; total: number }> {
    return this.repo.listDevices(
      actor.tenantId,
      search,
      Math.max(skip, 0),
      Math.min(Math.max(take, 1), 200),
    );
  }

  async listChangeRequests(
    actor: ActorContext,
    status?: string,
    skip = 0,
    take = 50,
  ): Promise<{
    rows: Array<DeviceChangeRequest & { priorRequestCount: number }>;
    total: number;
  }> {
    const { rows, total } = await this.repo.listRequests(
      actor.tenantId,
      status,
      Math.max(skip, 0),
      Math.min(Math.max(take, 1), 200),
    );

    // How often this employee has asked before is the signal an approver needs
    // to spot a device being passed around; without it every request looks new.
    const counts = await this.repo.countRequestsForEmployees(
      actor.tenantId,
      rows.map((r) => r.employeeId),
    );

    return {
      rows: rows.map((r) => ({
        ...r,
        priorRequestCount: counts.get(r.employeeId) ?? 0,
      })),
      total,
    };
  }

  /**
   * Approve: revoke the old binding, bind the new handset, and cut every
   * session the employee holds. Cutting sessions is required by
   * DeviceSecurity.md §12 — a device that keeps a live refresh token after
   * being replaced is still a working credential.
   */
  async approveChangeRequest(
    actor: ActorContext,
    requestId: string,
  ): Promise<DeviceChangeRequest> {
    const request = await this.repo.findRequest(actor.tenantId, requestId);
    if (!request) throw new NotFoundException('Device change request not found');
    if (request.status !== DeviceChangeStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed.');
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new BadRequestException({
        message:
          'This request has expired. Ask the employee to raise a new one.',
      });
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: request.employeeId, tenantId: actor.tenantId },
      select: { id: true, userId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.assertDeviceFree(
      actor.tenantId,
      request.newDeviceId,
      request.employeeId,
    );

    const now = new Date();
    const [, , updated] = await this.prisma.$transaction([
      // Old binding out.
      this.prisma.employeeDevice.updateMany({
        where: {
          tenantId: actor.tenantId,
          employeeId: request.employeeId,
          isTrusted: true,
        },
        data: {
          isTrusted: false,
          revokedAt: now,
          revokedReason: 'REPLACED',
          updatedBy: actor.userId,
        },
      }),
      // New binding in, but not yet usable: publicKey stays empty and is filled
      // by claimApprovedDevice() when the approved handset first presents its
      // own key. An approver never handles the key, so approval cannot hand
      // trust to a key captured from somewhere else.
      this.prisma.employeeDevice.upsert({
        where: {
          tenantId_deviceId: {
            tenantId: actor.tenantId,
            deviceId: request.newDeviceId,
          },
        },
        create: {
          tenantId: actor.tenantId,
          employeeId: request.employeeId,
          deviceId: request.newDeviceId,
          publicKey: '',
          isTrusted: true,
          boundAt: now,
          deviceName: request.newDeviceName,
          platform: request.newPlatform,
          osVersion: request.newOsVersion,
          appVersion: request.newAppVersion,
          model: request.newModel,
          manufacturer: request.newManufacturer,
          createdBy: actor.userId,
        },
        update: {
          employeeId: request.employeeId,
          isTrusted: true,
          revokedAt: null,
          revokedReason: null,
          boundAt: now,
          deviceName: request.newDeviceName,
          platform: request.newPlatform,
          osVersion: request.newOsVersion,
          appVersion: request.newAppVersion,
          model: request.newModel,
          manufacturer: request.newManufacturer,
          updatedBy: actor.userId,
        },
      }),
      this.prisma.deviceChangeRequest.update({
        where: { id: request.id },
        data: {
          status: DeviceChangeStatus.APPROVED,
          reviewedBy: actor.userId,
          reviewedAt: now,
          updatedBy: actor.userId,
        },
      }),
      this.prisma.employee.update({
        where: { id: request.employeeId },
        data: { deviceBoundAt: now, updatedBy: actor.userId },
      }),
    ]);

    // Outside the transaction: session revocation is best-effort cleanup, and
    // must not roll back an otherwise-approved change.
    if (employee.userId) {
      try {
        await this.sessions.revokeAllForUser(
          actor.tenantId,
          employee.userId,
          'DEVICE_REPLACED',
        );
      } catch (error) {
        this.logger.error(
          `Session revocation failed after device change ${request.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'device_change_request',
      entityId: request.id,
      action: 'DEVICE_CHANGE_APPROVED',
      severity: 'HIGH',
      oldValue: { deviceId: request.currentDeviceId },
      newValue: {
        employeeId: request.employeeId,
        deviceId: request.newDeviceId,
        reason: request.reason,
      },
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated as DeviceChangeRequest;
  }

  async rejectChangeRequest(
    actor: ActorContext,
    requestId: string,
    rejectionReason: string,
  ): Promise<DeviceChangeRequest> {
    const request = await this.repo.findRequest(actor.tenantId, requestId);
    if (!request) throw new NotFoundException('Device change request not found');
    if (request.status !== DeviceChangeStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed.');
    }

    const updated = await this.prisma.deviceChangeRequest.update({
      where: { id: request.id },
      data: {
        status: DeviceChangeStatus.REJECTED,
        rejectionReason,
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        updatedBy: actor.userId,
      },
    });

    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'device_change_request',
      entityId: request.id,
      action: 'DEVICE_CHANGE_REJECTED',
      severity: 'MEDIUM',
      newValue: { employeeId: request.employeeId, rejectionReason },
      requestId: actor.requestId,
    });

    return updated;
  }

  /** Admin force-revoke. Leaves the employee unbound until they re-onboard. */
  async revokeDevice(
    actor: ActorContext,
    deviceRowId: string,
    reason?: string,
  ): Promise<EmployeeDevice> {
    const device = await this.prisma.employeeDevice.findFirst({
      where: { id: deviceRowId, tenantId: actor.tenantId },
    });
    if (!device) throw new NotFoundException('Device not found');

    const employee = await this.prisma.employee.findFirst({
      where: { id: device.employeeId, tenantId: actor.tenantId },
      select: { id: true, userId: true },
    });

    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.employeeDevice.update({
        where: { id: device.id },
        data: {
          isTrusted: false,
          revokedAt: now,
          revokedReason: 'ADMIN_REVOKED',
          updatedBy: actor.userId,
        },
      }),
      // Clearing deviceBoundAt re-arms the onboarding gate, so the employee is
      // sent back through binding rather than left silently unable to punch.
      this.prisma.employee.update({
        where: { id: device.employeeId },
        data: { deviceBoundAt: null, updatedBy: actor.userId },
      }),
    ]);

    if (employee?.userId) {
      try {
        await this.sessions.revokeAllForUser(
          actor.tenantId,
          employee.userId,
          'DEVICE_REVOKED',
        );
      } catch (error) {
        this.logger.error(
          `Session revocation failed after device revoke ${device.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    void this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'DEVICES',
      entityName: 'employee_device',
      entityId: device.id,
      action: 'DEVICE_REVOKED',
      severity: 'HIGH',
      oldValue: { deviceId: device.deviceId, isTrusted: true },
      newValue: { isTrusted: false, reason: reason ?? 'ADMIN_REVOKED' },
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async requireEmployee(
    actor: ActorContext,
  ): Promise<{ id: string; tenantId: string }> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: actor.userId,
        tenantId: actor.tenantId,
        deletedAt: null,
      },
      select: { id: true, tenantId: true },
    });
    if (!employee) {
      throw new ForbiddenException('This account is not an employee.');
    }
    return employee;
  }

  /**
   * A handset already bound to a different employee must not be re-bound: that
   * is the shared-phone case the whole module exists to stop.
   */
  private async assertDeviceFree(
    tenantId: string,
    deviceId: string,
    employeeId: string,
  ): Promise<void> {
    const existing = await this.repo.findDeviceById(tenantId, deviceId);
    if (
      existing &&
      existing.employeeId !== employeeId &&
      existing.isTrusted &&
      !existing.revokedAt
    ) {
      throw new ConflictException({
        errorCode: DeviceErrors.DEVICE_IN_USE,
        message:
          'This device is already bound to another employee. It must be revoked before it can be reused.',
      });
    }
  }

  private async getPolicy(
    tenantId: string,
  ): Promise<{ requestsPer90Days: number; expiryDays: number }> {
    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: {
        deviceChangeRequestsPer90Days: true,
        deviceChangeRequestExpiryDays: true,
      },
    });
    return {
      requestsPer90Days: settings?.deviceChangeRequestsPer90Days ?? 2,
      expiryDays: settings?.deviceChangeRequestExpiryDays ?? 7,
    };
  }
}

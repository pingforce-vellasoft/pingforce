import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../auth/session.service';
import { ResetGateChainDto } from './dto/reset-gate-chain.dto';

/** Result of a rewind — the gate flags as they now stand. */
export interface GateChainState {
  readonly userId: string;
  readonly email: string;
  readonly tenantId: string;
  readonly mustChangePassword: boolean;
  readonly isOnboarded: boolean;
  readonly deviceBound: boolean;
  readonly passwordReset: boolean;
  /** Device-local, cleared by reinstalling or clearing app storage. */
  readonly note: string;
}

/**
 * Non-production test support for the mobile gate chain.
 *
 * The mobile RouteGuard chain (auth → forced password change → profile setup →
 * device binding → permissions) is one-way: each screen clears its own flag and
 * the account never returns to that state. On a real handset there is no way
 * back — an onboarded, device-bound employee cannot re-enter the chain, so the
 * gates cannot be re-tested without editing the database by hand.
 *
 * This service rewinds one account so the chain replays. It exists solely to
 * make the chain testable from an installed APK.
 *
 * SECURITY: this undoes authentication state — it clears the forced-password
 * flag, deletes the profile, and unbinds the handset an employee's attendance
 * is pinned to. Unbinding in particular defeats the anti-buddy-punching control
 * (DeviceManagement.md): an attacker who could call this would re-bind
 * attendance to a device of their choosing. It is therefore:
 *   1. refused unless NODE_ENV is explicitly 'development' or 'test', AND
 *   2. gated behind ALLOW_TEST_RESET_ENDPOINT=true, AND
 *   3. restricted to super-admin callers (never a tenant role).
 * TestingModule is not imported at all outside those environments, so in
 * production the route does not exist. The runtime check below is the backstop
 * for a misconfigured deploy.
 */
@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
  ) {}

  /** True only in a non-production environment that opted in explicitly. */
  static isEnabled(): boolean {
    const env = process.env.NODE_ENV;
    const optedIn = process.env.ALLOW_TEST_RESET_ENDPOINT === 'true';
    return (env === 'development' || env === 'test') && optedIn;
  }

  private assertEnabled(): void {
    if (!TestingService.isEnabled()) {
      // Deliberately opaque: a production caller learns nothing about the
      // endpoint's existence beyond "not here".
      throw new NotFoundException('Not found');
    }
  }

  /**
   * Rewinds one account to the start of the gate chain so a tester can walk it
   * again from an installed APK. Idempotent — a second call on an already-reset
   * account is a no-op that returns the same state.
   */
  async resetGateChain(
    dto: ResetGateChainDto,
    actor: { readonly superAdminId: string; readonly requestId?: string },
  ): Promise<GateChainState> {
    this.assertEnabled();

    const tenant = await this.prisma.tenant.findFirst({
      where: { code: dto.tenantCode, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`No tenant with code ${dto.tenantCode}`);
    }

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: dto.email, deletedAt: null },
      include: { employee: { select: { id: true } } },
    });
    if (!user) {
      throw new NotFoundException(
        `No user ${dto.email} in tenant ${dto.tenantCode}`,
      );
    }

    // Guard against pointing this at a live account. Test accounts must be
    // opt-in by convention so a mistyped email cannot wipe a real employee's
    // profile and device binding.
    if (!this.looksLikeTestAccount(dto.email)) {
      throw new ForbiddenException(
        'Refusing to reset an account whose email does not mark it as a test ' +
          'account. Use an address containing "gatetest" or "+gatetest".',
      );
    }

    const resetPasswordChange = dto.resetPasswordChange ?? true;
    const resetProfile = dto.resetProfile ?? true;
    const resetDeviceBinding = dto.resetDeviceBinding ?? true;

    const passwordHash = dto.password
      ? await argon2.hash(dto.password)
      : undefined;

    // One transaction: a half-applied rewind leaves the account in a state the
    // chain cannot clear (e.g. profile gone but handset still bound).
    const writes = [];

    writes.push(
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(resetPasswordChange ? { mustChangePassword: true } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          // Force every existing token to fail validation, so the handset is
          // pushed back to the login screen rather than resuming mid-chain
          // with stale flags cached in AuthSession.
          tokenVersion: { increment: 1 },
          updatedBy: actor.superAdminId,
        },
      }),
    );

    if (resetProfile) {
      writes.push(
        this.prisma.userProfile.deleteMany({ where: { userId: user.id } }),
      );
    }

    if (resetDeviceBinding && user.employee) {
      writes.push(
        this.prisma.employee.update({
          where: { id: user.employee.id },
          data: { deviceBoundAt: null, updatedBy: actor.superAdminId },
        }),
        // Hard delete, not revoke: a revoked row still occupies the
        // (tenantId, deviceId) unique slot, and bindDevice's upsert would
        // reuse it. Deleting lets the same handset bind fresh, which is the
        // whole point of the rewind. Safe because this is test data only.
        this.prisma.employeeDevice.deleteMany({
          where: { tenantId: tenant.id, employeeId: user.employee.id },
        }),
        this.prisma.deviceChangeRequest.deleteMany({
          where: { tenantId: tenant.id, employeeId: user.employee.id },
        }),
      );
    }

    await this.prisma.$transaction(writes);

    // Cut live sessions so the app cannot keep using a token minted before the
    // rewind.
    await this.sessions.revokeAllForUser(tenant.id, user.id, 'TEST_RESET');

    void this.audit.log({
      tenantId: tenant.id,
      actorId: actor.superAdminId,
      module: 'TESTING',
      entityName: 'user',
      entityId: user.id,
      action: 'GATE_CHAIN_RESET',
      severity: 'HIGH',
      outcome: 'SUCCESS',
      requestId: actor.requestId,
      newValue: {
        resetPasswordChange,
        resetProfile,
        resetDeviceBinding,
        passwordChanged: !!passwordHash,
      },
    });

    this.logger.warn(
      `Gate chain reset for ${dto.email} (tenant ${dto.tenantCode}) by super admin ${actor.superAdminId}`,
    );

    return {
      userId: user.id,
      email: dto.email,
      tenantId: tenant.id,
      mustChangePassword: resetPasswordChange,
      isOnboarded: !resetProfile,
      deviceBound: user.employee ? !resetDeviceBinding : true,
      passwordReset: !!passwordHash,
      note:
        'permissionsFlowSeen is device-local (secure storage) and is NOT reset ' +
        'here. Clear app storage or reinstall the APK to replay the ' +
        'permissions gate.',
    };
  }

  /**
   * Reads the current gate flags without changing anything — the server half of
   * "which gate am I stuck on?".
   */
  async inspectGateChain(
    tenantCode: string,
    email: string,
  ): Promise<GateChainState> {
    this.assertEnabled();

    const tenant = await this.prisma.tenant.findFirst({
      where: { code: tenantCode, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`No tenant with code ${tenantCode}`);
    }

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email, deletedAt: null },
      include: {
        profile: { select: { id: true } },
        employee: { select: { deviceBoundAt: true } },
      },
    });
    if (!user) {
      throw new NotFoundException(`No user ${email} in tenant ${tenantCode}`);
    }

    return {
      userId: user.id,
      email,
      tenantId: tenant.id,
      mustChangePassword: user.mustChangePassword,
      isOnboarded: !!user.profile,
      deviceBound: user.employee ? !!user.employee.deviceBoundAt : true,
      passwordReset: false,
      note: 'permissionsFlowSeen is device-local and not visible to the server.',
    };
  }

  /**
   * Test accounts must announce themselves in the local part of the address.
   * Keeps a fat-fingered email from destroying a real employee's onboarding
   * state and handset binding.
   */
  private looksLikeTestAccount(email: string): boolean {
    return email.toLowerCase().includes('gatetest');
  }
}

import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  CreateFaultCommand,
  UpdateFaultCommand,
  UpdateFaultStatusCommand,
  AssignFaultCommand,
  AddFaultNoteCommand,
  SetTimelineVisibilityCommand,
  EscalateFaultCommand,
  RemoveFaultCommand,
} from './impl';
import {
  FaultAssignedEvent,
  FaultCreatedEvent,
  FaultEscalatedEvent,
  FaultReopenedEvent,
  FaultStatusUpdatedEvent,
} from '../events/impl';
import { assertTransitionNote, FaultState } from '../domain/fault-state';
import { FaultsRepository } from '../faults.repository';
import { FaultAccessService } from '../fault-access.service';
import {
  IPrismaService,
  SlaComputationService,
} from '@pingforce-monorepo/shared';
import { Inject, BadRequestException, NotFoundException } from '@nestjs/common';

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

@CommandHandler(CreateFaultCommand)
export class CreateFaultHandler implements ICommandHandler<CreateFaultCommand> {
  constructor(
    private readonly faultsRepository: FaultsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly slaComputationService: SlaComputationService,
    private readonly eventBus: EventBus,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: CreateFaultCommand) {
    const { tenantId, currentUser, createFaultDto } = command;
    try {
      await this.faultAccess.scopeForAction(
        tenantId,
        currentUser.userId,
        'CREATE',
      );
      if (createFaultDto.assignToSelf && createFaultDto.assignedToId) {
        throw new BadRequestException(
          'Use either assignToSelf or assignedToId, not both',
        );
      }
      const { assignToSelf, ...faultInput } = createFaultDto;
      const assignedToId = assignToSelf
        ? currentUser.userId
        : createFaultDto.assignedToId;
      await this.faultAccess.assertAssignmentAllowed(
        tenantId,
        currentUser.userId,
        assignedToId,
      );

      // Soft-deleted customers/users are not valid fault references.
      if (createFaultDto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: createFaultDto.customerId, tenantId, deletedAt: null },
        });
        if (!customer)
          throw new BadRequestException(
            'Invalid customer or does not belong to this tenant',
          );
      }
      if (assignedToId) {
        const user = await this.prisma.user.findFirst({
          where: {
            id: assignedToId,
            tenantId,
            deletedAt: null,
            status: 'ACTIVE',
          },
        });
        if (!user)
          throw new BadRequestException(
            'Invalid user or does not belong to this tenant',
          );
      }

      let slaDeadline: Date | null = null;
      const priority = createFaultDto.priority || 'MEDIUM';

      const slaPolicy = await this.prisma.slaPolicy.findFirst({
        where: { tenantId, priority, deletedAt: null },
      });

      if (slaPolicy) {
        slaDeadline = this.slaComputationService.calculateSlaDeadline(
          slaPolicy.resolveInHours,
        );
      }

      const fault = await this.faultsRepository.createFaultWithTimeline(
        tenantId,
        currentUser.userId,
        { ...faultInput, assignedToId },
        slaDeadline,
      );

      this.eventBus.publish(
        new FaultCreatedEvent(
          tenantId,
          fault.id,
          fault.faultNumber,
          fault.title,
          fault.priority,
          fault.customerId || undefined,
          fault.assignedToId || undefined,
        ),
      );
      if (fault.assignedToId) {
        this.eventBus.publish(
          new FaultAssignedEvent(
            tenantId,
            fault.id,
            fault.faultNumber,
            fault.assignedToId,
            currentUser.userId,
          ),
        );
      }
      return fault;
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002'))
        throw new BadRequestException('Fault number already exists');
      throw error;
    }
  }
}

@CommandHandler(UpdateFaultCommand)
export class UpdateFaultHandler implements ICommandHandler<UpdateFaultCommand> {
  constructor(
    private readonly faultsRepository: FaultsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly slaComputationService: SlaComputationService,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: UpdateFaultCommand) {
    const { tenantId, id, currentUser, updateFaultDto } = command;
    const scopeWhere = await this.faultAccess.scopeForAction(
      tenantId,
      currentUser.userId,
      'UPDATE',
    );
    try {
      if (updateFaultDto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: updateFaultDto.customerId, tenantId, deletedAt: null },
          select: { id: true },
        });
        if (!customer)
          throw new BadRequestException('Invalid customer for this tenant');
      }
      let slaDeadline: Date | undefined = undefined;

      if (updateFaultDto.priority) {
        const slaPolicy = await this.prisma.slaPolicy.findFirst({
          where: {
            tenantId,
            priority: updateFaultDto.priority,
            deletedAt: null,
          },
        });
        if (slaPolicy) {
          slaDeadline = this.slaComputationService.calculateSlaDeadline(
            slaPolicy.resolveInHours,
          );
          // Carry over any SLA time already banked while the fault was on hold,
          // otherwise a priority change would silently reclaim it.
          const existing = await this.prisma.fault.findFirst({
            where: { ...scopeWhere, id, tenantId, deletedAt: null },
            select: { slaPausedMinutes: true },
          });
          if (existing?.slaPausedMinutes) {
            slaDeadline = new Date(
              slaDeadline.getTime() + existing.slaPausedMinutes * 60000,
            );
          }
        }
      }

      return await this.faultsRepository.updateFault(
        tenantId,
        id,
        currentUser.userId,
        updateFaultDto,
        slaDeadline,
        scopeWhere,
      );
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2025')) throw new NotFoundException();
      throw error;
    }
  }
}

@CommandHandler(UpdateFaultStatusCommand)
export class UpdateFaultStatusHandler
  implements ICommandHandler<UpdateFaultStatusCommand>
{
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly eventBus: EventBus,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: UpdateFaultStatusCommand) {
    const { tenantId, id, currentUser, updateFaultStatusDto } = command;
    const scopeWhere = await this.faultAccess.scopeForAction(
      tenantId,
      currentUser.userId,
      'UPDATE',
    );
    assertTransitionNote(
      updateFaultStatusDto.status,
      updateFaultStatusDto.notes,
    );
    const fault = await this.faultsRepository.updateStatus(
      tenantId,
      id,
      currentUser.userId,
      updateFaultStatusDto.status,
      updateFaultStatusDto.notes?.trim() ||
        `Status updated to ${updateFaultStatusDto.status}`,
      updateFaultStatusDto.clientRef,
      scopeWhere,
    );
    this.eventBus.publish(
      new FaultStatusUpdatedEvent(
        tenantId,
        fault.id,
        fault.status,
        fault.customerId || undefined,
        fault.faultNumber,
      ),
    );
    if (fault.status === FaultState.REOPENED) {
      this.eventBus.publish(
        new FaultReopenedEvent(
          tenantId,
          fault.id,
          fault.faultNumber,
          fault.assignedToId || undefined,
        ),
      );
    }
    return fault;
  }
}

@CommandHandler(AssignFaultCommand)
export class AssignFaultHandler implements ICommandHandler<AssignFaultCommand> {
  constructor(
    private readonly faultsRepository: FaultsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly eventBus: EventBus,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: AssignFaultCommand) {
    const { tenantId, id, currentUser, assignFaultDto } = command;
    const scopeWhere = await this.faultAccess.scopeForAction(
      tenantId,
      currentUser.userId,
      'ASSIGN',
    );
    const assignedToId = assignFaultDto.assignedToId ?? null;
    await this.faultAccess.assertAssignmentAllowed(
      tenantId,
      currentUser.userId,
      assignedToId ?? undefined,
    );

    if (assignedToId) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: assignedToId,
          tenantId,
          deletedAt: null,
          status: 'ACTIVE',
        },
      });
      if (!user)
        throw new BadRequestException(
          'Invalid user or does not belong to this tenant',
        );
    }

    const fault = await this.faultsRepository.assignFault(
      tenantId,
      id,
      currentUser.userId,
      assignedToId,
      assignFaultDto.notes,
      scopeWhere,
    );

    if (assignedToId) {
      this.eventBus.publish(
        new FaultAssignedEvent(
          tenantId,
          fault.id,
          fault.faultNumber,
          assignedToId,
          currentUser.userId,
        ),
      );
    }
    return fault;
  }
}

@CommandHandler(AddFaultNoteCommand)
export class AddFaultNoteHandler
  implements ICommandHandler<AddFaultNoteCommand>
{
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: AddFaultNoteCommand) {
    const { tenantId, id, currentUser, dto } = command;
    const scopeWhere = await this.faultAccess.scopeForAction(
      tenantId,
      currentUser.userId,
      'UPDATE',
    );
    return this.faultsRepository.addNote(
      tenantId,
      id,
      currentUser.userId,
      dto.notes,
      dto.isCustomerVisible ?? false,
      scopeWhere,
    );
  }
}

@CommandHandler(SetTimelineVisibilityCommand)
export class SetTimelineVisibilityHandler
  implements ICommandHandler<SetTimelineVisibilityCommand>
{
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: SetTimelineVisibilityCommand) {
    const scopeWhere = await this.faultAccess.scopeForAction(
      command.tenantId,
      command.currentUser.userId,
      'UPDATE',
    );
    return this.faultsRepository.setTimelineVisibility(
      command.tenantId,
      command.faultId,
      command.entryId,
      command.isCustomerVisible,
      scopeWhere,
    );
  }
}

@CommandHandler(EscalateFaultCommand)
export class EscalateFaultHandler
  implements ICommandHandler<EscalateFaultCommand>
{
  constructor(
    private readonly faultsRepository: FaultsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly eventBus: EventBus,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: EscalateFaultCommand) {
    const { tenantId, id, currentUser } = command;
    const scopeWhere = await this.faultAccess.scopeForAction(
      tenantId,
      currentUser.userId,
      'ESCALATE',
    );
    const fault = await this.faultsRepository.findById(
      tenantId,
      id,
      scopeWhere,
    );
    if (!fault) throw new NotFoundException(`Fault with ID ${id} not found`);

    const slaPolicy = await this.prisma.slaPolicy.findFirst({
      where: { tenantId, priority: fault.priority, deletedAt: null },
    });
    const escalateToId = slaPolicy?.escalateToId || undefined;

    const updatedFault = await this.faultsRepository.escalateFault(
      tenantId,
      id,
      currentUser.userId,
      escalateToId,
      scopeWhere,
    );
    this.eventBus.publish(
      new FaultEscalatedEvent(tenantId, updatedFault.id, escalateToId),
    );
    return updatedFault;
  }
}

@CommandHandler(RemoveFaultCommand)
export class RemoveFaultHandler implements ICommandHandler<RemoveFaultCommand> {
  constructor(
    private readonly faultsRepository: FaultsRepository,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async execute(command: RemoveFaultCommand) {
    const scopeWhere = await this.faultAccess.scopeForAction(
      command.tenantId,
      command.currentUser.userId,
      'DELETE',
    );
    return await this.faultsRepository.delete(
      command.tenantId,
      command.id,
      scopeWhere,
      command.currentUser.userId,
    );
  }
}

export const CommandHandlers = [
  CreateFaultHandler,
  UpdateFaultHandler,
  UpdateFaultStatusHandler,
  AssignFaultHandler,
  AddFaultNoteHandler,
  SetTimelineVisibilityHandler,
  EscalateFaultHandler,
  RemoveFaultHandler,
];

import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  CreateFaultCommand,
  UpdateFaultCommand,
  UpdateFaultStatusCommand,
  EscalateFaultCommand,
  RemoveFaultCommand,
} from './impl';
import { FaultEscalatedEvent, FaultStatusUpdatedEvent } from '../events/impl';
import { FaultsRepository } from '../faults.repository';
import {
  IPrismaService,
  SlaComputationService,
} from '@pingforce-monorepo/shared';
import { Inject, BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(CreateFaultCommand)
export class CreateFaultHandler implements ICommandHandler<CreateFaultCommand> {
  constructor(
    private readonly faultsRepository: FaultsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly slaComputationService: SlaComputationService,
  ) {}

  async execute(command: CreateFaultCommand) {
    const { tenantId, currentUser, createFaultDto } = command;
    try {
      if (createFaultDto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: createFaultDto.customerId, tenantId },
        });
        if (!customer)
          throw new BadRequestException(
            'Invalid customer or does not belong to this tenant',
          );
      }
      if (createFaultDto.assignedToId) {
        const user = await this.prisma.user.findFirst({
          where: { id: createFaultDto.assignedToId, tenantId },
        });
        if (!user)
          throw new BadRequestException(
            'Invalid user or does not belong to this tenant',
          );
      }

      let slaDeadline: Date | null = null;
      const priority = createFaultDto.priority || 'MEDIUM';

      const slaPolicy = await this.prisma.slaPolicy.findUnique({
        where: { tenantId_priority: { tenantId, priority } },
      });

      if (slaPolicy) {
        slaDeadline = this.slaComputationService.calculateSlaDeadline(
          slaPolicy.resolveInHours,
        );
      }

      return await this.faultsRepository.createFaultWithTimeline(
        tenantId,
        currentUser.userId,
        createFaultDto,
        slaDeadline,
      );
    } catch (error: any) {
      if (error.code === 'P2002')
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
  ) {}

  async execute(command: UpdateFaultCommand) {
    const { tenantId, id, currentUser, updateFaultDto } = command;
    try {
      let slaDeadline: Date | undefined = undefined;

      if (updateFaultDto.priority) {
        const slaPolicy = await this.prisma.slaPolicy.findUnique({
          where: {
            tenantId_priority: { tenantId, priority: updateFaultDto.priority },
          },
        });
        if (slaPolicy)
          slaDeadline = this.slaComputationService.calculateSlaDeadline(
            slaPolicy.resolveInHours,
          );
      }

      return await this.faultsRepository.updateFault(
        tenantId,
        id,
        currentUser.userId,
        updateFaultDto,
        slaDeadline,
      );
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
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
  ) {}

  async execute(command: UpdateFaultStatusCommand) {
    const { tenantId, id, currentUser, updateFaultStatusDto } = command;
    const fault = await this.faultsRepository.updateStatus(
      tenantId,
      id,
      currentUser.userId,
      updateFaultStatusDto.status,
      updateFaultStatusDto.notes ||
        `Status updated to ${updateFaultStatusDto.status}`,
      updateFaultStatusDto.clientRef,
    );
    this.eventBus.publish(
      new FaultStatusUpdatedEvent(
        tenantId,
        fault.id,
        fault.status,
        fault.customerId || undefined,
      ),
    );
    return fault;
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
  ) {}

  async execute(command: EscalateFaultCommand) {
    const { tenantId, id, currentUser } = command;
    const fault = await this.faultsRepository.findById(tenantId, id);
    if (!fault) throw new NotFoundException(`Fault with ID ${id} not found`);

    const slaPolicy = await this.prisma.slaPolicy.findUnique({
      where: { tenantId_priority: { tenantId, priority: fault.priority } },
    });
    const escalateToId = slaPolicy?.escalateToId || undefined;

    const updatedFault = await this.faultsRepository.escalateFault(
      tenantId,
      id,
      currentUser.userId,
      escalateToId,
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
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveFaultCommand) {
    return await this.faultsRepository.delete(command.tenantId, command.id);
  }
}

export const CommandHandlers = [
  CreateFaultHandler,
  UpdateFaultHandler,
  UpdateFaultStatusHandler,
  EscalateFaultHandler,
  RemoveFaultHandler,
];

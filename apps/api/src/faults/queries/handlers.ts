import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetFaultsQuery, GetAssignedFaultsQuery, GetFaultByIdQuery, GetBreachedFaultsQuery } from './impl';
import { FaultsRepository } from '../faults.repository';
import { NotFoundException } from '@nestjs/common';

@QueryHandler(GetFaultsQuery)
export class GetFaultsHandler implements IQueryHandler<GetFaultsQuery> {
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetFaultsQuery) {
    return await this.faultsRepository.findAll(query.tenantId, query.skip, query.take);
  }
}

@QueryHandler(GetAssignedFaultsQuery)
export class GetAssignedFaultsHandler implements IQueryHandler<GetAssignedFaultsQuery> {
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetAssignedFaultsQuery) {
    return await this.faultsRepository.findAssignedToMe(query.tenantId, query.userId, query.skip, query.take);
  }
}

@QueryHandler(GetFaultByIdQuery)
export class GetFaultByIdHandler implements IQueryHandler<GetFaultByIdQuery> {
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetFaultByIdQuery) {
    const fault = await this.faultsRepository.findById(query.tenantId, query.id);
    if (!fault) throw new NotFoundException(`Fault with ID ${query.id} not found`);
    return fault;
  }
}

@QueryHandler(GetBreachedFaultsQuery)
export class GetBreachedFaultsHandler implements IQueryHandler<GetBreachedFaultsQuery> {
  constructor(private readonly faultsRepository: FaultsRepository) {}
  async execute(query: GetBreachedFaultsQuery) {
    return await this.faultsRepository.findBreached(query.tenantId, query.skip, query.take);
  }
}

export const QueryHandlers = [GetFaultsHandler, GetAssignedFaultsHandler, GetFaultByIdHandler, GetBreachedFaultsHandler];

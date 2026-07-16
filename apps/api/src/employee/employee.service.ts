import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeRepository } from '@pingforce-monorepo/shared';
import { PaginationDto } from '@pingforce-monorepo/dto';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly rbacService: RbacService,
  ) {}

  async create(tenantId: string, createEmployeeDto: CreateEmployeeDto) {
    const payload = {
      ...createEmployeeDto,
      joiningDate: createEmployeeDto.joiningDate
        ? new Date(createEmployeeDto.joiningDate)
        : undefined,
    };

    // The repository base method automatically injects tenantId
    return await this.employeeRepository.create(tenantId, payload);
  }

  async findAll(
    tenantId: string,
    requesterUserId: string,
    pagination: PaginationDto = {},
  ) {
    // Data scope (DataScope.md §9 "Users"): employees see self, managers
    // their team, tenant admins the whole tenant.
    const scope = await this.rbacService.resolveScopeIds(
      tenantId,
      requesterUserId,
      'EMPLOYEES',
      ['READ'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope, 'id');
    if (scopeWhere === null) return [];

    // Default fallback standardize via DTO, but we enforce limit here just in case
    const limit = Math.min(pagination.take || 50, 100);
    return await this.employeeRepository.findAllWithRelations(
      tenantId,
      limit,
      pagination.cursor,
      scopeWhere,
    );
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.employeeRepository.findOneWithRelations(
      tenantId,
      id,
    );

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(
    tenantId: string,
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const payload = {
      ...updateEmployeeDto,
      joiningDate: updateEmployeeDto.joiningDate
        ? new Date(updateEmployeeDto.joiningDate)
        : undefined,
    };

    return await this.employeeRepository.update(tenantId, id, payload);
  }

  async remove(tenantId: string, id: string) {
    return await this.employeeRepository.delete(tenantId, id);
  }
}

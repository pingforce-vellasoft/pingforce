import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ShiftService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(tenantId: string, dto: CreateShiftDto) {
    const shift = await this.prisma.shift.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        startTime: dto.startTime,
        endTime: dto.endTime,
        gracePeriod: dto.gracePeriod || 15,
      },
    });

    await this.cacheManager.del(`shifts_${tenantId}`);
    return shift;
  }

  async findAll(tenantId: string) {
    const cacheKey = `shifts_${tenantId}`;
    const cached = await this.cacheManager.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const shifts = await this.prisma.shift.findMany({
      where: { tenantId },
    });

    await this.cacheManager.set(cacheKey, shifts, 600000); // 10 minutes cache
    return shifts;
  }

  async assignShift(tenantId: string, employeeId: string, shiftId: string, effectiveFrom: Date, effectiveTo?: Date) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId, tenantId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.shiftAssignment.create({
      data: {
        tenantId,
        employeeId,
        shiftId,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      }
    });
  }

  async getAssignedShift(tenantId: string, employeeId: string, targetDate: Date) {
    const date = new Date(targetDate);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.shiftAssignment.findFirst({
      where: {
        tenantId,
        employeeId,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: date } }
        ]
      },
      include: { shift: true }
    });
  }
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class SettingsService {
  constructor(
    @Inject('IPrismaService') private prisma: IPrismaService
  ) {}

  async getSettings(tenantId: string) {
    let settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId }
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await this.prisma.tenantSetting.create({
        data: {
          tenantId
        }
      });
    }

    return settings;
  }

  async updateSettings(tenantId: string, data: any) {
    return this.prisma.tenantSetting.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data
      }
    });
  }
}

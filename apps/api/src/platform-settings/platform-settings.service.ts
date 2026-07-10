import { Injectable, Inject } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getSettings() {
    const cached = await this.cacheManager.get('platform_settings');
    if (cached) return cached;

    const settings = await this.prisma.platformSetting.findMany();
    await this.cacheManager.set('platform_settings', settings, 3600000); // 1 hour
    return settings;
  }

  async getSetting(key: string) {
    const cached = await this.cacheManager.get(`platform_setting_${key}`);
    if (cached) return cached;

    const setting = await this.prisma.platformSetting.findUnique({
      where: { key },
    });

    if (setting) {
      await this.cacheManager.set(`platform_setting_${key}`, setting, 3600000);
    }
    return setting;
  }

  async updateSettings(
    settings: {
      key: string;
      value: string;
      category: string;
      description?: string;
    }[],
    updatedBy: string,
  ) {
    const results = [];
    for (const setting of settings) {
      const res = await this.prisma.platformSetting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedBy,
        },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category,
          description: setting.description,
          updatedBy,
        },
      });
      results.push(res);
      await this.cacheManager.del(`platform_setting_${setting.key}`);
    }
    await this.cacheManager.del('platform_settings');
    return results;
  }
}

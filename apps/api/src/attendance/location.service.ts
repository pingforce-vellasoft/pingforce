import { Injectable, Inject } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class LocationService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService
  ) {}

  /**
   * Validates if a given coordinate is within any active geofence for the tenant.
   * Uses raw SQL with the Haversine formula for efficient distance calculation.
   */
  async isWithinGeofence(tenantId: string, latitude: number, longitude: number): Promise<boolean> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM "geofences" 
      WHERE "tenantId" = ${tenantId} AND "active" = true 
      AND (6371000 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) + 
        sin(radians(${latitude})) * sin(radians(latitude))
      )) <= "radiusMeters"
      LIMIT 1;
    `;
    
    return result.length > 0;
  }
}

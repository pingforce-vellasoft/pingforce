import { Module } from '@nestjs/common';
import { NetworkFeatureGuard } from './guards/network-feature.guard';
import { OlteController } from './olte/olte.controller';
import { OlteService } from './olte/olte.service';
import { ConnectionController } from './connection/connection.controller';
import { ConnectionService } from './connection/connection.service';
import { TopologyService } from './connection/topology.service';
import { NetworkMapController } from './map/map.controller';
import { NetworkMapService } from './map/map.service';
import { NetworkAccessController } from './network-access.controller';

// 3.7 Connection Map — ISP/FTTH network topology and geographic map.
// RbacModule and AuditModule are @Global, so no imports needed here.
@Module({
  controllers: [
    OlteController,
    ConnectionController,
    NetworkMapController,
    NetworkAccessController,
  ],
  providers: [
    NetworkFeatureGuard,
    OlteService,
    ConnectionService,
    TopologyService,
    NetworkMapService,
  ],
})
export class NetworkModule {}

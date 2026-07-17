import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

/** Server-side cap so one huge tenant cannot flatten the map endpoint. */
const MAP_NODE_CAP = 2000;
const SEARCH_TAKE = 25;

const CUSTOMER_SUMMARY_SELECT = {
  select: {
    id: true,
    customerCode: true,
    displayName: true,
    legalName: true,
    status: true,
  },
} as const;

export interface MapQuery {
  readonly olteId?: string;
  readonly status?: string;
  /** OLTE area/district filters — connections follow their OLTE's location. */
  readonly area?: string;
  readonly district?: string;
  /** "minLng,minLat,maxLng,maxLat" */
  readonly bbox?: string;
}

export interface TreeNode {
  id: string;
  connectionCode: string;
  nodeType: string;
  status: string;
  customerId: string | null;
  customer: unknown;
  latitude: number | null;
  longitude: number | null;
  assignedEmployeeId: string | null;
  depth: number;
  children: TreeNode[];
}

/**
 * Read-optimized aggregates for the connection map, tree view, unified
 * search and the network health dashboard (3.7_ConnectionMap §5.2).
 */
@Injectable()
export class NetworkMapService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  /** GeoJSON FeatureCollection: OLTE + connection points and parent-child edges. */
  async getMap(tenantId: string, query: MapQuery): Promise<unknown> {
    const bbox = this.parseBbox(query.bbox);

    const geoFilter = bbox
      ? {
          latitude: { gte: bbox.minLat, lte: bbox.maxLat },
          longitude: { gte: bbox.minLng, lte: bbox.maxLng },
        }
      : { latitude: { not: null }, longitude: { not: null } };

    // Area/district filters live on the OLTE — resolve to an olteId set first.
    const olteWhere = {
      tenantId,
      deletedAt: null,
      ...(query.olteId ? { id: query.olteId } : {}),
      ...(query.area ? { area: query.area } : {}),
      ...(query.district ? { district: query.district } : {}),
    };
    const locationFiltered = Boolean(
      query.olteId || query.area || query.district,
    );

    const oltes = await this.prisma.olte.findMany({
      where: { ...olteWhere, ...geoFilter },
      take: MAP_NODE_CAP,
    });

    const connections = await this.prisma.networkConnection.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(locationFiltered ? { olteId: { in: oltes.map((o) => o.id) } } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...geoFilter,
      },
      include: {
        customer: CUSTOMER_SUMMARY_SELECT,
        parentConnection: {
          select: { id: true, latitude: true, longitude: true, olteId: true },
        },
      },
      take: MAP_NODE_CAP + 1,
    });

    return this.toFeatureCollection(oltes, connections);
  }

  /**
   * Employee-scoped map (READ_OWN): only the caller's assigned connections
   * plus their upstream route context (ancestors + owning OLTEs), so a
   * technician sees the full path from OLTE to each assigned customer.
   */
  async getAssignedMap(tenantId: string, userId: string): Promise<unknown> {
    const assigned = await this.prisma.networkConnection.findMany({
      where: { tenantId, deletedAt: null, assignedEmployeeId: userId },
      select: { id: true, path: true, olteId: true },
      take: MAP_NODE_CAP,
    });

    const routeIds = new Set<string>();
    const olteIds = new Set<string>();
    for (const conn of assigned) {
      olteIds.add(conn.olteId);
      for (const id of conn.path.split('.')) {
        routeIds.add(id);
      }
    }

    const [oltes, connections] = await Promise.all([
      this.prisma.olte.findMany({
        where: { tenantId, deletedAt: null, id: { in: [...olteIds] } },
      }),
      this.prisma.networkConnection.findMany({
        where: { tenantId, deletedAt: null, id: { in: [...routeIds] } },
        include: {
          customer: CUSTOMER_SUMMARY_SELECT,
          parentConnection: {
            select: { id: true, latitude: true, longitude: true, olteId: true },
          },
        },
        take: MAP_NODE_CAP + 1,
      }),
    ]);

    return this.toFeatureCollection(
      oltes,
      connections,
      new Set(assigned.map((a) => a.id)),
    );
  }

  private toFeatureCollection(
    oltes: {
      id: string;
      code: string;
      name: string;
      status: string;
      totalPorts: number;
      usedPorts: number;
      latitude: number | null;
      longitude: number | null;
    }[],
    connections: {
      id: string;
      connectionCode: string;
      nodeType: string;
      status: string;
      olteId: string;
      parentConnectionId: string | null;
      assignedEmployeeId: string | null;
      installationDate: Date | null;
      latitude: number | null;
      longitude: number | null;
      customer: unknown;
      parentConnection: {
        id: string;
        latitude: number | null;
        longitude: number | null;
        olteId: string;
      } | null;
    }[],
    assignedIds?: Set<string>,
  ): unknown {
    const truncated = connections.length > MAP_NODE_CAP;
    const visible = truncated
      ? connections.slice(0, MAP_NODE_CAP)
      : connections;
    const olteById = new Map(oltes.map((o) => [o.id, o]));

    const features: unknown[] = [];

    for (const olte of oltes) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [olte.longitude, olte.latitude],
        },
        properties: {
          featureType: 'OLTE',
          id: olte.id,
          code: olte.code,
          name: olte.name,
          status: olte.status,
          totalPorts: olte.totalPorts,
          usedPorts: olte.usedPorts,
        },
      });
    }

    for (const conn of visible) {
      if (conn.latitude === null || conn.longitude === null) {
        continue;
      }
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [conn.longitude, conn.latitude],
        },
        properties: {
          featureType: 'CONNECTION',
          id: conn.id,
          connectionCode: conn.connectionCode,
          nodeType: conn.nodeType,
          status: conn.status,
          olteId: conn.olteId,
          parentConnectionId: conn.parentConnectionId,
          customer: conn.customer,
          assignedEmployeeId: conn.assignedEmployeeId,
          installationDate: conn.installationDate,
          assigned: assignedIds ? assignedIds.has(conn.id) : undefined,
        },
      });

      // Edge to parent (connection or OLTE root)
      const parent = conn.parentConnection;
      const from =
        parent && parent.latitude !== null && parent.longitude !== null
          ? { lat: parent.latitude, lng: parent.longitude }
          : this.olteCoords(olteById.get(conn.olteId));
      if (from) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [from.lng, from.lat],
              [conn.longitude, conn.latitude],
            ],
          },
          properties: {
            featureType: 'EDGE',
            id: `edge-${conn.id}`,
            connectionId: conn.id,
            status: conn.status,
          },
        });
      }
    }

    return { type: 'FeatureCollection', features, truncated };
  }

  private olteCoords(
    olte: { latitude: number | null; longitude: number | null } | undefined,
  ): { lat: number; lng: number } | null {
    if (!olte || olte.latitude === null || olte.longitude === null) {
      return null;
    }
    return { lat: olte.latitude, lng: olte.longitude };
  }

  private parseBbox(
    bbox?: string,
  ): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
    if (!bbox) {
      return null;
    }
    const parts = bbox.split(',').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
      throw new BadRequestException(
        'bbox must be "minLng,minLat,maxLng,maxLat"',
      );
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    return { minLng, minLat, maxLng, maxLat };
  }

  /** Nested subtree for the collapsible tree view. */
  async getOlteTree(tenantId: string, olteId: string): Promise<unknown> {
    const olte = await this.prisma.olte.findFirst({
      where: { id: olteId, tenantId, deletedAt: null },
    });
    if (!olte) {
      throw new NotFoundException(`OLTE with ID ${olteId} not found`);
    }

    const connections = await this.prisma.networkConnection.findMany({
      where: { tenantId, olteId, deletedAt: null },
      include: { customer: CUSTOMER_SUMMARY_SELECT },
      orderBy: [{ depth: 'asc' }, { connectionCode: 'asc' }],
    });

    const nodeById = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    for (const conn of connections) {
      nodeById.set(conn.id, {
        id: conn.id,
        connectionCode: conn.connectionCode,
        nodeType: conn.nodeType,
        status: conn.status,
        customerId: conn.customerId,
        customer: conn.customer,
        latitude: conn.latitude,
        longitude: conn.longitude,
        assignedEmployeeId: conn.assignedEmployeeId,
        depth: conn.depth,
        children: [],
      });
    }
    for (const conn of connections) {
      const node = nodeById.get(conn.id);
      if (!node) {
        continue;
      }
      const parent = conn.parentConnectionId
        ? nodeById.get(conn.parentConnectionId)
        : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return {
      olte: {
        id: olte.id,
        code: olte.code,
        name: olte.name,
        status: olte.status,
        totalPorts: olte.totalPorts,
        usedPorts: olte.usedPorts,
        latitude: olte.latitude,
        longitude: olte.longitude,
      },
      tree: roots,
      totalConnections: connections.length,
    };
  }

  /**
   * Runtime map-provider config for clients, driven by the Super Admin
   * platform settings (MAP_PROVIDER / GOOGLE_MAPS_KEY / MAPBOX_KEY).
   * Keys returned here are client-side rendering keys by design.
   */
  async getMapConfig(): Promise<unknown> {
    const settings = await this.prisma.platformSetting.findMany({
      where: { key: { in: ['MAP_PROVIDER', 'GOOGLE_MAPS_KEY', 'MAPBOX_KEY'] } },
    });
    const byKey = new Map(settings.map((s) => [s.key, s.value]));
    const provider = byKey.get('MAP_PROVIDER') || 'OPENSTREETMAP';
    return {
      provider,
      googleMapsKey:
        provider === 'GOOGLE_MAPS' ? (byKey.get('GOOGLE_MAPS_KEY') ?? '') : '',
      mapboxKey: provider === 'MAPBOX' ? (byKey.get('MAPBOX_KEY') ?? '') : '',
    };
  }

  /**
   * Dropdown options for the map filter bar (web + mobile): OLTE list plus
   * distinct areas/districts. Clients default-select the first entry.
   */
  async getFilters(tenantId: string): Promise<unknown> {
    const oltes = await this.prisma.olte.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        area: true,
        district: true,
        totalPorts: true,
        usedPorts: true,
      },
      orderBy: { code: 'asc' },
    });

    const distinct = (values: (string | null)[]): string[] =>
      [...new Set(values.filter((v): v is string => Boolean(v)))].sort();

    return {
      oltes,
      areas: distinct(oltes.map((o) => o.area)),
      districts: distinct(oltes.map((o) => o.district)),
      statuses: [
        'ACTIVE',
        'PENDING_INSTALLATION',
        'SUSPENDED',
        'DISCONNECTED',
        'FAULTY',
        'MAINTENANCE',
      ],
    };
  }

  /** Unified search across customers, connections, OLTEs, geography, employee. */
  async search(tenantId: string, term: string): Promise<unknown> {
    const q = term.trim();
    if (q.length < 2) {
      throw new BadRequestException(
        'Search term must be at least 2 characters',
      );
    }
    const contains = { contains: q, mode: 'insensitive' as const };

    const [connections, oltes] = await Promise.all([
      this.prisma.networkConnection.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { connectionCode: contains },
            { remarks: contains },
            { customer: { displayName: contains } },
            { customer: { legalName: contains } },
            { customer: { customerCode: contains } },
            { customer: { primaryMobile: contains } },
          ],
        },
        include: {
          customer: CUSTOMER_SUMMARY_SELECT,
          olte: { select: { id: true, code: true, name: true } },
        },
        take: SEARCH_TAKE,
      }),
      this.prisma.olte.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { code: contains },
            { name: contains },
            { area: contains },
            { village: contains },
            { mandal: contains },
            { district: contains },
          ],
        },
        take: SEARCH_TAKE,
      }),
    ]);

    return { connections, oltes };
  }

  /** Network health dashboard counters. */
  async getStats(tenantId: string): Promise<unknown> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const base = { tenantId, deletedAt: null } as const;
    const [
      total,
      active,
      pending,
      suspended,
      disconnected,
      faulty,
      todaysInstallations,
      oltes,
    ] = await Promise.all([
      this.prisma.networkConnection.count({ where: base }),
      this.prisma.networkConnection.count({
        where: { ...base, status: 'ACTIVE' },
      }),
      this.prisma.networkConnection.count({
        where: { ...base, status: 'PENDING_INSTALLATION' },
      }),
      this.prisma.networkConnection.count({
        where: { ...base, status: 'SUSPENDED' },
      }),
      this.prisma.networkConnection.count({
        where: { ...base, status: 'DISCONNECTED' },
      }),
      this.prisma.networkConnection.count({
        where: { ...base, status: 'FAULTY' },
      }),
      this.prisma.networkConnection.count({
        where: { ...base, installationDate: { gte: startOfDay } },
      }),
      this.prisma.olte.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          totalPorts: true,
          usedPorts: true,
        },
        orderBy: { code: 'asc' },
      }),
    ]);

    return {
      totalConnections: total,
      active,
      pending,
      suspended,
      disconnected,
      faulty,
      todaysInstallations,
      oltes: oltes.map((o) => ({
        ...o,
        utilizationPct:
          o.totalPorts > 0
            ? Math.round((o.usedPorts / o.totalPorts) * 100)
            : null,
      })),
    };
  }
}

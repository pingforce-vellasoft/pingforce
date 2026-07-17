import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Olte {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  totalPorts: number;
  usedPorts: number;
  address?: string | null;
  area?: string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  totalConnections?: number;
  activeConnections?: number;
  availablePorts?: number;
}

export interface CustomerSummary {
  id: string;
  customerCode: string;
  displayName?: string | null;
  legalName?: string | null;
  status?: string;
  primaryMobile?: string | null;
}

export interface NetworkConnection {
  id: string;
  connectionCode: string;
  olteId: string;
  customerId?: string | null;
  parentConnectionId?: string | null;
  nodeType: string;
  status: string;
  connectionType?: string | null;
  cableType?: string | null;
  fiberCoreDetails?: string | null;
  distanceMeters?: number | null;
  installationDate?: string | null;
  assignedEmployeeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  remarks?: string | null;
  updatedAt?: string;
  customer?: CustomerSummary | null;
  olte?: Pick<Olte, 'id' | 'code' | 'name'>;
  parentConnection?: NetworkConnection | null;
  childConnections?: NetworkConnection[];
  downstreamCount?: number;
}

export interface TreeNode {
  id: string;
  connectionCode: string;
  nodeType: string;
  status: string;
  customerId: string | null;
  customer: CustomerSummary | null;
  latitude: number | null;
  longitude: number | null;
  assignedEmployeeId: string | null;
  depth: number;
  children: TreeNode[];
}

export interface OlteTree {
  olte: Olte;
  tree: TreeNode[];
  totalConnections: number;
}

export interface NetworkStats {
  totalConnections: number;
  active: number;
  pending: number;
  suspended: number;
  disconnected: number;
  faulty: number;
  todaysInstallations: number;
  oltes: (Pick<Olte, 'id' | 'code' | 'name' | 'totalPorts' | 'usedPorts'> & {
    utilizationPct: number | null;
  })[];
}

export interface ImpactResult {
  connectionId: string;
  downstreamCount: number;
  downstreamCustomerCount: number;
  downstream: {
    id: string;
    connectionCode: string;
    customerId: string | null;
    status: string;
  }[];
}

export interface GeoFeature {
  type: 'Feature';
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: [number, number][] };
  properties: Record<string, unknown> & { featureType: string; id: string };
}

export interface NetworkGeoJson {
  type: 'FeatureCollection';
  features: GeoFeature[];
  truncated: boolean;
}

export interface MapProviderConfig {
  provider: 'OPENSTREETMAP' | 'GOOGLE_MAPS' | 'MAPBOX';
  googleMapsKey: string;
  mapboxKey: string;
}

export interface NetworkFilters {
  oltes: (Pick<Olte, 'id' | 'code' | 'name' | 'totalPorts' | 'usedPorts'> & {
    area?: string | null;
    district?: string | null;
  })[];
  areas: string[];
  districts: string[];
  statuses: string[];
}

export interface SearchResult {
  connections: NetworkConnection[];
  oltes: Olte[];
}

export interface ConnectionHistoryEntry {
  id: string;
  action: string;
  previousParent?: string | null;
  newParent?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  performedBy: string;
  performedAt: string;
  details?: Record<string, unknown> | null;
}

/** Connection Map API client (3.7_ConnectionMap). */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/network';

  // --- OLTEs ---

  getOltes(status?: string): Observable<Olte[]> {
    let params = new HttpParams().set('take', 200);
    if (status) params = params.set('status', status);
    return this.http.get<Olte[]>(`${this.api}/oltes`, { params });
  }

  getOlte(id: string): Observable<Olte> {
    return this.http.get<Olte>(`${this.api}/oltes/${id}`);
  }

  createOlte(payload: Partial<Olte>): Observable<Olte> {
    return this.http.post<Olte>(`${this.api}/oltes`, payload);
  }

  updateOlte(id: string, payload: Partial<Olte>): Observable<Olte> {
    return this.http.patch<Olte>(`${this.api}/oltes/${id}`, payload);
  }

  archiveOlte(id: string): Observable<Olte> {
    return this.http.delete<Olte>(`${this.api}/oltes/${id}`);
  }

  // --- Map / tree / search / stats ---

  getMap(
    filters: {
      olteId?: string;
      status?: string;
      area?: string;
      district?: string;
      bbox?: string;
    } = {},
  ): Observable<NetworkGeoJson> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<NetworkGeoJson>(`${this.api}/map`, { params });
  }

  getAssignedMap(): Observable<NetworkGeoJson> {
    return this.http.get<NetworkGeoJson>(`${this.api}/map/assigned`);
  }

  getFilters(): Observable<NetworkFilters> {
    return this.http.get<NetworkFilters>(`${this.api}/filters`);
  }

  getMapConfig(): Observable<MapProviderConfig> {
    return this.http.get<MapProviderConfig>(`${this.api}/map-config`);
  }

  getTree(olteId: string): Observable<OlteTree> {
    return this.http.get<OlteTree>(`${this.api}/oltes/${olteId}/tree`);
  }

  search(q: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`${this.api}/search`, {
      params: new HttpParams().set('q', q),
    });
  }

  getStats(): Observable<NetworkStats> {
    return this.http.get<NetworkStats>(`${this.api}/stats`);
  }

  // --- Connections ---

  getConnection(id: string): Observable<NetworkConnection> {
    return this.http.get<NetworkConnection>(`${this.api}/connections/${id}`);
  }

  createConnection(
    payload: Partial<NetworkConnection>,
  ): Observable<NetworkConnection> {
    return this.http.post<NetworkConnection>(
      `${this.api}/connections`,
      payload,
    );
  }

  updateConnection(
    id: string,
    payload: Partial<NetworkConnection>,
  ): Observable<NetworkConnection> {
    return this.http.patch<NetworkConnection>(
      `${this.api}/connections/${id}`,
      payload,
    );
  }

  moveConnection(
    id: string,
    payload: { newParentConnectionId?: string; newOlteId?: string },
  ): Observable<NetworkConnection> {
    return this.http.post<NetworkConnection>(
      `${this.api}/connections/${id}/move`,
      payload,
    );
  }

  getImpact(id: string): Observable<ImpactResult> {
    return this.http.get<ImpactResult>(`${this.api}/connections/${id}/impact`);
  }

  disconnect(id: string): Observable<unknown> {
    return this.http.post(`${this.api}/connections/${id}/disconnect`, {});
  }

  reconnect(id: string): Observable<unknown> {
    return this.http.post(`${this.api}/connections/${id}/reconnect`, {});
  }

  getHistory(id: string): Observable<ConnectionHistoryEntry[]> {
    return this.http.get<ConnectionHistoryEntry[]>(
      `${this.api}/connections/${id}/history`,
    );
  }

  // --- Super Admin feature gating ---

  getTenantAccess(tenantId: string): Observable<{
    tenantId: string;
    enabled: boolean;
    employeeAccess: string;
  }> {
    return this.http.get<{
      tenantId: string;
      enabled: boolean;
      employeeAccess: string;
    }>(`${this.api}/access/${tenantId}`);
  }

  updateTenantAccess(
    tenantId: string,
    payload: { enabled?: boolean; employeeAccess?: string },
  ): Observable<unknown> {
    return this.http.patch(`${this.api}/access/${tenantId}`, payload);
  }
}

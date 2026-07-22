import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import {
  NetworkConnection,
  NetworkFilters,
  NetworkGeoJson,
  NetworkService,
  NetworkStats,
  Olte,
  OlteTree,
  TreeNode,
} from '../../core/services/network.service';
import {
  NetworkTreeNodeComponent,
  NODE_STATUS_COLORS,
} from './network-tree-node.component';
import { buildTileLayer } from './map-tile-providers';
import {
  ConnectionFormDialogComponent,
  ImpactDialogComponent,
  OlteFormDialogComponent,
} from './network-dialogs.component';

const OLTE_COLOR = '#1565c0';
const JUNCTION_COLOR = '#6a1b9a';

/**
 * Connection Map (3.7_ConnectionMap): geographic Leaflet/OSM view plus a
 * logical tree view of OLTE → customer topology, with OLTE and connection
 * management. Smart component — all HTTP goes through NetworkService.
 */
@Component({
  selector: 'app-network-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    NetworkTreeNodeComponent,
  ],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">Connection Map</h1>
          <p class="page-subtitle">
            OLTE &rarr; customer network topology and coverage
          </p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="openOlteDialog()">
            <mat-icon>add_business</mat-icon> New OLTE
          </button>
          <button
            mat-flat-button
            color="primary"
            (click)="openConnectionDialog()"
            [disabled]="oltes().length === 0"
          >
            <mat-icon>add_link</mat-icon> New Connection
          </button>
        </div>
      </div>

      <!-- Stats tiles -->
      <div class="stats-row" *ngIf="stats() as s">
        <div class="stat-tile">
          <span class="stat-value">{{ s.totalConnections }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-tile green">
          <span class="stat-value">{{ s.active }}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-tile amber">
          <span class="stat-value">{{ s.pending }}</span>
          <span class="stat-label">Pending</span>
        </div>
        <div class="stat-tile orange">
          <span class="stat-value">{{ s.suspended }}</span>
          <span class="stat-label">Suspended</span>
        </div>
        <div class="stat-tile red">
          <span class="stat-value">{{ s.disconnected }}</span>
          <span class="stat-label">Disconnected</span>
        </div>
        <div class="stat-tile dark">
          <span class="stat-value">{{ s.faulty }}</span>
          <span class="stat-label">Faulty</span>
        </div>
        <div class="stat-tile blue">
          <span class="stat-value">{{ s.todaysInstallations }}</span>
          <span class="stat-label">Installed Today</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <mat-form-field
          appearance="outline"
          class="area-select"
          *ngIf="filters() as f"
        >
          <mat-label>District</mat-label>
          <mat-select
            [ngModel]="selectedDistrict()"
            (ngModelChange)="selectDistrict($event)"
          >
            <mat-option [value]="''">All districts</mat-option>
            <mat-option *ngFor="let d of f.districts" [value]="d">{{
              d
            }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          appearance="outline"
          class="area-select"
          *ngIf="filters() as f"
        >
          <mat-label>Area</mat-label>
          <mat-select
            [ngModel]="selectedArea()"
            (ngModelChange)="selectArea($event)"
          >
            <mat-option [value]="''">All areas</mat-option>
            <mat-option *ngFor="let a of f.areas" [value]="a">{{
              a
            }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="olte-select">
          <mat-label>OLTE</mat-label>
          <mat-select
            [ngModel]="selectedOlteId()"
            (ngModelChange)="selectOlte($event)"
          >
            <mat-option [value]="''">All OLTEs</mat-option>
            <mat-option *ngFor="let olte of visibleOltes()" [value]="olte.id">
              {{ olte.code }} — {{ olte.name }} ({{ olte.usedPorts }}/{{
                olte.totalPorts
              }})
            </mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="status-select">
          <mat-label>Status</mat-label>
          <mat-select
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event); refreshMap()"
          >
            <mat-option [value]="''">All</mat-option>
            <mat-option value="ACTIVE">Active</mat-option>
            <mat-option value="PENDING_INSTALLATION">Pending</mat-option>
            <mat-option value="SUSPENDED">Suspended</mat-option>
            <mat-option value="DISCONNECTED">Disconnected</mat-option>
            <mat-option value="FAULTY">Faulty</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search customer / connection / OLTE</mat-label>
          <input
            matInput
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
            (keyup.enter)="runSearch()"
          />
          <button matSuffix mat-icon-button (click)="runSearch()">
            <mat-icon>search</mat-icon>
          </button>
        </mat-form-field>
        <mat-button-toggle-group
          [value]="viewMode()"
          (change)="setViewMode($event.value)"
          class="view-toggle"
        >
          <mat-button-toggle value="map">
            <mat-icon>map</mat-icon> Map
          </mat-button-toggle>
          <mat-button-toggle value="tree">
            <mat-icon>account_tree</mat-icon> Tree
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Search results -->
      <mat-card class="search-results" *ngIf="searchResults() as results">
        <div class="search-results-header">
          <span>Search results</span>
          <button mat-icon-button (click)="searchResults.set(null)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div
          class="search-result-row"
          *ngFor="let conn of results.connections"
          (click)="focusConnection(conn)"
        >
          <mat-icon>person_pin_circle</mat-icon>
          <span class="code">{{ conn.connectionCode }}</span>
          <span *ngIf="conn.customer as c">
            {{ c.displayName || c.legalName }}</span
          >
          <span class="muted">{{ conn.olte?.code }}</span>
          <span class="status-chip">{{ conn.status }}</span>
        </div>
        <div
          class="search-result-row"
          *ngFor="let olte of results.oltes"
          (click)="selectOlte(olte.id)"
        >
          <mat-icon>router</mat-icon>
          <span class="code">{{ olte.code }}</span>
          <span>{{ olte.name }}</span>
          <span class="muted">{{ olte.district }}</span>
        </div>
        <p
          class="muted no-results"
          *ngIf="!results.connections.length && !results.oltes.length"
        >
          No matches.
        </p>
      </mat-card>

      <div class="content-area">
        <!-- Map view -->
        <div class="map-panel" [class.hidden]="viewMode() !== 'map'">
          <div #mapContainer class="map-container"></div>
          <div class="legend">
            <div class="legend-title">Legend</div>
            <div class="legend-item">
              <span class="dot" [style.background]="OLTE_COLOR"></span> OLTE
            </div>
            <div class="legend-item">
              <span class="dot" [style.background]="JUNCTION_COLOR"></span>
              Junction/Splitter
            </div>
            <div class="legend-item" *ngFor="let entry of legendStatuses">
              <span class="dot" [style.background]="entry.color"></span>
              {{ entry.label }}
            </div>
            <div class="legend-item" *ngIf="mapTruncated()">
              <mat-icon class="warn-icon">warning</mat-icon> Zoom in — too many
              nodes to display all
            </div>
          </div>
        </div>

        <!-- Tree view -->
        <mat-card class="tree-panel" *ngIf="viewMode() === 'tree'">
          <ng-container *ngIf="tree() as t; else pickOlte">
            <div class="tree-header">
              <mat-icon>router</mat-icon>
              <strong>{{ t.olte.code }}</strong> — {{ t.olte.name }}
              <span class="muted">
                {{ t.totalConnections }} connection(s), ports
                {{ t.olte.usedPorts }}/{{ t.olte.totalPorts }}
              </span>
            </div>
            <app-network-tree-node
              *ngFor="let root of t.tree"
              [node]="root"
              (nodeClick)="openTreeNode($event)"
            />
            <p class="muted" *ngIf="t.tree.length === 0">
              No connections on this OLTE yet.
            </p>
          </ng-container>
          <ng-template #pickOlte>
            <p class="muted">Select an OLTE to view its connection tree.</p>
          </ng-template>
        </mat-card>

        <!-- Detail side panel -->
        <mat-card class="detail-panel" *ngIf="selected() as conn">
          <div class="detail-header">
            <h3>{{ conn.connectionCode }}</h3>
            <button mat-icon-button (click)="selected.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="detail-body">
            <div class="detail-row" *ngIf="conn.customer as c">
              <span class="label">Customer</span>
              <span
                >{{ c.displayName || c.legalName }} ({{ c.customerCode }})</span
              >
            </div>
            <div class="detail-row">
              <span class="label">Status</span>
              <span
                class="status-chip"
                [style.background]="statusColor(conn.status)"
                >{{ conn.status }}</span
              >
            </div>
            <div class="detail-row">
              <span class="label">Type</span>
              <span
                >{{ conn.nodeType }} / {{ conn.connectionType || '—' }}</span
              >
            </div>
            <div class="detail-row" *ngIf="conn.parentConnection as p">
              <span class="label">Parent</span>
              <span>{{ p.connectionCode }}</span>
            </div>
            <div class="detail-row">
              <span class="label">OLTE</span>
              <span>{{ conn.olte?.code }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Downstream</span>
              <span>{{ conn.downstreamCount ?? 0 }} node(s)</span>
            </div>
            <div class="detail-row" *ngIf="conn.cableType">
              <span class="label">Cable</span>
              <span>{{ conn.cableType }} {{ conn.fiberCoreDetails }}</span>
            </div>
            <div class="detail-row" *ngIf="conn.distanceMeters">
              <span class="label">Distance</span>
              <span>{{ conn.distanceMeters }} m</span>
            </div>
            <div class="detail-row" *ngIf="conn.installationDate">
              <span class="label">Installed</span>
              <span>{{ conn.installationDate | date: 'mediumDate' }}</span>
            </div>
            <div class="detail-row" *ngIf="conn.remarks">
              <span class="label">Remarks</span>
              <span>{{ conn.remarks }}</span>
            </div>
            <div class="detail-children" *ngIf="conn.childConnections?.length">
              <span class="label">Children</span>
              <div
                class="child-link"
                *ngFor="let child of conn.childConnections"
                (click)="focusConnection(child)"
              >
                {{ child.connectionCode }}
                <span *ngIf="child.customer as cc">
                  — {{ cc.displayName || cc.legalName }}</span
                >
              </div>
            </div>
          </div>
          <div class="detail-actions">
            <button
              mat-stroked-button
              (click)="openConnectionDialog(conn.olteId, conn.id)"
            >
              <mat-icon>add</mat-icon> Add Child
            </button>
            <button
              mat-stroked-button
              color="warn"
              *ngIf="conn.status !== 'DISCONNECTED'"
              (click)="confirmDisconnect(conn)"
            >
              <mat-icon>link_off</mat-icon> Disconnect
            </button>
            <button
              mat-stroked-button
              color="primary"
              *ngIf="conn.status === 'DISCONNECTED'"
              (click)="reconnect(conn)"
            >
              <mat-icon>link</mat-icon> Reconnect
            </button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .page-title {
        margin: 0;
        font-size: 22px;
      }
      .page-subtitle {
        margin: 2px 0 0;
        color: #777;
        font-size: 13px;
      }
      .header-actions {
        display: flex;
        gap: 10px;
      }
      .stats-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .stat-tile {
        background: #f5f5f5;
        border-radius: 10px;
        padding: 10px 18px;
        display: flex;
        flex-direction: column;
        min-width: 90px;
        border-left: 4px solid #90a4ae;
      }
      .stat-tile.green {
        border-left-color: #2e7d32;
      }
      .stat-tile.amber {
        border-left-color: #f9a825;
      }
      .stat-tile.orange {
        border-left-color: #ef6c00;
      }
      .stat-tile.red {
        border-left-color: #c62828;
      }
      .stat-tile.dark {
        border-left-color: #212121;
      }
      .stat-tile.blue {
        border-left-color: #1565c0;
      }
      .stat-value {
        font-size: 20px;
        font-weight: 700;
      }
      .stat-label {
        font-size: 12px;
        color: #777;
      }
      .toolbar {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .olte-select {
        width: 280px;
      }
      .area-select {
        width: 170px;
      }
      .status-select {
        width: 160px;
      }
      .search-field {
        flex: 1;
        min-width: 240px;
      }
      .view-toggle {
        height: 44px;
      }
      .content-area {
        display: flex;
        gap: 14px;
        min-height: 520px;
      }
      .map-panel {
        flex: 1;
        position: relative;
        border-radius: 12px;
        overflow: hidden;
      }
      .map-panel.hidden {
        display: none;
      }
      .map-container {
        height: 560px;
        width: 100%;
        border-radius: 12px;
        z-index: 0;
      }
      .legend {
        position: absolute;
        bottom: 14px;
        left: 14px;
        background: rgba(255, 255, 255, 0.94);
        border-radius: 10px;
        padding: 10px 14px;
        z-index: 500;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        font-size: 12px;
      }
      .legend-title {
        font-weight: 700;
        margin-bottom: 4px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 2px 0;
      }
      .legend .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }
      .warn-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #ef6c00;
      }
      .tree-panel {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        max-height: 560px;
      }
      .tree-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .detail-panel {
        width: 340px;
        padding: 14px;
        max-height: 560px;
        overflow-y: auto;
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .detail-header h3 {
        margin: 0;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 5px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
      }
      .detail-row .label {
        color: #888;
        flex-shrink: 0;
      }
      .status-chip {
        color: #fff;
        border-radius: 10px;
        padding: 1px 10px;
        font-size: 11px;
        background: #607d8b;
      }
      .detail-children {
        margin-top: 8px;
      }
      .child-link {
        cursor: pointer;
        color: #1565c0;
        font-size: 13px;
        padding: 3px 0;
      }
      .detail-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
      }
      .search-results {
        padding: 10px 14px;
        max-height: 260px;
        overflow-y: auto;
      }
      .search-results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
      }
      .search-result-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 4px;
        cursor: pointer;
        border-radius: 6px;
        font-size: 13px;
      }
      .search-result-row:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      .search-result-row .code {
        font-weight: 600;
      }
      .muted {
        color: #999;
        font-size: 12px;
      }
      .no-results {
        padding: 8px 0;
      }
    `,
  ],
})
export class NetworkMapComponent implements AfterViewInit, OnDestroy {
  private networkService = inject(NetworkService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  readonly OLTE_COLOR = OLTE_COLOR;
  readonly JUNCTION_COLOR = JUNCTION_COLOR;
  readonly legendStatuses = Object.entries(NODE_STATUS_COLORS).map(
    ([status, color]) => ({
      label: status.replace(/_/g, ' ').toLowerCase(),
      color,
    }),
  );

  readonly oltes = signal<Olte[]>([]);
  readonly filters = signal<NetworkFilters | null>(null);
  readonly selectedArea = signal<string>('');
  readonly selectedDistrict = signal<string>('');
  /** OLTE dropdown narrowed by the active area/district selection. */
  readonly visibleOltes = computed(() => {
    const f = this.filters();
    const all = this.oltes();
    if (!f) return all;
    const area = this.selectedArea();
    const district = this.selectedDistrict();
    const allowed = new Set(
      f.oltes
        .filter(
          (o) =>
            (!area || o.area === area) &&
            (!district || o.district === district),
        )
        .map((o) => o.id),
    );
    return all.filter((o) => allowed.has(o.id));
  });
  readonly stats = signal<NetworkStats | null>(null);
  readonly tree = signal<OlteTree | null>(null);
  readonly selected = signal<NetworkConnection | null>(null);
  readonly selectedOlteId = signal<string>('');
  readonly statusFilter = signal<string>('');
  readonly searchTerm = signal<string>('');
  readonly searchResults = signal<{
    connections: NetworkConnection[];
    oltes: Olte[];
  } | null>(null);
  readonly viewMode = signal<'map' | 'tree'>(
    (localStorage.getItem('network.viewMode') as 'map' | 'tree') ?? 'map',
  );
  readonly mapTruncated = signal(false);

  private map: L.Map | null = null;
  private overlay: L.LayerGroup | null = null;
  private tileLayer: L.TileLayer | null = null;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [13.6288, 79.4192], // Tirupati fallback until data fits bounds
      zoom: 12,
      attributionControl: false,
    });
    // Start with the free default; swap once the platform config arrives.
    this.tileLayer = buildTileLayer(null).addTo(this.map);
    this.networkService.getMapConfig().subscribe({
      next: (config) => {
        if (!this.map) return;
        this.tileLayer?.remove();
        this.tileLayer = buildTileLayer(config).addTo(this.map);
      },
      error: () => {
        // Keep the OSM default when the config endpoint is unavailable.
      },
    });
    this.overlay = L.layerGroup().addTo(this.map);
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private loadAll(): void {
    this.networkService.getFilters().subscribe({
      next: (filters) => this.filters.set(filters),
      error: () => this.filters.set(null),
    });
    this.networkService.getOltes().subscribe({
      next: (oltes) => {
        this.oltes.set(oltes);
        // Default to the first OLTE so large tenants never render everything.
        if (!this.selectedOlteId() && oltes.length > 0) {
          this.selectOlte(oltes[0].id);
        } else {
          this.refreshMap();
        }
      },
      error: (err) => this.toastError(err, 'Failed to load OLTEs'),
    });
    this.networkService.getStats().subscribe((stats) => this.stats.set(stats));
  }

  refreshMap(): void {
    this.networkService
      .getMap({
        olteId: this.selectedOlteId() || undefined,
        status: this.statusFilter() || undefined,
        area: this.selectedArea() || undefined,
        district: this.selectedDistrict() || undefined,
      })
      .subscribe({
        next: (geo) => this.renderMap(geo),
        error: (err) => this.toastError(err, 'Failed to load map'),
      });
  }

  selectArea(area: string): void {
    this.selectedArea.set(area);
    this.reconcileOlteSelection();
  }

  selectDistrict(district: string): void {
    this.selectedDistrict.set(district);
    this.reconcileOlteSelection();
  }

  /** Keep the OLTE selection valid for the new area/district, then refetch. */
  private reconcileOlteSelection(): void {
    const visible = this.visibleOltes();
    const current = this.selectedOlteId();
    if (current && !visible.some((o) => o.id === current)) {
      this.selectOlte(visible.length > 0 ? visible[0].id : '');
    } else {
      this.refreshMap();
    }
  }

  private renderMap(geo: NetworkGeoJson): void {
    if (!this.map || !this.overlay) return;
    this.overlay.clearLayers();
    this.mapTruncated.set(geo.truncated);
    const bounds: L.LatLngExpression[] = [];

    for (const feature of geo.features) {
      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        L.polyline(coords, {
          color:
            NODE_STATUS_COLORS[feature.properties['status'] as string] ??
            '#78909c',
          weight: 2,
          opacity: 0.75,
          dashArray:
            feature.properties['status'] === 'DISCONNECTED' ? '6 6' : undefined,
        }).addTo(this.overlay);
        continue;
      }

      const [lng, lat] = feature.geometry.coordinates;
      bounds.push([lat, lng]);
      const props = feature.properties;

      if (props.featureType === 'OLTE') {
        L.circleMarker([lat, lng], {
          radius: 11,
          color: '#fff',
          weight: 2,
          fillColor: OLTE_COLOR,
          fillOpacity: 1,
        })
          .bindTooltip(`${props['code']} — ${props['name']}`)
          .on('click', () => this.selectOlte(props.id))
          .addTo(this.overlay);
      } else {
        const isJunction = props['nodeType'] !== 'CUSTOMER';
        L.circleMarker([lat, lng], {
          radius: isJunction ? 6 : 8,
          color: '#fff',
          weight: 1.5,
          fillColor: isJunction
            ? JUNCTION_COLOR
            : (NODE_STATUS_COLORS[props['status'] as string] ?? '#607d8b'),
          fillOpacity: 1,
        })
          .bindTooltip(String(props['connectionCode']))
          .on('click', () => this.loadConnection(props.id))
          .addTo(this.overlay);
      }
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds).pad(0.2));
    }
  }

  selectOlte(olteId: string): void {
    this.selectedOlteId.set(olteId);
    this.searchResults.set(null);
    this.refreshMap();
    if (olteId) {
      this.networkService.getTree(olteId).subscribe({
        next: (tree) => this.tree.set(tree),
        error: (err) => this.toastError(err, 'Failed to load tree'),
      });
    } else {
      this.tree.set(null);
    }
  }

  setViewMode(mode: 'map' | 'tree'): void {
    this.viewMode.set(mode);
    localStorage.setItem('network.viewMode', mode);
    if (mode === 'map') {
      setTimeout(() => this.map?.invalidateSize(), 50);
    } else if (!this.tree() && this.selectedOlteId()) {
      this.selectOlte(this.selectedOlteId());
    }
  }

  runSearch(): void {
    const term = this.searchTerm().trim();
    if (term.length < 2) return;
    this.networkService.search(term).subscribe({
      next: (results) => this.searchResults.set(results),
      error: (err) => this.toastError(err, 'Search failed'),
    });
  }

  loadConnection(id: string): void {
    this.networkService.getConnection(id).subscribe({
      next: (conn) => this.selected.set(conn),
      error: (err) => this.toastError(err, 'Failed to load connection'),
    });
  }

  focusConnection(conn: NetworkConnection): void {
    this.searchResults.set(null);
    this.loadConnection(conn.id);
    if (conn.latitude && conn.longitude && this.map) {
      this.viewMode.set('map');
      this.map.setView([conn.latitude, conn.longitude], 17);
    }
  }

  openTreeNode(node: TreeNode): void {
    this.loadConnection(node.id);
  }

  openOlteDialog(olte?: Olte): void {
    this.dialog
      .open(OlteFormDialogComponent, { data: { olte } })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.snackBar.open('OLTE saved', 'OK', { duration: 2500 });
          this.loadAll();
        }
      });
  }

  openConnectionDialog(olteId?: string, parentConnectionId?: string): void {
    this.dialog
      .open(ConnectionFormDialogComponent, {
        data: {
          oltes: this.oltes(),
          olteId: olteId ?? this.selectedOlteId() ?? undefined,
          parentConnectionId,
        },
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.snackBar.open('Connection created', 'OK', { duration: 2500 });
          this.afterTopologyChange();
        }
      });
  }

  confirmDisconnect(conn: NetworkConnection): void {
    this.dialog
      .open(ImpactDialogComponent, {
        data: { connection: conn, actionLabel: 'Disconnect' },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.networkService.disconnect(conn.id).subscribe({
          next: () => {
            this.snackBar.open('Connection disconnected', 'OK', {
              duration: 2500,
            });
            this.afterTopologyChange(conn.id);
          },
          error: (err) => this.toastError(err, 'Disconnect failed'),
        });
      });
  }

  reconnect(conn: NetworkConnection): void {
    this.networkService.reconnect(conn.id).subscribe({
      next: () => {
        this.snackBar.open('Connection reconnected', 'OK', { duration: 2500 });
        this.afterTopologyChange(conn.id);
      },
      error: (err) => this.toastError(err, 'Reconnect failed'),
    });
  }

  private afterTopologyChange(selectedId?: string): void {
    this.refreshMap();
    this.networkService.getStats().subscribe((s) => this.stats.set(s));
    if (this.selectedOlteId()) {
      this.networkService
        .getTree(this.selectedOlteId())
        .subscribe((tree) => this.tree.set(tree));
    }
    if (selectedId) {
      this.loadConnection(selectedId);
    }
  }

  statusColor(status: string): string {
    return NODE_STATUS_COLORS[status] ?? '#607d8b';
  }

  private toastError(err: unknown, fallback: string): void {
    const message =
      (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.snackBar.open(message, 'Dismiss', { duration: 4000 });
  }
}

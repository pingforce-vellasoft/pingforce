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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';
import * as L from 'leaflet';
import {
  DailySummary,
  LiveOperator,
  OperatorTrail,
  TrackingService,
} from '../../core/services/tracking.service';
import { NetworkService } from '../../core/services/network.service';
import { buildTileLayer } from '../network/map-tile-providers';

const OPERATOR_COLOR = '#1565c0';
const TRAIL_COLOR = '#ef6c00';
const STALE_COLOR = '#90a4ae';

/** A live position older than this reads as "stale" (device offline / no fix). */
const STALE_AFTER_MS = 5 * 60 * 1000;
/** How often the live layer re-polls the API (near-live; no WebSocket). */
const POLL_MS = 20_000;

/**
 * Live field-operator tracking. Shows each on-duty operator's latest position
 * on a Leaflet map (near-live via polling); clicking a marker draws that
 * operator's breadcrumb trail. Smart component — all HTTP via TrackingService.
 * Reuses the Connection Map's Leaflet + tile-provider patterns.
 */
@Component({
  selector: 'app-live-tracking',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">Live Tracking</h1>
          <p class="page-subtitle">
            Field operators' live positions and movement trails
          </p>
        </div>
        <div class="header-actions">
          <span class="poll-hint" *ngIf="lastRefreshed() as t">
            Updated {{ t | date: 'mediumTime' }}
          </span>
          <button mat-stroked-button (click)="refreshLive()">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-tile blue">
          <span class="stat-value">{{ operators().length }}</span>
          <span class="stat-label">On duty</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value">{{ staleCount() }}</span>
          <span class="stat-label">Stale (&gt;5m)</span>
        </div>
      </div>

      <div class="content-area">
        <div class="map-panel">
          <mat-progress-bar
            *ngIf="loading()"
            mode="indeterminate"
            class="map-loading"
          ></mat-progress-bar>
          <div #mapContainer class="map-container"></div>
          <div class="legend">
            <div class="legend-title">Legend</div>
            <div class="legend-item">
              <span class="dot" [style.background]="OPERATOR_COLOR"></span>
              Operator (recent)
            </div>
            <div class="legend-item">
              <span class="dot" [style.background]="STALE_COLOR"></span>
              Stale (&gt;5m)
            </div>
            <div class="legend-item">
              <span class="line" [style.background]="TRAIL_COLOR"></span>
              Selected trail
            </div>
          </div>
        </div>

        <mat-card class="detail-panel" *ngIf="selected() as op">
          <div class="detail-header">
            <h3>{{ op.name || op.employeeCode || 'Operator' }}</h3>
            <button mat-icon-button (click)="clearSelection()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="detail-body">
            <div class="detail-row">
              <span class="label">Code</span
              ><span>{{ op.employeeCode || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Last fix</span
              ><span>{{ op.capturedAt | date: 'medium' }}</span>
            </div>
            <div class="detail-row" *ngIf="op.accuracy != null">
              <span class="label">Accuracy</span
              ><span>{{ op.accuracy | number: '1.0-0' }} m</span>
            </div>
            <div class="detail-row" *ngIf="op.batteryLevel != null">
              <span class="label">Battery</span
              ><span>{{ op.batteryLevel }}%</span>
            </div>
            <div class="detail-row" *ngIf="trail() as t">
              <span class="label">Trail points</span
              ><span>{{ t.points.length }}</span>
            </div>
          </div>

          <ng-container *ngIf="summaries().length > 0">
            <div class="section-title">Recent days</div>
            <div class="day-card" *ngFor="let d of summaries()">
              <div class="day-head">
                <span class="day-date">{{ d.day | date: 'mediumDate' }}</span>
                <span class="day-field-time">{{ fieldTime(d) }} in field</span>
              </div>
              <div class="place-row" *ngFor="let pl of d.topPlaces">
                <mat-icon class="place-icon">place</mat-icon>
                <span class="place-coord"
                  >{{ pl.latitude | number: '1.4-4' }},
                  {{ pl.longitude | number: '1.4-4' }}</span
                >
                <span class="place-mins">{{ pl.minutes }}m</span>
              </div>
              <p class="muted" *ngIf="d.topPlaces.length === 0">
                No places recorded.
              </p>
            </div>
          </ng-container>
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
        gap: 12px;
        align-items: center;
      }
      .poll-hint {
        color: #999;
        font-size: 12px;
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
      .map-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 600;
      }
      .map-container {
        height: 600px;
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
      .legend .line {
        width: 16px;
        height: 3px;
        display: inline-block;
      }
      .detail-panel {
        width: 320px;
        padding: 14px;
        max-height: 600px;
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
      .section-title {
        margin: 14px 0 6px;
        font-weight: 700;
        font-size: 13px;
      }
      .day-card {
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 8px 10px;
        margin-bottom: 8px;
      }
      .day-head {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 4px;
      }
      .day-date {
        font-weight: 600;
      }
      .day-field-time {
        color: #1565c0;
      }
      .place-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        padding: 2px 0;
      }
      .place-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        color: #ef6c00;
      }
      .place-coord {
        flex: 1;
        font-family: monospace;
      }
      .place-mins {
        color: #666;
      }
      .muted {
        color: #999;
        font-size: 12px;
      }
    `,
  ],
})
export class LiveTrackingComponent implements AfterViewInit, OnDestroy {
  private trackingService = inject(TrackingService);
  private networkService = inject(NetworkService);
  private snackBar = inject(MatSnackBar);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  readonly OPERATOR_COLOR = OPERATOR_COLOR;
  readonly TRAIL_COLOR = TRAIL_COLOR;
  readonly STALE_COLOR = STALE_COLOR;

  readonly operators = signal<LiveOperator[]>([]);
  readonly selected = signal<LiveOperator | null>(null);
  readonly trail = signal<OperatorTrail | null>(null);
  readonly summaries = signal<DailySummary[]>([]);
  readonly loading = signal(false);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly staleCount = computed(
    () => this.operators().filter((o) => this.isStale(o.capturedAt)).length,
  );

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private trailLayer: L.LayerGroup | null = null;
  private tileLayer: L.TileLayer | null = null;
  private pollSub: Subscription | null = null;
  private fitOnce = false;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [13.6288, 79.4192], // fallback until data fits bounds
      zoom: 12,
    });
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
    this.markerLayer = L.layerGroup().addTo(this.map);
    this.trailLayer = L.layerGroup().addTo(this.map);

    this.refreshLive();
    // Near-live polling — no WebSocket transport in this stack. Skip polls while
    // the tab is hidden so a backgrounded dashboard doesn't hammer the API.
    this.pollSub = interval(POLL_MS).subscribe(() => {
      if (document.visibilityState === 'visible') this.refreshLive();
    });
    // Refresh immediately when the operator returns to the tab.
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.map?.remove();
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.refreshLive();
  };

  refreshLive(): void {
    this.loading.set(true);
    this.trackingService.getLive().subscribe({
      next: (res) => {
        this.operators.set(res.data);
        this.renderMarkers();
        this.lastRefreshed.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastError(err, 'Failed to load live positions');
      },
    });
  }

  private renderMarkers(): void {
    if (!this.map || !this.markerLayer) return;
    this.markerLayer.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    for (const op of this.operators()) {
      const stale = this.isStale(op.capturedAt);
      bounds.push([op.latitude, op.longitude]);
      L.circleMarker([op.latitude, op.longitude], {
        radius: 9,
        color: '#fff',
        weight: 2,
        fillColor: stale ? STALE_COLOR : OPERATOR_COLOR,
        fillOpacity: 1,
      })
        .bindTooltip(
          `${op.name || op.employeeCode || 'Operator'}${
            stale ? ' (stale)' : ''
          }`,
        )
        .on('click', () => this.selectOperator(op))
        .addTo(this.markerLayer!);
    }

    // Fit once on first data load; later polls keep the admin's current view.
    if (!this.fitOnce && bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds).pad(0.2));
      this.fitOnce = true;
    }
  }

  selectOperator(op: LiveOperator): void {
    this.selected.set(op);
    this.summaries.set([]);
    this.map?.setView([op.latitude, op.longitude], 16);
    // Trail for the last 12 hours of this operator's movement.
    const from = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    this.trackingService.getTrail(op.employeeId, from).subscribe({
      next: (t) => {
        this.trail.set(t);
        this.renderTrail(t);
      },
      error: (err) => this.toastError(err, 'Failed to load trail'),
    });
    // Consolidated daily summaries (field-time + top places), recent first.
    this.trackingService.getDailySummaries(op.employeeId, 14).subscribe({
      next: (res) => this.summaries.set(res.days),
      error: () => this.summaries.set([]),
    });
  }

  /** "6h 30m" from a summary's minutesInField. */
  fieldTime(d: DailySummary): string {
    const h = Math.floor(d.minutesInField / 60);
    const m = d.minutesInField % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private renderTrail(t: OperatorTrail): void {
    if (!this.trailLayer) return;
    this.trailLayer.clearLayers();
    const coords = t.points.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );
    if (coords.length > 1) {
      L.polyline(coords, {
        color: TRAIL_COLOR,
        weight: 3,
        opacity: 0.8,
      }).addTo(this.trailLayer);
    }
  }

  clearSelection(): void {
    this.selected.set(null);
    this.trail.set(null);
    this.summaries.set([]);
    this.trailLayer?.clearLayers();
  }

  private isStale(capturedAt: string): boolean {
    return Date.now() - new Date(capturedAt).getTime() > STALE_AFTER_MS;
  }

  private toastError(err: unknown, fallback: string): void {
    const message =
      (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.snackBar.open(message, 'Dismiss', { duration: 4000 });
  }
}

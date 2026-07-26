import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { WorkforceService } from '../../core/services/workforce.service';
import { NetworkService } from '../../core/services/network.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { OverlayModule } from '@angular/cdk/overlay';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { buildTileLayer } from '../network/map-tile-providers';
import { GeofenceCoverage } from './geofence-assignment.model';
import { GeofenceEmployeesDialogComponent } from './geofence-employees-dialog.component';

@Component({
  selector: 'app-geofence-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    FormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatTooltipModule,
    OverlayModule,
  ],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">Geofence Intelligence</h1>
          <p class="page-subtitle">
            Configure spatial boundaries for biometric attendance
          </p>
        </div>

        <!-- One-vs-many policy. Turning it off does not strip assignments
             employees already hold; it governs what may be newly assigned. -->
        <div class="policy-toggle">
          <mat-slide-toggle
            [ngModel]="allowMultiple()"
            (ngModelChange)="onPolicyChange($event)"
            [disabled]="policySaving()"
          >
            Allow multiple geofences per employee
          </mat-slide-toggle>
          <span class="policy-hint">
            {{
              allowMultiple()
                ? 'Employees can be assigned to several sites.'
                : 'Each employee belongs to exactly one geofence.'
            }}
          </span>
        </div>
      </div>

      <!-- Employees with no geofence cannot punch anywhere. That is the single
           most consequential state on this page, so it leads. -->
      @if (coverage(); as cov) {
        @if (!cov.tenantHasEmployees) {
          <div class="coverage-banner empty">
            <mat-icon>person_off</mat-icon>
            <div>
              <strong>No employees yet.</strong>
              Geofences do nothing until employees exist and are assigned to
              them. Create employees first, then assign them here.
            </div>
            <button mat-flat-button color="primary" (click)="goToEmployees()">
              <mat-icon>person_add</mat-icon> Create Employees
            </button>
          </div>
        } @else if (cov.unassignedEmployees > 0) {
          <div class="coverage-banner warn">
            <mat-icon>warning_amber</mat-icon>
            <div>
              <strong>{{ cov.unassignedEmployees }}</strong> of
              {{ cov.totalEmployees }}
              {{
                cov.unassignedEmployees === 1 ? 'employee is' : 'employees are'
              }}
              not assigned to any geofence and
              <strong>cannot punch attendance</strong>. Assign them to a
              location below.
            </div>
          </div>
        } @else {
          <div class="coverage-banner ok">
            <mat-icon>check_circle</mat-icon>
            <div>
              All {{ cov.totalEmployees }} active employees are assigned to a
              geofence.
            </div>
          </div>
        }
      }

      <div class="content-grid">
        <!-- Left Side: Form -->
        <div class="form-section">
          <mat-card class="premium-card">
            <div class="card-header">
              <div class="icon-box"><mat-icon>add_location_alt</mat-icon></div>
              <h3>Register New Office</h3>
            </div>

            <div class="form-content">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Office Location Name</mat-label>
                <input
                  matInput
                  [(ngModel)]="newGeofence.name"
                  placeholder="e.g. Headquarters, NY Branch"
                />
                <mat-icon matPrefix class="field-icon">business</mat-icon>
              </mat-form-field>

              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Latitude</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="newGeofence.latitude"
                    (ngModelChange)="onCoordinatesTyped()"
                    placeholder="40.7128"
                  />
                  <mat-icon matPrefix class="field-icon">explore</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Longitude</mat-label>
                  <input
                    matInput
                    type="number"
                    [(ngModel)]="newGeofence.longitude"
                    (ngModelChange)="onCoordinatesTyped()"
                    placeholder="-74.0060"
                  />
                  <mat-icon matPrefix class="field-icon">explore</mat-icon>
                </mat-form-field>
              </div>

              <div class="picker-map-wrapper">
                <div class="picker-map" #pickerMap></div>
                <div class="picker-hint">
                  <mat-icon>touch_app</mat-icon> Click the map or drag the pin
                  to set the boundary centre
                </div>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Boundary Radius (Meters)</mat-label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="newGeofence.radiusMeters"
                  (ngModelChange)="onRadiusChanged()"
                />
                <mat-icon matPrefix class="field-icon">radar</mat-icon>
                <mat-hint>Recommended: 50 - 200 meters</mat-hint>
              </mat-form-field>

              <button
                mat-flat-button
                class="submit-btn"
                (click)="saveGeofence()"
              >
                <mat-icon>save</mat-icon> Finalize Geofence
              </button>
            </div>
          </mat-card>
        </div>

        <!-- Right Side: Table -->
        <div class="table-section">
          <div class="table-wrapper">
            <table mat-table [dataSource]="geofences" class="premium-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>
                  <mat-icon class="header-icon">business</mat-icon> Location
                </th>
                <td mat-cell *matCellDef="let element">
                  <div class="location-cell">
                    <span class="loc-name">{{ element.name }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="coordinates">
                <th mat-header-cell *matHeaderCellDef>
                  <mat-icon class="header-icon">my_location</mat-icon>
                  Coordinates
                </th>
                <td mat-cell *matCellDef="let element">
                  <div
                    class="coord-hover-container"
                    cdkOverlayOrigin
                    #trigger="cdkOverlayOrigin"
                    (mouseenter)="element.showMap = true"
                    (mouseleave)="element.showMap = false"
                  >
                    <span class="coord-pill interactive-pill"
                      >{{ element.latitude | number: '1.2-4' }},
                      {{ element.longitude | number: '1.2-4' }}</span
                    >
                  </div>

                  <ng-template
                    cdkConnectedOverlay
                    [cdkConnectedOverlayOrigin]="trigger"
                    [cdkConnectedOverlayOpen]="element.showMap"
                    [cdkConnectedOverlayPositions]="[
                      {
                        originX: 'center',
                        originY: 'top',
                        overlayX: 'center',
                        overlayY: 'bottom',
                        offsetY: -12,
                      },
                    ]"
                  >
                    <div class="map-tooltip-popover">
                      <div class="map-tooltip-header">Location Preview</div>
                      <div class="map-tooltip-body">
                        <img
                          [src]="element.mapUrl"
                          width="100%"
                          height="100%"
                          alt="Location preview"
                          style="border:0; object-fit: cover;"
                        />
                      </div>
                    </div>
                  </ng-template>
                </td>
              </ng-container>

              <ng-container matColumnDef="radius">
                <th mat-header-cell *matHeaderCellDef>
                  <mat-icon class="header-icon">radar</mat-icon> Radius
                </th>
                <td mat-cell *matCellDef="let element">
                  <span class="radius-badge">{{ element.radiusMeters }}m</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="staff">
                <th mat-header-cell *matHeaderCellDef>
                  <mat-icon class="header-icon">groups</mat-icon> Employees
                </th>
                <td mat-cell *matCellDef="let element">
                  <button
                    mat-stroked-button
                    class="staff-btn"
                    [class.unstaffed]="assignedCount(element.id) === 0"
                    (click)="manageEmployees(element)"
                    [matTooltip]="
                      assignedCount(element.id) === 0
                        ? 'Nobody can punch attendance here yet — assign employees'
                        : 'Manage the employees assigned to this geofence'
                    "
                  >
                    <mat-icon>{{
                      assignedCount(element.id) === 0 ? 'person_off' : 'group'
                    }}</mat-icon>
                    {{ assignedCount(element.id) }}
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  style="text-align: right"
                ></th>
                <td
                  mat-cell
                  *matCellDef="let element"
                  style="text-align: right"
                >
                  <button
                    mat-icon-button
                    class="delete-btn"
                    (click)="deleteGeofence(element.id)"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                class="premium-row"
              ></tr>
            </table>

            @if (geofences.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">wrong_location</mat-icon>
                <h3>No locations configured</h3>
                <p>Add your first geofence to enable attendance tracking.</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px;
        font-family: 'Inter', sans-serif;
        background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
        min-height: calc(100vh - 64px);
        color: #f8fafc;
      }

      .header-section {
        margin-bottom: 32px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
        flex-wrap: wrap;
      }

      .policy-toggle {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 12px;
        padding: 14px 18px;
      }
      .policy-hint {
        font-size: 12px;
        color: #94a3b8;
      }

      .coverage-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 24px;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid transparent;
      }
      .coverage-banner div {
        flex: 1;
      }
      .coverage-banner.warn {
        background: rgba(234, 179, 8, 0.12);
        border-color: rgba(234, 179, 8, 0.35);
        color: #fde68a;
      }
      .coverage-banner.empty {
        background: rgba(96, 165, 250, 0.12);
        border-color: rgba(96, 165, 250, 0.35);
        color: #bfdbfe;
      }
      .coverage-banner.ok {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: #bbf7d0;
      }

      .staff-btn {
        border-color: rgba(148, 163, 184, 0.3) !important;
        color: #e2e8f0 !important;
        min-width: 64px;
      }
      /* An unstaffed geofence is inert — nobody can punch there. */
      .staff-btn.unstaffed {
        border-color: rgba(234, 179, 8, 0.5) !important;
        color: #fde68a !important;
      }
      .page-title {
        font-size: 32px;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(to right, #60a5fa, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.5px;
      }
      .page-subtitle {
        color: #94a3b8;
        margin: 8px 0 0 0;
        font-size: 15px;
      }

      .content-grid {
        display: grid;
        grid-template-columns: 350px 1fr;
        gap: 32px;
      }

      .premium-card {
        background: rgba(30, 41, 59, 0.7) !important;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
        padding: 0 !important;
        overflow: hidden;
      }

      .card-header {
        padding: 24px;
        background: rgba(15, 23, 42, 0.4);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .card-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #f1f5f9;
      }

      .icon-box {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: rgba(99, 102, 241, 0.1);
        color: #818cf8;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .form-content {
        padding: 24px;
      }

      .full-width {
        width: 100%;
        margin-bottom: 8px;
      }
      .row {
        display: flex;
        gap: 16px;
        margin-bottom: 8px;
      }
      .row mat-form-field {
        flex: 1;
      }

      ::ng-deep .mat-mdc-text-field-wrapper {
        background: rgba(15, 23, 42, 0.6) !important;
        border-radius: 12px !important;
      }
      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing {
        border-color: rgba(255, 255, 255, 0.1) !important;
        border-width: 1px !important;
      }
      ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
      ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
      ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
        border-color: #8b5cf6 !important;
      }
      .field-icon {
        color: #64748b;
        margin-right: 8px;
      }
      ::ng-deep .mat-mdc-input-element {
        color: #f8fafc !important;
      }
      ::ng-deep .mat-mdc-form-field-label {
        color: #94a3b8 !important;
        font-weight: 500;
      }
      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        padding-left: 0;
      }
      ::ng-deep .mat-mdc-form-field-hint {
        color: #64748b;
        font-size: 12px;
        margin-top: 4px;
      }

      .picker-map-wrapper {
        margin: 4px 0 8px;
      }
      .picker-map {
        height: 220px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        overflow: hidden;
        background: #0f172a;
      }
      .picker-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #64748b;
        font-size: 12px;
        margin-top: 8px;
      }
      .picker-hint mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
      ::ng-deep .leaflet-control-attribution {
        display: none !important;
      }

      .submit-btn {
        width: 100%;
        height: 48px;
        border-radius: 12px !important;
        background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
        font-weight: 600 !important;
        font-size: 15px !important;
        margin-top: 16px;
      }

      /* Table Styles */
      .table-wrapper {
        background: rgba(30, 41, 59, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        overflow: visible;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      }
      .premium-table {
        width: 100%;
        background: transparent !important;
      }

      ::ng-deep .mat-mdc-header-cell {
        background: rgba(15, 23, 42, 0.5) !important;
        color: #94a3b8 !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }
      ::ng-deep th.mat-mdc-header-cell:first-child {
        border-top-left-radius: 20px;
      }
      ::ng-deep th.mat-mdc-header-cell:last-child {
        border-top-right-radius: 20px;
      }

      ::ng-deep .mat-mdc-cell {
        color: #e2e8f0 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        padding: 16px !important;
      }

      .premium-row {
        transition: background 0.2s ease;
      }
      .premium-row:hover {
        background: rgba(255, 255, 255, 0.02) !important;
      }

      .header-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        vertical-align: text-bottom;
        margin-right: 4px;
        color: #64748b;
      }

      .loc-name {
        font-weight: 600;
        font-size: 15px;
        color: #f8fafc;
      }

      .coord-pill {
        background: rgba(148, 163, 184, 0.1);
        color: #94a3b8;
        padding: 4px 10px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 13px;
      }
      .interactive-pill {
        cursor: pointer;
        transition:
          background 0.2s,
          color 0.2s;
      }
      .interactive-pill:hover {
        background: rgba(139, 92, 246, 0.2);
        color: #a78bfa;
      }

      .radius-badge {
        display: inline-flex;
        align-items: center;
        background: rgba(52, 211, 153, 0.1);
        color: #34d399;
        border: 1px solid rgba(52, 211, 153, 0.2);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
      }

      .empty-state {
        padding: 64px 24px;
        text-align: center;
      }
      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #475569;
        margin-bottom: 16px;
      }
      .empty-state h3 {
        margin: 0;
        color: #cbd5e1;
        font-weight: 500;
        font-size: 18px;
      }
      .empty-state p {
        color: #64748b;
        margin-top: 8px;
      }

      .coord-hover-container {
        position: relative;
        display: inline-block;
      }

      .map-tooltip-popover {
        width: 320px;
        height: 240px;
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        overflow: visible;
        display: flex;
        flex-direction: column;
        animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .map-tooltip-popover::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        width: 12px;
        height: 12px;
        background: #1e293b;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1001;
      }

      .map-tooltip-header {
        background: rgba(15, 23, 42, 0.95);
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        gap: 6px;
        border-radius: 12px 12px 0 0;
      }
      .map-tooltip-header::before {
        content: 'place';
        font-family: 'Material Icons';
        font-size: 18px;
        color: #a78bfa;
      }

      .map-tooltip-body {
        flex: 1;
        width: 100%;
        position: relative;
        background: #cbd5e1;
        border-radius: 0 0 12px 12px;
        overflow: hidden;
      }

      @keyframes popoverFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .delete-btn {
        color: #94a3b8;
        transition:
          color 0.2s,
          background 0.2s;
      }
      .delete-btn:hover {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
    `,
  ],
})
export class GeofenceSettingsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private workforceService = inject(WorkforceService);
  private networkService = inject(NetworkService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('pickerMap') private pickerMapEl?: ElementRef<HTMLDivElement>;

  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  displayedColumns: string[] = [
    'name',
    'coordinates',
    'radius',
    'staff',
    'actions',
  ];
  geofences: any[] = [];
  newGeofence = { name: '', latitude: 0, longitude: 0, radiusMeters: 50 };

  /** Assigned counts per geofence plus the unassigned-employee warning. */
  readonly coverage = signal<GeofenceCoverage | null>(null);
  readonly allowMultiple = signal(false);
  readonly policySaving = signal(false);

  private map?: L.Map;
  private tileLayer?: L.TileLayer;
  private marker?: L.Marker;
  private radiusCircle?: L.Circle;

  ngOnInit() {
    this.loadGeofences();
    this.loadCoverage();
    this.loadPolicy();
  }

  ngAfterViewInit() {
    this.initPickerMap();
  }

  ngOnDestroy() {
    this.map?.remove();
    this.map = undefined;
  }

  // ── Map picker ─────────────────────────────────────────────────────────────

  private initPickerMap() {
    const host = this.pickerMapEl?.nativeElement;
    if (!host) return;

    this.map = L.map(host, {
      center: [13.6288, 79.4192], // fallback until a coordinate is set
      zoom: 12,
      attributionControl: false,
    });
    // Free default first; swap when the platform map config arrives.
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

    this.map.on('click', (event: L.LeafletMouseEvent) =>
      this.setCoordinates(event.latlng.lat, event.latlng.lng),
    );

    // Leaflet mis-measures a container that was hidden/resized during init.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  /** Single source of truth: updates the form fields and the map together. */
  private setCoordinates(lat: number, lng: number, zoom?: number) {
    this.newGeofence.latitude = Number(lat.toFixed(6));
    this.newGeofence.longitude = Number(lng.toFixed(6));
    this.renderPin(zoom);
  }

  onCoordinatesTyped() {
    this.renderPin();
  }

  onRadiusChanged() {
    this.radiusCircle?.setRadius(Number(this.newGeofence.radiusMeters) || 0);
  }

  private renderPin(zoom?: number) {
    const lat = Number(this.newGeofence.latitude);
    const lng = Number(this.newGeofence.longitude);
    if (!this.map || !this.isValidCoordinate(lat, lng)) return;

    const position: L.LatLngExpression = [lat, lng];
    const radius = Number(this.newGeofence.radiusMeters) || 0;

    if (!this.marker) {
      this.marker = L.marker(position, { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const moved = this.marker!.getLatLng();
        this.setCoordinates(moved.lat, moved.lng);
      });
    } else {
      this.marker.setLatLng(position);
    }

    if (!this.radiusCircle) {
      this.radiusCircle = L.circle(position, {
        radius,
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(this.map);
    } else {
      this.radiusCircle.setLatLng(position);
      this.radiusCircle.setRadius(radius);
    }

    this.map.setView(position, zoom ?? Math.max(this.map.getZoom(), 15));
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180 &&
      !(lat === 0 && lng === 0)
    );
  }

  loadGeofences() {
    this.workforceService.getGeofences().subscribe({
      next: (data) => {
        this.geofences = (data || []).map((g: any) => ({
          ...g,
          mapUrl: this.getMapUrl(g.latitude, g.longitude),
        }));
      },
      error: (err) => console.error(err),
    });
  }

  saveGeofence() {
    const latitude = Number(this.newGeofence.latitude);
    const longitude = Number(this.newGeofence.longitude);
    if (!this.newGeofence.name?.trim()) {
      alert('Enter a location name');
      return;
    }
    if (!this.isValidCoordinate(latitude, longitude)) {
      alert('Set a valid latitude/longitude, or pick a point on the map');
      return;
    }

    const payload = {
      name: this.newGeofence.name.trim(),
      latitude,
      longitude,
      radiusMeters: Number(this.newGeofence.radiusMeters),
    };
    this.workforceService.createGeofence(payload).subscribe({
      next: () => {
        this.loadGeofences();
        this.newGeofence = {
          name: '',
          latitude: 0,
          longitude: 0,
          radiusMeters: 50,
        };
        this.marker?.remove();
        this.marker = undefined;
        this.radiusCircle?.remove();
        this.radiusCircle = undefined;
      },
      error: (err) => {
        console.error(err);
        alert('Failed to save geofence');
      },
    });
  }

  deleteGeofence(id: string) {
    if (!id) return;

    // Deleting a geofence releases everyone assigned to it, and anyone left
    // without another one can no longer punch. Say so before it happens.
    const staffed = this.assignedCount(id);
    if (staffed > 0) {
      const ok = confirm(
        `${staffed} ${staffed === 1 ? 'employee is' : 'employees are'} assigned to this geofence. ` +
          `Deleting it removes those assignments, and anyone left without another geofence will be unable to punch attendance.\n\nDelete anyway?`,
      );
      if (!ok) return;
    }

    this.workforceService.deleteGeofence(id).subscribe({
      next: (res: any) => {
        const stranded = res?.leftWithoutGeofence ?? 0;
        if (stranded > 0) {
          this.snack.open(
            `Geofence deleted. ${stranded} ${stranded === 1 ? 'employee has' : 'employees have'} no geofence left and cannot punch attendance.`,
            'Dismiss',
            { duration: 8000 },
          );
        }
        this.loadGeofences();
        this.loadCoverage();
      },
      error: (err) => console.error('Failed to delete geofence', err),
    });
  }

  // ── Employee assignment ────────────────────────────────────────────────────

  private loadCoverage() {
    this.workforceService.getGeofenceCoverage().subscribe({
      next: (data) => this.coverage.set(data),
      error: (err) => console.error('Failed to load geofence coverage', err),
    });
  }

  private loadPolicy() {
    this.workforceService.getGeofenceAssignmentPolicy().subscribe({
      next: (p) => this.allowMultiple.set(p.allowMultipleGeofencesPerEmployee),
      error: (err) => console.error('Failed to load geofence policy', err),
    });
  }

  assignedCount(geofenceId: string): number {
    return this.coverage()?.countsByGeofence?.[geofenceId] ?? 0;
  }

  onPolicyChange(allow: boolean) {
    this.policySaving.set(true);
    this.workforceService.updateGeofenceAssignmentPolicy(allow).subscribe({
      next: (res) => {
        this.allowMultiple.set(res.allowMultipleGeofencesPerEmployee);
        this.policySaving.set(false);
        // Switching to single-geofence mode leaves existing multi-assignments
        // in place rather than arbitrarily revoking sites people work at. Flag
        // them so the admin resolves it deliberately.
        const over = res.employeesOverLimit ?? 0;
        if (!allow && over > 0) {
          this.snack.open(
            `Saved. ${over} ${over === 1 ? 'employee still holds' : 'employees still hold'} more than one geofence — existing assignments were kept. Remove the extras manually.`,
            'Dismiss',
            { duration: 8000 },
          );
        }
      },
      error: (err) => {
        console.error('Failed to update geofence policy', err);
        // Snap the toggle back so it never shows a state the server rejected.
        this.allowMultiple.set(!allow);
        this.policySaving.set(false);
        this.snack.open('Could not update the policy.', 'Dismiss', {
          duration: 4000,
        });
      },
    });
  }

  manageEmployees(geofence: { id: string; name: string }) {
    this.dialog
      .open(GeofenceEmployeesDialogComponent, {
        data: { geofenceId: geofence.id, geofenceName: geofence.name },
        width: '640px',
        maxHeight: '86vh',
      })
      .afterClosed()
      .subscribe(() => this.loadCoverage());
  }

  goToEmployees() {
    void this.router.navigate(['/workforce/employees']);
  }

  /**
   * Raw raster tile containing the point — an unbranded PNG, unlike the
   * openstreetmap.org embed iframe which renders OSM's own chrome.
   */
  getMapUrl(lat: number, lon: number) {
    const zoom = 15;
    const n = 2 ** zoom;
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        n,
    );
    const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

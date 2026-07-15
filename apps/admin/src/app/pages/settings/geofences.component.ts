import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { WorkforceService } from '../../core/services/workforce.service';
import {
  MatDialogModule,
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OverlayModule } from '@angular/cdk/overlay';

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
      </div>

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
                    placeholder="-74.0060"
                  />
                  <mat-icon matPrefix class="field-icon">explore</mat-icon>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Boundary Radius (Meters)</mat-label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="newGeofence.radiusMeters"
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
                        <iframe
                          [src]="element.mapUrl"
                          width="100%"
                          height="100%"
                          frameborder="0"
                          style="border:0;"
                          allowfullscreen=""
                        >
                        </iframe>
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
export class GeofenceSettingsComponent implements OnInit {
  private workforceService = inject(WorkforceService);
  private sanitizer = inject(DomSanitizer);

  displayedColumns: string[] = ['name', 'coordinates', 'radius', 'actions'];
  geofences: any[] = [];
  newGeofence = { name: '', latitude: 0, longitude: 0, radiusMeters: 50 };

  ngOnInit() {
    this.loadGeofences();
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
    const payload = {
      name: this.newGeofence.name,
      latitude: Number(this.newGeofence.latitude),
      longitude: Number(this.newGeofence.longitude),
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
      },
      error: (err) => {
        console.error(err);
        alert('Failed to save geofence');
      },
    });
  }

  deleteGeofence(id: string) {
    if (!id) return;
    this.workforceService.deleteGeofence(id).subscribe({
      next: () => this.loadGeofences(),
      error: (err) => console.error('Failed to delete geofence', err),
    });
  }

  getMapUrl(lat: number, lon: number) {
    const offset = 0.005;
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

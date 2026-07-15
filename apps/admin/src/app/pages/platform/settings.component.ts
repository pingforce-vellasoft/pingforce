import { Component, OnInit, inject } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { PlatformService } from '../../core/services/platform.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-platform-settings',
  standalone: true,
  imports: [
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">Platform Settings</h2>
        <p class="page-subtitle">
          Configure global platform integrations, compliance rules, and limits.
        </p>
      </div>

      <mat-card class="settings-card">
        <mat-card-content class="no-padding">
          <mat-tab-group class="premium-tabs" animationDuration="0ms">
            <!-- INTEGRATIONS TAB -->
            <mat-tab label="Map Integrations">
              <div class="tab-content" [formGroup]="integrationsForm">
                <div class="section-title">Provider Configuration</div>
                <p class="section-subtitle">
                  Select and configure the global map provider used for
                  geofencing and live tracking.
                </p>

                <div class="provider-grid">
                  <!-- OpenStreetMap -->
                  <div
                    class="provider-card"
                    [class.selected]="
                      integrationsForm.get('mapProvider')?.value ===
                      'OPENSTREETMAP'
                    "
                    (click)="selectProvider('OPENSTREETMAP')"
                  >
                    <div class="provider-icon-wrapper">
                      <mat-icon>public</mat-icon>
                    </div>
                    <div class="provider-info">
                      <h3>OpenStreetMap</h3>
                      <p>Free & Open Source</p>
                    </div>
                    <div class="check-indicator">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  </div>

                  <!-- Google Maps -->
                  <div
                    class="provider-card"
                    [class.selected]="
                      integrationsForm.get('mapProvider')?.value ===
                      'GOOGLE_MAPS'
                    "
                    (click)="selectProvider('GOOGLE_MAPS')"
                  >
                    <div class="provider-icon-wrapper">
                      <mat-icon>map</mat-icon>
                    </div>
                    <div class="provider-info">
                      <h3>Google Maps</h3>
                      <p>Premium Routing & Places</p>
                    </div>
                    <div class="check-indicator">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  </div>

                  <!-- Mapbox -->
                  <div
                    class="provider-card"
                    [class.selected]="
                      integrationsForm.get('mapProvider')?.value === 'MAPBOX'
                    "
                    (click)="selectProvider('MAPBOX')"
                  >
                    <div class="provider-icon-wrapper">
                      <mat-icon>explore</mat-icon>
                    </div>
                    <div class="provider-info">
                      <h3>Mapbox</h3>
                      <p>Customizable & Fast</p>
                    </div>
                    <div class="check-indicator">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  </div>
                </div>

                @if (
                  integrationsForm.get('mapProvider')?.value === 'GOOGLE_MAPS'
                ) {
                  <mat-form-field
                    appearance="outline"
                    class="full-width premium-field"
                  >
                    <mat-label>Google Maps API Key</mat-label>
                    <input
                      matInput
                      formControlName="googleMapsKey"
                      type="password"
                      placeholder="AIzaSy..."
                    />
                    <mat-icon matPrefix>vpn_key</mat-icon>
                  </mat-form-field>
                }

                @if (integrationsForm.get('mapProvider')?.value === 'MAPBOX') {
                  <mat-form-field
                    appearance="outline"
                    class="full-width premium-field"
                  >
                    <mat-label>Mapbox Access Token</mat-label>
                    <input
                      matInput
                      formControlName="mapboxKey"
                      type="password"
                      placeholder="pk.eyJ1..."
                    />
                    <mat-icon matPrefix>vpn_key</mat-icon>
                  </mat-form-field>
                }

                <div class="actions">
                  <button
                    mat-flat-button
                    color="primary"
                    class="save-btn"
                    (click)="saveIntegrations()"
                  >
                    <mat-icon>save</mat-icon>
                    Save Integrations
                  </button>
                </div>
              </div>
            </mat-tab>

            <!-- COMPLIANCE TAB -->
            <mat-tab label="Compliance & Limits">
              <div class="tab-content" [formGroup]="complianceForm">
                <div class="settings-list">
                  <!-- Radius Setting -->
                  <div class="settings-list-item">
                    <div class="item-icon-wrapper radar-icon">
                      <mat-icon>radar</mat-icon>
                    </div>
                    <div class="item-details">
                      <h3>Max Geofence Radius</h3>
                      <p>Platform-wide hard limit for tenant geofences.</p>
                    </div>
                    <div class="item-action">
                      <div class="custom-input-wrapper">
                        <input
                          type="number"
                          formControlName="maxGeofenceRadius"
                          class="premium-input"
                          min="100"
                        />
                        <span class="input-suffix">meters</span>
                      </div>
                    </div>
                  </div>

                  <!-- Debounce Setting -->
                  <div
                    class="settings-list-item clickable-row"
                    (click)="toggleDebounce()"
                  >
                    <div class="item-icon-wrapper timer-icon">
                      <mat-icon>timer</mat-icon>
                    </div>
                    <div class="item-details">
                      <h3>Enforce Global Debounce</h3>
                      <p>
                        Force a 15-minute location ping limit for all tenants to
                        reduce server load.
                      </p>
                    </div>
                    <div class="item-action">
                      <div
                        class="premium-switch"
                        [class.active]="
                          complianceForm.get('enforceDebounce')?.value
                        "
                      >
                        <div class="premium-switch-thumb"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="actions">
                  <button
                    mat-flat-button
                    color="primary"
                    class="save-btn"
                    (click)="saveCompliance()"
                  >
                    <mat-icon>save</mat-icon>
                    Save Compliance Rules
                  </button>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px 40px;
        max-width: 1400px;
        margin: 0 auto;
      }
      .page-header {
        margin-bottom: 32px;
      }
      .page-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: var(--text-primary);
        letter-spacing: -0.5px;
      }
      .page-subtitle {
        font-size: 15px;
        color: var(--text-secondary);
        margin: 0;
      }
      .settings-card {
        background: var(--bg-surface);
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }
      .no-padding {
        padding: 0 !important;
      }
      ::ng-deep .premium-tabs .mat-mdc-tab-header {
        background: rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid var(--border-subtle);
      }
      ::ng-deep .premium-tabs .mat-mdc-tab {
        height: 60px;
        padding: 0 32px;
      }
      ::ng-deep .premium-tabs .mat-mdc-tab .mdc-tab__text-label {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.2px;
        color: var(--text-secondary);
        transition: color 0.3s ease;
      }
      ::ng-deep .premium-tabs .mat-mdc-tab:hover .mdc-tab__text-label {
        color: var(--text-primary);
      }
      ::ng-deep
        .premium-tabs
        .mat-mdc-tab.mdc-tab--active
        .mdc-tab__text-label {
        color: #818cf8;
      }
      ::ng-deep .premium-tabs .mdc-tab-indicator__content--underline {
        border-color: #818cf8 !important;
        border-width: 3px !important;
        border-top-left-radius: 3px;
        border-top-right-radius: 3px;
      }
      .tab-content {
        padding: 32px 40px;
        max-width: 700px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 8px;
      }
      .section-subtitle {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 32px;
        line-height: 1.5;
      }
      .full-width {
        width: 100%;
        margin-bottom: 24px;
      }
      /* Settings List Styles for Compliance Tab */
      .settings-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 32px;
      }
      .settings-list-item {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 20px 24px;
        transition: background 0.2s ease;
      }
      .settings-list-item:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .settings-list-item.clickable-row {
        cursor: pointer;
      }
      .item-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20px;
        flex-shrink: 0;
      }
      .item-icon-wrapper.radar-icon {
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
      }
      .item-icon-wrapper.timer-icon {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      .item-icon-wrapper mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
      .item-details {
        flex: 1;
      }
      .item-details h3 {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 4px 0;
      }
      .item-details p {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0;
      }
      .item-action {
        margin-left: 24px;
      }
      .custom-input-wrapper {
        display: flex;
        align-items: center;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        padding: 0 12px;
        height: 40px;
        transition: border-color 0.2s ease;
      }
      .custom-input-wrapper:focus-within {
        border-color: #818cf8;
      }
      .premium-input {
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 15px;
        font-family: inherit;
        width: 80px;
        outline: none;
        text-align: right;
      }
      .premium-input::-webkit-outer-spin-button,
      .premium-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .input-suffix {
        color: var(--text-secondary);
        font-size: 14px;
        margin-left: 8px;
        user-select: none;
      }

      /* Premium Switch Styles */
      .premium-switch {
        width: 52px;
        height: 28px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .premium-switch.active {
        background: #6366f1;
        border-color: #6366f1;
        box-shadow:
          inset 0 2px 4px rgba(0, 0, 0, 0.1),
          0 0 12px rgba(99, 102, 241, 0.4);
      }
      .premium-switch-thumb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #ffffff;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .premium-switch.active .premium-switch-thumb {
        transform: translateX(24px);
      }

      .actions {
        margin-top: 16px;
        display: flex;
        justify-content: flex-start;
      }
      .save-btn {
        height: 44px;
        padding: 0 24px !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        letter-spacing: 0.3px !important;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Provider Grid Styles */
      .provider-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }
      .provider-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 24px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        cursor: pointer;
        position: relative;
        transition: all 0.3s ease;
      }
      .provider-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      .provider-card.selected {
        background: rgba(99, 102, 241, 0.08);
        border-color: #818cf8;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
      }
      .provider-icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        color: var(--text-secondary);
        transition: all 0.3s ease;
      }
      .provider-icon-wrapper mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .provider-card.selected .provider-icon-wrapper {
        background: #818cf8;
        color: #fff;
      }
      .provider-info h3 {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 6px 0;
      }
      .provider-info p {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
      }
      .check-indicator {
        position: absolute;
        top: 12px;
        right: 12px;
        color: #818cf8;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.3s ease;
      }
      .provider-card.selected .check-indicator {
        opacity: 1;
        transform: scale(1);
      }

      ::ng-deep .premium-field .mdc-notched-outline__leading,
      ::ng-deep .premium-field .mdc-notched-outline__notch,
      ::ng-deep .premium-field .mdc-notched-outline__trailing {
        border-color: var(--border-subtle) !important;
      }
      ::ng-deep .premium-field .mat-mdc-form-field-focus-overlay {
        background-color: transparent !important;
      }
      ::ng-deep .premium-field.mat-focused .mdc-notched-outline__leading,
      ::ng-deep .premium-field.mat-focused .mdc-notched-outline__notch,
      ::ng-deep .premium-field.mat-focused .mdc-notched-outline__trailing {
        border-color: #818cf8 !important;
      }
      ::ng-deep .premium-field .mat-mdc-form-field-icon-prefix {
        color: var(--text-secondary);
        padding-right: 12px;
      }
      ::ng-deep
        .premium-field
        .mdc-text-field--outlined:not(.mdc-text-field--disabled)
        .mdc-text-field__input {
        color: var(--text-primary) !important;
      }
    `,
  ],
})
export class PlatformSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private platformService = inject(PlatformService);
  private snackBar = inject(MatSnackBar);

  integrationsForm: FormGroup;
  complianceForm: FormGroup;

  constructor() {
    this.integrationsForm = this.fb.group({
      mapProvider: ['OPENSTREETMAP'],
      googleMapsKey: [''],
      mapboxKey: [''],
    });

    this.complianceForm = this.fb.group({
      maxGeofenceRadius: [500],
      enforceDebounce: [true],
    });
  }

  ngOnInit() {
    this.loadSettings();
  }

  selectProvider(provider: string) {
    this.integrationsForm.patchValue({ mapProvider: provider });
  }

  toggleDebounce() {
    const ctrl = this.complianceForm.get('enforceDebounce');
    if (ctrl) {
      ctrl.setValue(!ctrl.value);
    }
  }

  loadSettings() {
    this.platformService.getSettings().subscribe({
      next: (settings) => {
        const mapProvider =
          settings.find((s) => s.key === 'MAP_PROVIDER')?.value ||
          'OPENSTREETMAP';
        const googleMapsKey =
          settings.find((s) => s.key === 'GOOGLE_MAPS_KEY')?.value || '';
        const mapboxKey =
          settings.find((s) => s.key === 'MAPBOX_KEY')?.value || '';
        const maxRadius =
          settings.find((s) => s.key === 'MAX_GEOFENCE_RADIUS')?.value || '500';
        const enforceDebounce =
          settings.find((s) => s.key === 'ENFORCE_DEBOUNCE')?.value !== 'false';

        this.integrationsForm.patchValue({
          mapProvider,
          googleMapsKey,
          mapboxKey,
        });
        this.complianceForm.patchValue({
          maxGeofenceRadius: parseInt(maxRadius, 10),
          enforceDebounce,
        });
      },
      error: () => {
        this.snackBar.open('Failed to load settings', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  saveIntegrations() {
    const vals = this.integrationsForm.value;
    const payload = [
      {
        key: 'MAP_PROVIDER',
        value: vals.mapProvider,
        category: 'INTEGRATIONS',
      },
      {
        key: 'GOOGLE_MAPS_KEY',
        value: vals.googleMapsKey,
        category: 'INTEGRATIONS',
      },
      { key: 'MAPBOX_KEY', value: vals.mapboxKey, category: 'INTEGRATIONS' },
    ];

    this.platformService.updateSettings(payload).subscribe({
      next: () =>
        this.snackBar.open('Integration settings saved successfully', 'Close', {
          duration: 3000,
        }),
      error: () =>
        this.snackBar.open('Failed to save settings', 'Close', {
          duration: 3000,
        }),
    });
  }

  saveCompliance() {
    const vals = this.complianceForm.value;
    const payload = [
      {
        key: 'MAX_GEOFENCE_RADIUS',
        value: vals.maxGeofenceRadius.toString(),
        category: 'COMPLIANCE',
      },
      {
        key: 'ENFORCE_DEBOUNCE',
        value: vals.enforceDebounce.toString(),
        category: 'COMPLIANCE',
      },
    ];

    this.platformService.updateSettings(payload).subscribe({
      next: () =>
        this.snackBar.open('Compliance rules saved successfully', 'Close', {
          duration: 3000,
        }),
      error: () =>
        this.snackBar.open('Failed to save settings', 'Close', {
          duration: 3000,
        }),
    });
  }
}

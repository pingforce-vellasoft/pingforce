import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Mandatory tenant onboarding after first sign-in: a required company/profile
 * step and an optional white-label branding step. Posts to
 * /auth/onboarding/tenant, then continues to the dashboard.
 */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="ob-container">
      <mat-card class="ob-card">
        <mat-card-header>
          <mat-card-title>Set up your workspace</mat-card-title>
          <mat-card-subtitle>
            A few details to finish setting up PingForce.
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-stepper linear #stepper>
            <!-- Step 1 — mandatory profile -->
            <mat-step [stepControl]="profileForm">
              <form [formGroup]="profileForm">
                <ng-template matStepLabel>Company & profile</ng-template>

                <div class="name-row">
                  <mat-form-field appearance="fill" class="half-width">
                    <mat-label>First name</mat-label>
                    <input matInput formControlName="firstName" />
                  </mat-form-field>
                  <mat-form-field appearance="fill" class="half-width">
                    <mat-label>Last name</mat-label>
                    <input matInput formControlName="lastName" />
                  </mat-form-field>
                </div>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Mobile phone</mat-label>
                  <input matInput formControlName="phone" />
                  <mat-icon matIconPrefix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Company name</mat-label>
                  <input matInput formControlName="tenantName" />
                  <mat-icon matIconPrefix>business</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Industry</mat-label>
                  <input matInput formControlName="industry" />
                </mat-form-field>

                <div class="step-actions">
                  <button
                    mat-flat-button
                    color="primary"
                    matStepperNext
                    [disabled]="profileForm.invalid"
                  >
                    Next
                  </button>
                </div>
              </form>
            </mat-step>

            <!-- Step 2 — optional white-label branding -->
            <mat-step [optional]="true">
              <ng-template matStepLabel>Branding (optional)</ng-template>

              <form [formGroup]="brandingForm">
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Legal company name</mat-label>
                  <input matInput formControlName="legalName" />
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Theme color (hex)</mat-label>
                  <input
                    matInput
                    formControlName="themeColor"
                    placeholder="#6366f1"
                  />
                  <mat-icon matIconPrefix>palette</mat-icon>
                </mat-form-field>

                <div class="logo-row">
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="fileInput.click()"
                  >
                    <mat-icon>image</mat-icon> Upload logo
                  </button>
                  @if (logoName) {
                    <span class="logo-name">{{ logoName }}</span>
                  }
                  <input
                    #fileInput
                    type="file"
                    accept="image/*"
                    hidden
                    (change)="onLogoSelected($event)"
                  />
                </div>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Address</mat-label>
                  <input matInput formControlName="address" />
                </mat-form-field>

                <div class="name-row">
                  <mat-form-field appearance="fill" class="half-width">
                    <mat-label>City</mat-label>
                    <input matInput formControlName="city" />
                  </mat-form-field>
                  <mat-form-field appearance="fill" class="half-width">
                    <mat-label>State</mat-label>
                    <input matInput formControlName="state" />
                  </mat-form-field>
                </div>
              </form>

              @if (errorMessage) {
                <div class="error-message">{{ errorMessage }}</div>
              }

              <div class="step-actions">
                <button mat-button matStepperPrevious [disabled]="isLoading">
                  Back
                </button>
                <button
                  mat-flat-button
                  color="primary"
                  (click)="finish()"
                  [disabled]="profileForm.invalid || isLoading"
                >
                  {{ isLoading ? 'Finishing…' : 'Finish setup' }}
                </button>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .ob-container {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 40px 24px;
      }
      .ob-card {
        width: 100%;
        max-width: 560px;
        padding: 24px;
      }
      .full-width {
        width: 100%;
        margin-bottom: 8px;
      }
      .name-row {
        display: flex;
        gap: 16px;
      }
      .half-width {
        flex: 1;
        margin-bottom: 8px;
      }
      .step-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .logo-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 8px 0 16px;
      }
      .logo-name {
        font-size: 13px;
        color: var(--text-secondary);
      }
      .error-message {
        color: #f44336;
        font-size: 14px;
        margin: 8px 0;
        text-align: center;
      }
    `,
  ],
})
export class OnboardingComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);

  isLoading = false;
  errorMessage = '';
  logoName = '';
  private logoBase64: string | null = null;

  profileForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    tenantName: ['', Validators.required],
    industry: [''],
  });

  brandingForm: FormGroup = this.fb.group({
    legalName: [''],
    themeColor: [''],
    address: [''],
    city: [''],
    state: [''],
  });

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoBase64 = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  finish(): void {
    if (this.profileForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      ...this.profileForm.value,
      ...this.brandingForm.value,
      ...(this.logoBase64 ? { logoBase64: this.logoBase64 } : {}),
    };

    this.http.post('/api/v1/auth/onboarding/tenant', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Workspace ready. Welcome to PingForce!', 'Close', {
          duration: 6000,
        });
        // Refresh the cached profile so isOnboarded flips, then go to dashboard.
        this.auth.fetchProfile().subscribe();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ?? 'Could not save. Please try again.';
      },
    });
  }
}

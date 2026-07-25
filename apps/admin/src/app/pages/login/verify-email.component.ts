import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Second step of website self-signup: the admin enters the OTP emailed after
 * register-tenant. A successful verification activates the workspace
 * (PROVISIONING → ACTIVE on the API) so the admin can sign in.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="ve-container">
      <mat-card class="ve-card">
        <mat-card-header>
          <div mat-card-avatar class="logo-avatar">
            <mat-icon color="primary">mark_email_read</mat-icon>
          </div>
          <mat-card-title>Verify your email</mat-card-title>
          <mat-card-subtitle>
            Enter the 6-digit code we sent to
            {{ form.get('email')?.value || 'your email' }}.
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
              <mat-icon matIconPrefix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Verification code</mat-label>
              <input
                matInput
                formControlName="otp"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
              />
              <mat-icon matIconPrefix>pin</mat-icon>
              @if (
                form.get('otp')?.hasError('minlength') ||
                form.get('otp')?.hasError('maxlength')
              ) {
                <mat-error>Enter the 6-digit code</mat-error>
              }
            </mat-form-field>

            @if (errorMessage) {
              <div class="error-message">{{ errorMessage }}</div>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="submit-btn"
              [disabled]="form.invalid || isLoading"
            >
              {{ isLoading ? 'Verifying…' : 'Verify & activate workspace' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .ve-container {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 24px;
      }
      .ve-card {
        width: 100%;
        max-width: 420px;
        padding: 24px;
      }
      .logo-avatar {
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 50%;
        width: 48px;
        height: 48px;
      }
      .full-width {
        width: 100%;
        margin-bottom: 8px;
      }
      .submit-btn {
        width: 100%;
        margin-top: 16px;
        padding: 8px;
      }
      .error-message {
        color: #f44336;
        font-size: 14px;
        margin-bottom: 16px;
        text-align: center;
      }
    `,
  ],
})
export class VerifyEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  isLoading = false;
  errorMessage = '';
  private tenantCode = '';

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    otp: [
      '',
      [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    ],
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.tenantCode = qp.get('tenantCode') ?? '';
    const email = qp.get('email');
    if (email) this.form.patchValue({ email });
  }

  onSubmit() {
    if (this.form.invalid || !this.tenantCode) {
      if (!this.tenantCode) {
        this.errorMessage = 'Missing workspace reference. Start signup again.';
      }
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .verifyEmail({
        tenantCode: this.tenantCode,
        email: this.form.value.email,
        otp: this.form.value.otp,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open(
            `Workspace activated! Your Workspace ID is ${this.tenantCode}. Sign in to continue.`,
            'Close',
            { duration: 10000 },
          );
          // Sign in next; the onboarding wizard runs after first login.
          this.router.navigate(['/login'], {
            queryParams: { tenantCode: this.tenantCode },
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err?.error?.message ?? 'Invalid or expired code. Try again.';
        },
      });
  }
}

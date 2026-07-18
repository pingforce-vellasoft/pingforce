import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
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
    <div class="cp-container">
      <mat-card class="cp-card">
        <mat-card-header>
          <div mat-card-avatar class="logo-avatar">
            <mat-icon color="primary">lock_reset</mat-icon>
          </div>
          <mat-card-title>Set a new password</mat-card-title>
          <mat-card-subtitle
            >Your temporary password must be changed before you
            continue.</mat-card-subtitle
          >
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Current (temporary) password</mat-label>
              <input
                matInput
                formControlName="currentPassword"
                type="password"
              />
              <mat-icon matIconPrefix>lock</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>New password</mat-label>
              <input matInput formControlName="newPassword" type="password" />
              <mat-icon matIconPrefix>lock_open</mat-icon>
              @if (form.get('newPassword')?.hasError('minlength')) {
                <mat-error>At least 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Confirm new password</mat-label>
              <input
                matInput
                formControlName="confirmPassword"
                type="password"
              />
              <mat-icon matIconPrefix>lock_open</mat-icon>
            </mat-form-field>

            @if (
              form.hasError('mismatch') && form.get('confirmPassword')?.touched
            ) {
              <div class="error-message">Passwords do not match</div>
            }
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
              {{ isLoading ? 'Saving…' : 'Change password' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .cp-container {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .cp-card {
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
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';

  form: FormGroup = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  onSubmit() {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    const { currentPassword, newPassword } = this.form.value;
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      // On success the API kills the session; changePassword() logs out and
      // routes to /login. Nothing more to do here.
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ?? 'Could not change password. Try again.';
      },
    });
  }
}

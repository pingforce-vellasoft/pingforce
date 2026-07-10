import { Component, inject } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div mat-card-avatar class="logo-avatar">
            <mat-icon color="primary">work</mat-icon>
          </div>
          <mat-card-title>PingForce Admin</mat-card-title>
          <mat-card-subtitle>Sign in to your workspace</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Workspace ID (Tenant)</mat-label>
              <input
                matInput
                formControlName="tenantId"
                placeholder="acme-corp"
              />
              <mat-icon matIconPrefix>domain</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email or Username</mat-label>
              <input matInput formControlName="username" type="text" />
              <mat-icon matIconPrefix>person</mat-icon>
              @if (loginForm.get('username')?.hasError('required')) {
                <mat-error> Username is required </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                formControlName="password"
                [type]="hidePassword ? 'password' : 'text'"
              />
              <mat-icon matIconPrefix>lock</mat-icon>
              <button
                mat-icon-button
                matIconSuffix
                (click)="hidePassword = !hidePassword"
                type="button"
              >
                <mat-icon>{{
                  hidePassword ? 'visibility_off' : 'visibility'
                }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required')) {
                <mat-error> Password is required </mat-error>
              }
            </mat-form-field>

            @if (errorMessage) {
              <div class="error-message">
                {{ errorMessage }}
              </div>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="submit-btn"
              [disabled]="loginForm.invalid || isLoading"
            >
              @if (!isLoading) {
                <span>Sign In</span>
              }
              @if (isLoading) {
                <span>
                  <mat-icon class="spin-icon">autorenew</mat-icon> Signing In...
                </span>
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-container {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: transparent;
      }
      .login-card {
        width: 100%;
        max-width: 400px;
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
      .spin-icon {
        animation: spin 1.5s linear infinite;
        vertical-align: middle;
        margin-right: 4px;
        font-size: 20px;
        height: 20px;
        width: 20px;
      }
      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      tenantId: [''],
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const formValue = this.loginForm.value;
      const payload = {
        tenantCode: formValue.tenantId,
        email: formValue.username,
        password: formValue.password,
        portalType: 'ADMIN_PORTAL',
      };

      this.authService.login(payload).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Invalid credentials or workspace ID';
          console.error('Login error', err);
        },
      });
    }
  }
}

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tenant-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <div mat-card-avatar class="logo-avatar">
            <mat-icon color="primary">domain_add</mat-icon>
          </div>
          <mat-card-title>Register Your Company</mat-card-title>
          <mat-card-subtitle>Create a new PingForce workspace</mat-card-subtitle>
        </mat-card-header>
    
        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            
            <div class="form-section-title">Company Details</div>
            
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Company Name</mat-label>
              <input matInput formControlName="tenantName" placeholder="Acme Corp">
              <mat-icon matIconPrefix>business</mat-icon>
            </mat-form-field>
    
            <div class="form-section-title">Admin Account</div>

            <div class="name-row">
              <mat-form-field appearance="fill" class="half-width">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="adminFirstName">
              </mat-form-field>

              <mat-form-field appearance="fill" class="half-width">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="adminLastName">
              </mat-form-field>
            </div>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Admin Email</mat-label>
              <input matInput formControlName="adminEmail" type="email">
              <mat-icon matIconPrefix>email</mat-icon>
            </mat-form-field>
    
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="adminPassword" [type]="hidePassword ? 'password' : 'text'">
              <mat-icon matIconPrefix>lock</mat-icon>
              <button mat-icon-button matIconSuffix (click)="hidePassword = !hidePassword" type="button">
                <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
            </mat-form-field>
    
            @if (errorMessage) {
              <div class="error-message">
                {{ errorMessage }}
              </div>
            }
    
            <button mat-flat-button color="primary" type="submit" class="submit-btn" [disabled]="registerForm.invalid || isLoading">
              @if (!isLoading) {
                <span>Register</span>
              }
              @if (isLoading) {
                <span>
                  <mat-icon class="spin-icon">autorenew</mat-icon> Registering...
                </span>
              }
            </button>
            
            <div class="login-link">
              Already have an account? <a routerLink="/login">Sign in</a>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: transparent;
      padding: 24px;
    }
    .register-card {
      width: 100%;
      max-width: 480px;
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
    .form-section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 16px 0 12px 0;
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
    .login-link {
      margin-top: 24px;
      text-align: center;
      font-size: 14px;
      color: var(--text-secondary);
    }
    .login-link a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
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
      100% { transform: rotate(360deg); }
    }
  `]
})
export class TenantRegisterComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  registerForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  constructor() {
    this.registerForm = this.fb.group({
      tenantName: ['', Validators.required],
      adminFirstName: ['', Validators.required],
      adminLastName: ['', Validators.required],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.http.post('/api/v1/auth/register-tenant', this.registerForm.value).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.snackBar.open(`Tenant registered! Your Workspace ID is: ${response.tenantCode}`, 'Close', { duration: 10000 });
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        }
      });
    }
  }
}

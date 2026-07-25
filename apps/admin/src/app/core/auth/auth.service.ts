import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of, Observable, shareReplay } from 'rxjs';
import { Router } from '@angular/router';

export interface UserProfile {
  userId: string;
  tenantId: string;
  /** Human-facing workspace identifier (tenant code) shown on the dashboard. */
  workspaceId?: string;
  workspaceName?: string;
  email: string;
  roleCode?: string;
  isOnboarded?: boolean;
  mustChangePassword?: boolean;
  /** Whether the attendance module is provisioned for this tenant. */
  isAttendanceEnabled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'pingforce_admin_token';
  private readonly REFRESH_TOKEN_KEY = 'pingforce_admin_refresh_token';
  private readonly IMPERSONATED_TENANT_KEY = 'pingforce_impersonated_tenant';

  isAuthenticated = signal<boolean>(this.hasToken());
  currentUser = signal<UserProfile | null>(null);
  impersonatedTenantId = signal<string | null>(
    localStorage.getItem(this.IMPERSONATED_TENANT_KEY),
  );

  setImpersonatedTenant(tenantId: string | null) {
    if (tenantId) {
      localStorage.setItem(this.IMPERSONATED_TENANT_KEY, tenantId);
    } else {
      localStorage.removeItem(this.IMPERSONATED_TENANT_KEY);
    }
    this.impersonatedTenantId.set(tenantId);
  }

  login(credentials: any) {
    return this.http.post<any>('/api/v1/auth/login', credentials).pipe(
      tap((response) => {
        if (response && response.accessToken) {
          this.setTokens(response.accessToken, response.refreshToken);
          this.isAuthenticated.set(true);
          // Drop any profile cached against the previous session before
          // re-fetching for the account that just signed in.
          this.profileFetch$ = null;
          this.fetchProfile().subscribe();
        }
      }),
    );
  }

  refreshToken(): Observable<any> {
    const rToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!rToken) {
      this.logout();
      return of(null);
    }

    return this.http
      .post<any>('/api/v1/auth/refresh', { refreshToken: rToken })
      .pipe(
        tap((response) => {
          if (response && response.accessToken) {
            this.setTokens(response.accessToken, response.refreshToken);
          }
        }),
        catchError((err) => {
          this.logout();
          throw err;
        }),
      );
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Tears down all client-side session state without navigating. Guards use
   * this when /auth/me rejects a stored token, so they can return their own
   * UrlTree instead of racing an imperative navigate().
   */
  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.IMPERSONATED_TENANT_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.impersonatedTenantId.set(null);
    this.profileFetch$ = null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(allowedRoles: string[]): boolean {
    const user = this.currentUser(); // Reads the signal, so the template tracks it
    if (!user || !user.roleCode) return false;
    return allowedRoles.includes(user.roleCode);
  }

  private profileFetch$: Observable<UserProfile | null> | null = null;

  fetchProfile(): Observable<UserProfile | null> {
    if (this.profileFetch$) {
      return this.profileFetch$;
    }

    this.profileFetch$ = this.http.get<UserProfile>('/api/v1/auth/me').pipe(
      tap((profile) => {
        if (profile) {
          // A missing role must never grant elevated access — default to
          // no role so hasRole() denies everything until the API says otherwise.
          profile.roleCode = profile.roleCode || 'NONE';
        }
        this.currentUser.set(profile);
      }),
      catchError(() => {
        // The stored token is dead (expired/revoked). Drop it so authGuard
        // stops treating this browser as signed in and guards can safely
        // route to /login.
        this.clearSession();
        return of(null);
      }),
      // shareReplay must cache after completion so every guard in a single
      // navigation reuses one /auth/me response. Clearing the cache in
      // finalize() would let a second guard fire a duplicate request.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.profileFetch$;
  }

  /**
   * Self-service password change. On success the API bumps tokenVersion and
   * revokes every session, so the current token is now dead — force a fresh
   * sign-in.
   */
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<any> {
    return this.http
      .post<any>('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      })
      .pipe(tap(() => this.logout()));
  }

  /**
   * Self-service workspace signup. Creates the tenant plus its super-admin and
   * emails a verification code; no session is established until that code is
   * confirmed.
   */
  registerTenant(payload: unknown): Observable<any> {
    return this.http.post<any>('/api/v1/auth/register-tenant', payload);
  }

  /** Confirms the emailed signup code and activates the workspace. */
  verifyEmail(payload: {
    tenantCode: string;
    email: string;
    otp: string;
  }): Observable<any> {
    return this.http.post<any>('/api/v1/auth/verify-email', payload);
  }

  /** Completes the tenant profile after first sign-in (onboarding wizard). */
  submitOnboarding(payload: unknown): Observable<any> {
    return this.http.post<any>('/api/v1/auth/onboarding/tenant', payload);
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }
}

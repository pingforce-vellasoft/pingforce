import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of, Observable, finalize, shareReplay } from 'rxjs';
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
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.IMPERSONATED_TENANT_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.impersonatedTenantId.set(null);
    this.router.navigate(['/login']);
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
      catchError(() => of(null)),
      finalize(() => {
        this.profileFetch$ = null;
      }),
      shareReplay(1),
    );
    return this.profileFetch$;
  }

  /**
   * Self-service password change. On success the API bumps tokenVersion and
   * revokes every session, so the current token is now dead — force a fresh
   * sign-in.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http
      .post<any>('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      })
      .pipe(tap(() => this.logout()));
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

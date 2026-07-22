import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Platform administration API (4.1 API_LAYER.md — feature-based services,
 * no direct HttpClient usage in components).
 */
@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private http = inject(HttpClient);

  // ── Tenants ────────────────────────────────────────────────────────────────

  getTenants(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/tenants');
  }

  getTenant(id: string): Observable<any> {
    return this.http.get(`/api/v1/tenants/${id}`);
  }

  createTenant(payload: unknown): Observable<any> {
    return this.http.post('/api/v1/tenants', payload);
  }

  deleteTenant(id: string): Observable<any> {
    return this.http.delete(`/api/v1/tenants/${id}`);
  }

  updateTenant(id: string, payload: unknown): Observable<any> {
    return this.http.patch(`/api/v1/tenants/${id}`, payload);
  }

  updateTenantProvisioning(id: string, payload: unknown): Observable<any> {
    return this.http.patch(`/api/v1/tenants/${id}/provisioning`, payload);
  }

  /** Manually activate a PROVISIONING tenant without email verification. */
  activateTenant(
    id: string,
  ): Observable<{ success: boolean; status: string; email: string | null }> {
    return this.http.post<{
      success: boolean;
      status: string;
      email: string | null;
    }>(`/api/v1/tenants/${id}/activate`, {});
  }

  resendTenantInvite(
    id: string,
  ): Observable<{ success: boolean; email: string }> {
    return this.http.post<{ success: boolean; email: string }>(
      `/api/v1/tenants/${id}/resend-invite`,
      {},
    );
  }

  // ── Platform settings ──────────────────────────────────────────────────────

  getSettings(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/platform/settings');
  }

  updateSettings(payload: unknown): Observable<any> {
    return this.http.put('/api/v1/platform/settings', payload);
  }

  // ── Billing & Subscriptions (Super Admin) ──────────────────────────────────

  getBillingSummary(): Observable<any> {
    return this.http.get('/api/v1/billing/analytics/summary');
  }

  getPlanMix(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/billing/analytics/plan-mix');
  }

  getRevenueTrend(months = 6): Observable<any[]> {
    return this.http.get<any[]>(
      `/api/v1/billing/analytics/revenue-trend?months=${months}`,
    );
  }

  getSubscriptions(status?: string): Observable<any[]> {
    const query = status ? `?status=${status}` : '';
    return this.http.get<any[]>(`/api/v1/billing/subscriptions${query}`);
  }

  cancelSubscription(id: string): Observable<any> {
    return this.http.post(`/api/v1/billing/subscriptions/${id}/cancel`, {});
  }

  getPlans(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/billing/plans');
  }
}

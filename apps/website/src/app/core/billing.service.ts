import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** A plan as served by the public billing API (amount in paise). */
export interface ApiPlan {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly interval: 'MONTHLY' | 'YEARLY';
  readonly features: string[];
  readonly maxFieldStaff: number | null;
  readonly highlighted: boolean;
  readonly isCustom: boolean;
  /** >0 marks a no-card free-trial plan. */
  readonly trialDays: number;
}

export interface CheckoutRequest {
  readonly planCode: string;
  readonly customerEmail: string;
  readonly customerName?: string;
  readonly organizationName?: string;
}

export interface CheckoutResult {
  readonly mode: 'checkout' | 'contact_sales' | 'trial';
  readonly checkoutUrl?: string;
  readonly message?: string;
  /** Set for both paid and trial checkouts — the subscription to link at signup. */
  readonly subscriptionId?: string;
  readonly trialEnd?: string;
}

/**
 * Public billing API client for the marketing site. No auth — these endpoints
 * are open (plan catalog + checkout initiation).
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  // Absolute in prod (api.pingforce.in), relative in dev so the nx proxy handles it.
  private readonly api = `${environment.apiUrl}/api/v1/public/billing`;

  getPlans(): Observable<ApiPlan[]> {
    return this.http.get<ApiPlan[]>(`${this.api}/plans`);
  }

  checkout(payload: CheckoutRequest): Observable<CheckoutResult> {
    return this.http.post<CheckoutResult>(`${this.api}/checkout`, payload);
  }
}

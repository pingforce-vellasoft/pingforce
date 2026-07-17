import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}

export interface CheckoutRequest {
  readonly planCode: string;
  readonly customerEmail: string;
  readonly customerName?: string;
  readonly organizationName?: string;
}

export interface CheckoutResult {
  readonly mode: 'checkout' | 'contact_sales';
  readonly checkoutUrl?: string;
  readonly message?: string;
}

/**
 * Public billing API client for the marketing site. No auth — these endpoints
 * are open (plan catalog + checkout initiation).
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/v1/public/billing';

  getPlans(): Observable<ApiPlan[]> {
    return this.http.get<ApiPlan[]>(`${this.api}/plans`);
  }

  checkout(payload: CheckoutRequest): Observable<CheckoutResult> {
    return this.http.post<CheckoutResult>(`${this.api}/checkout`, payload);
  }
}

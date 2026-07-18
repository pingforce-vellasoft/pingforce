import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  id: string;
  customerCode: string;
  legalName: string;
  displayName?: string;
  customerType?: string;
  primaryEmail?: string;
  primaryMobile?: string;
  industry?: string;
  status?: string;
  createdAt?: string;
}

export interface CreateCustomerPayload {
  customerCode: string;
  legalName: string;
  displayName?: string;
  customerType?: string;
  primaryEmail?: string;
  primaryMobile?: string;
  industry?: string;
  status?: string;
}

export interface PortalContact {
  id: string;
  email?: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  status?: string;
  portalRole?: string;
}

export interface PortalListResult {
  users: PortalContact[];
  invites: PortalContact[];
}

export interface InvitePortalPayload {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  portalRole?: string;
}

export interface PortalInviteResult {
  id: string;
  expiresAt: string;
  inviteToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/customers';

  findAll(skip?: number, take?: number): Observable<Customer[]> {
    let url = this.api;
    const params: string[] = [];
    if (skip != null) params.push(`skip=${skip}`);
    if (take != null) params.push(`take=${take}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<Customer[]>(url);
  }

  create(payload: CreateCustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(this.api, payload);
  }

  // ── Portal invites (reuses existing customer-portal invite endpoint) ────────

  listPortal(customerId: string): Observable<PortalListResult> {
    return this.http.get<PortalListResult>(`${this.api}/${customerId}/portal`);
  }

  invitePortal(
    customerId: string,
    payload: InvitePortalPayload,
  ): Observable<PortalInviteResult> {
    return this.http.post<PortalInviteResult>(
      `${this.api}/${customerId}/portal/invites`,
      payload,
    );
  }

  revokeInvite(customerId: string, inviteId: string): Observable<unknown> {
    return this.http.delete(
      `${this.api}/${customerId}/portal/invites/${inviteId}`,
    );
  }
}

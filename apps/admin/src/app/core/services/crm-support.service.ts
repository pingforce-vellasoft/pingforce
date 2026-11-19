import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
}

export interface LeadOwner {
  id: string;
  email?: string | null;
  profile?: { firstName?: string | null; lastName?: string | null } | null;
}

/** Shape of GET /api/v1/leads/pipeline rows (3.4 LeadManagement). */
export interface Lead {
  id: string;
  leadNumber: string;
  firstName: string;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  mobile?: string | null;
  expectedValue?: number | null;
  currencyCode?: string | null;
  pipelineStageId?: string | null;
  pipelineStage?: PipelineStage | null;
  ownerUser?: LeadOwner | null;
  convertedCustomerId?: string | null;
  createdAt: string;
}

/** The API caps a page at 100 rows. */
export const LEAD_PAGE_SIZE = 100;

@Injectable({
  providedIn: 'root',
})
export class CrmSupportService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/leads';

  getLeads(cursor?: string, take = 50): Observable<Lead[]> {
    let params = new HttpParams().set('take', take);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<Lead[]>(this.api, { params });
  }

  /** Leads with their stage, newest first; page with the last id as cursor. */
  getPipeline(cursor?: string, take = LEAD_PAGE_SIZE): Observable<Lead[]> {
    let params = new HttpParams().set('take', take);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<Lead[]>(`${this.api}/pipeline`, { params });
  }

  /** Board columns. The API seeds the default stages on first call. */
  getStages(): Observable<PipelineStage[]> {
    return this.http.get<PipelineStage[]>(`${this.api}/stages`);
  }

  updateLeadStage(leadId: string, pipelineStageId: string): Observable<Lead> {
    return this.http.patch<Lead>(`${this.api}/${leadId}/stage`, {
      pipelineStageId,
    });
  }
}

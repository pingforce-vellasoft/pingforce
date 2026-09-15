import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone?: string;
  source: string;
  pipelineStage: {
    id: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CrmSupportService {
  private http = inject(HttpClient);

  // Leads
  getLeads(cursor?: string, take = 50) {
    let url = `/api/v1/leads?take=${take}`;
    if (cursor) url += `&cursor=${cursor}`;
    return this.http.get<Lead[]>(url);
  }

  updateLeadStage(leadId: string, pipelineStageId: string) {
    return this.http.patch(`/api/v1/leads/${leadId}/stage`, {
      pipelineStageId,
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  primaryEmail?: string;
  primaryMobile?: string;
  employmentType?: string;
  joiningDate?: string;
  userId?: string;
  createdAt?: string;
}

export interface CreateEmployeePayload {
  employeeCode: string;
  firstName: string;
  lastName: string;
  primaryEmail?: string;
  primaryMobile?: string;
  joiningDate?: string;
  employmentType?: string;
  roleId?: string;
}

export interface CreateEmployeeResult extends Employee {
  // Present only when a login account was provisioned (roleId supplied).
  tempPassword?: string;
}

export interface EmployeeInviteResult {
  message: string;
  email: string;
  workspaceId: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/employees';

  findAll(take = 50, cursor?: string): Observable<Employee[]> {
    let url = `${this.api}?take=${take}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    return this.http.get<Employee[]>(url);
  }

  create(payload: CreateEmployeePayload): Observable<CreateEmployeeResult> {
    return this.http.post<CreateEmployeeResult>(this.api, payload);
  }

  invite(id: string): Observable<EmployeeInviteResult> {
    return this.http.post<EmployeeInviteResult>(`${this.api}/${id}/invite`, {});
  }
}

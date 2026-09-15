import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/** Fault lifecycle — mirrors apps/api/src/faults/domain/fault-state.ts. */
export type FaultStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'REOPENED'
  | 'CLOSED';

export type FaultPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const FAULT_STATUSES: readonly FaultStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'REOPENED',
  'CLOSED',
];

export const FAULT_PRIORITIES: readonly FaultPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

/**
 * Transitions the API will accept, kept in sync with the server-side state
 * machine so the UI only offers moves that will succeed.
 */
export const FAULT_TRANSITIONS: Readonly<Record<FaultStatus, FaultStatus[]>> = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED', 'ASSIGNED'],
  ON_HOLD: ['IN_PROGRESS', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['IN_PROGRESS', 'ASSIGNED'],
  CLOSED: [],
};

export interface FaultAssignee {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string } | null;
}

export interface FaultCustomer {
  id: string;
  name?: string;
  companyName?: string;
}

export interface FaultTimelineEntry {
  id: string;
  status: string;
  notes?: string | null;
  isCustomerVisible: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface Fault {
  id: string;
  faultNumber: string;
  title: string;
  description: string;
  status: FaultStatus;
  priority: FaultPriority;
  category?: string | null;
  subCategory?: string | null;
  channel: string;
  customerId?: string | null;
  customer?: FaultCustomer | null;
  assignedToId?: string | null;
  assignedToUser?: FaultAssignee | null;
  slaDeadline?: string | null;
  slaPausedMinutes: number;
  isEscalated: boolean;
  escalationLevel: number;
  reopenCount: number;
  resolvedAt?: string | null;
  closedAt?: string | null;
  customerRating?: number | null;
  customerRatingComment?: string | null;
  visitId?: string | null;
  connectionId?: string | null;
  createdAt: string;
  updatedAt: string;
  faultTimelines?: FaultTimelineEntry[];
}

export interface FaultListFilter {
  skip?: number;
  take?: number;
  status?: FaultStatus[];
  priority?: FaultPriority[];
  assignedToId?: string;
  customerId?: string;
  category?: string;
  channel?: string;
  slaBreached?: boolean;
  unassigned?: boolean;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedFaults {
  items: Fault[];
  total: number;
}

export interface SlaPolicy {
  id: string;
  priority: FaultPriority;
  resolveInHours: number;
  escalateToId?: string | null;
}

interface EmployeeRow {
  id: string;
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
}

/** An employee with a login account, addressable by `Fault.assignedToId`. */
export interface AssignableUser {
  userId: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
}

export interface FaultAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  isCustomerVisible: boolean;
  createdAt: string;
}

/**
 * Fault (support ticket) API access. All HTTP for the fault console lives
 * here; components hold state in signals and never call HttpClient directly.
 */
@Injectable({ providedIn: 'root' })
export class FaultService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/faults';

  list(filter: FaultListFilter = {}): Observable<PaginatedFaults> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;
      // Array filters are sent comma-joined; the API splits either form.
      params = params.set(
        key,
        Array.isArray(value) ? value.join(',') : String(value),
      );
    }

    return this.http.get<PaginatedFaults>(this.base, { params });
  }

  getById(id: string): Observable<Fault> {
    return this.http.get<Fault>(`${this.base}/${id}`);
  }

  create(payload: {
    faultNumber: string;
    title: string;
    description: string;
    priority?: FaultPriority;
    customerId?: string;
    assignedToId?: string;
    category?: string;
    subCategory?: string;
  }): Observable<Fault> {
    return this.http.post<Fault>(this.base, payload);
  }

  update(
    id: string,
    payload: Partial<{
      title: string;
      description: string;
      priority: FaultPriority;
      customerId: string;
      category: string;
      subCategory: string;
    }>,
  ): Observable<Fault> {
    return this.http.patch<Fault>(`${this.base}/${id}`, payload);
  }

  updateStatus(
    id: string,
    status: FaultStatus,
    notes?: string,
  ): Observable<Fault> {
    return this.http.patch<Fault>(`${this.base}/${id}/status`, {
      status,
      notes,
    });
  }

  /** Pass `assignedToId: undefined` to return the fault to the queue. */
  assign(id: string, assignedToId?: string, notes?: string): Observable<Fault> {
    return this.http.post<Fault>(`${this.base}/${id}/assign`, {
      assignedToId,
      notes,
    });
  }

  /** Adds a staff note to the timeline without changing the status. */
  addNote(
    id: string,
    notes: string,
    isCustomerVisible: boolean,
  ): Observable<FaultTimelineEntry> {
    return this.http.post<FaultTimelineEntry>(`${this.base}/${id}/notes`, {
      notes,
      isCustomerVisible,
    });
  }

  /** Publishes or retracts a single timeline entry for the customer. */
  setTimelineVisibility(
    faultId: string,
    entryId: string,
    isCustomerVisible: boolean,
  ): Observable<FaultTimelineEntry> {
    return this.http.patch<FaultTimelineEntry>(
      `${this.base}/${faultId}/timeline/${entryId}/visibility`,
      { isCustomerVisible },
    );
  }

  escalate(id: string): Observable<Fault> {
    return this.http.post<Fault>(`${this.base}/${id}/escalate`, {});
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  attachments(faultId: string): Observable<FaultAttachment[]> {
    const params = new HttpParams()
      .set('entityType', 'FAULT')
      .set('entityId', faultId);
    return this.http.get<FaultAttachment[]>('/api/v1/files', { params });
  }

  uploadAttachment(
    faultId: string,
    file: File,
    isCustomerVisible: boolean,
  ): Observable<FaultAttachment> {
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', 'FAULT');
    form.append('entityId', faultId);
    form.append('isCustomerVisible', String(isCustomerVisible));
    return this.http.post<FaultAttachment>('/api/v1/files/upload', form);
  }

  // ── Lookups used by the fault dialogs ──────────────────────────────────────

  /**
   * Employees who can carry a fault assignment.
   *
   * `Fault.assignedToId` references a User, not an Employee — employees
   * without a login account (`userId === null`) cannot be assigned and are
   * filtered out here rather than producing a dangling assignment.
   */
  assignableUsers(): Observable<AssignableUser[]> {
    return this.http.get<EmployeeRow[]>('/api/v1/employees?take=100').pipe(
      map((rows) =>
        rows
          .filter((row): row is EmployeeRow & { userId: string } =>
            Boolean(row.userId),
          )
          .map((row) => ({
            userId: row.userId,
            firstName: row.firstName,
            lastName: row.lastName,
            employeeCode: row.employeeCode,
          })),
      ),
    );
  }

  customers(): Observable<
    { id: string; name?: string; companyName?: string }[]
  > {
    return this.http.get<{ id: string; name?: string; companyName?: string }[]>(
      '/api/v1/customers?take=200',
    );
  }

  // SLA policies (Settings)
  listSlaPolicies(): Observable<SlaPolicy[]> {
    return this.http.get<SlaPolicy[]>('/api/v1/sla-policies');
  }

  createSlaPolicy(payload: {
    priority: FaultPriority;
    resolveInHours: number;
    escalateToId?: string | null;
  }): Observable<SlaPolicy> {
    return this.http.post<SlaPolicy>('/api/v1/sla-policies', payload);
  }

  updateSlaPolicy(
    id: string,
    payload: Partial<{
      priority: FaultPriority;
      resolveInHours: number;
      escalateToId: string | null;
    }>,
  ): Observable<SlaPolicy> {
    return this.http.patch<SlaPolicy>(`/api/v1/sla-policies/${id}`, payload);
  }
}

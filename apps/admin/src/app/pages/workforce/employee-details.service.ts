import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';

interface Named {
  name: string;
}

export interface EmployeeDetail {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  primaryEmail?: string | null;
  primaryMobile?: string | null;
  employmentType?: string | null;
  employmentStatus?: string | null;
  joiningDate?: string | null;
  department?: Named | null;
  designation?: Named | null;
  branch?: Named | null;
  reportingManager?: { firstName: string; lastName: string } | null;
}

export interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
}

export interface LeaveBalanceRow {
  id: string;
  leaveTypeId: string;
  totalDays: number;
  usedDays: number;
  reservedDays: number;
  availableDays: number;
}

/** One card per leave type: its balance for the year, or none yet. */
export interface EntitlementView {
  type: LeaveTypeOption;
  balance: LeaveBalanceRow | null;
}

@Injectable()
export class EmployeeDetailsService {
  private readonly http = inject(HttpClient);
  readonly employee = signal<EmployeeDetail | null>(null);
  readonly types = signal<LeaveTypeOption[]>([]);
  readonly balances = signal<LeaveBalanceRow[]>([]);
  readonly year = signal(new Date().getFullYear());
  readonly loading = signal(false);
  readonly saving = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly entitlements = computed<EntitlementView[]>(() =>
    this.types().map((type) => ({
      type,
      balance: this.balances().find((b) => b.leaveTypeId === type.id) ?? null,
    })),
  );
  readonly totalAvailable = computed(() =>
    this.balances().reduce((sum, b) => sum + b.availableDays, 0),
  );

  load(id: string): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      employee: this.http.get<EmployeeDetail>(`/api/v1/employees/${id}`),
      types: this.http.get<LeaveTypeOption[]>('/api/v1/leaves/types'),
      balances: this.balancesFor(id),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ employee, types, balances }) => {
          this.employee.set(employee);
          this.types.set(types);
          this.balances.set(balances);
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(this.errorText(error)),
      });
  }

  changeYear(id: string, year: number): void {
    this.year.set(year);
    this.balancesFor(id).subscribe({
      next: (rows) => this.balances.set(rows),
      error: (error: HttpErrorResponse) =>
        this.error.set(this.errorText(error)),
    });
  }

  setEntitlement(id: string, leaveTypeId: string, totalDays: number): void {
    if (this.saving()) return;
    if (!Number.isFinite(totalDays) || totalDays < 0 || totalDays > 366) {
      this.error.set('Enter an entitlement between 0 and 366 days.');
      return;
    }
    this.saving.set(leaveTypeId);
    this.error.set('');
    this.message.set('');
    this.http
      .put<LeaveBalanceRow>(`/api/v1/leaves/balance/${id}`, {
        leaveTypeId,
        year: this.year(),
        totalDays,
      })
      .pipe(finalize(() => this.saving.set(null)))
      .subscribe({
        next: (saved) => {
          this.balances.update((rows) => [
            ...rows.filter((r) => r.leaveTypeId !== leaveTypeId),
            saved,
          ]);
          this.message.set('Entitlement saved.');
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(this.errorText(error)),
      });
  }

  private balancesFor(id: string) {
    return this.http.get<LeaveBalanceRow[]>(`/api/v1/leaves/balance/${id}`, {
      params: { year: this.year() },
    });
  }

  private errorText(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && message.length) return String(message[0]);
    return error.status === 0
      ? 'The server could not be reached.'
      : 'Something went wrong. Please try again.';
  }
}

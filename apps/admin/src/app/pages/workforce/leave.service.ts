import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

export interface LeaveRow {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  duration: string;
  requestedDays: number;
  reason: string | null;
  decisionReason: string | null;
  employee: { firstName: string; lastName: string; employeeCode: string };
  leaveType: { name: string };
}

@Injectable()
export class LeavePageService {
  private readonly http = inject(HttpClient);
  readonly rows = signal<LeaveRow[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly page = signal(0);
  readonly status = signal('PENDING');
  readonly canApprove = signal(false);
  readonly pageSize = 25;

  initialize(): void {
    this.http
      .get<{ canApprove: boolean }>('/api/v1/leaves/access')
      .subscribe({
        next: (access) => this.canApprove.set(access.canApprove),
        error: () => this.canApprove.set(false),
      });
    this.load();
  }

  load(page = this.page(), status = this.status()): void {
    if (this.loading()) return;
    this.page.set(page);
    this.status.set(status);
    this.error.set('');
    this.loading.set(true);
    this.http
      .get<LeaveRow[]>('/api/v1/leaves/pending', {
        params: { skip: page * this.pageSize, take: this.pageSize, status },
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.rows.set(rows),
        error: (error) => {
          this.rows.set([]);
          this.error.set(this.errorText(error));
        },
      });
  }

  decide(
    row: LeaveRow,
    action: 'approve' | 'reject' | 'cancel',
    reason: string,
  ): void {
    if (this.busy() || this.loading() || !this.canApprove()) return;
    if (action === 'cancel' && reason.trim().length < 3) {
      this.error.set('Enter a cancellation reason of at least 3 characters.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http
      .post<{ status: string; workflow?: { nextStageName?: string } }>(
        '/api/v1/leaves/' + row.id + '/' + action,
        { reason: reason.trim() || undefined },
      )
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.message.set(
            result.status === 'PENDING'
              ? 'Approval recorded. The request remains pending for the next workflow approval.'
              : 'Leave request ' + result.status.toLowerCase() + '.',
          );
          this.load();
        },
        error: (error) => this.error.set(this.errorText(error)),
      });
  }

  private errorText(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: unknown } | null;
      if (typeof body?.message === 'string') return body.message;
      if (Array.isArray(body?.message)) return body.message.join(', ');
    }
    return 'Could not complete the request. Check your connection and retry.';
  }
}

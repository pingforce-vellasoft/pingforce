import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  AssignableUser,
  FAULT_PRIORITIES,
  FaultPriority,
  FaultService,
  SlaPolicy,
} from '../../../core/services/fault.service';

class PolicyRow {
  readonly resolveInHoursControl: FormControl<number | null>;
  readonly escalateToIdControl: FormControl<string | null>;
  saving = false;

  constructor(
    readonly priority: FaultPriority,
    public id: string | undefined,
    resolveInHours: number | null,
    escalateToId: string | null,
  ) {
    this.resolveInHoursControl = new FormControl(resolveInHours, [
      Validators.required,
      Validators.min(1),
      Validators.max(8760),
    ]);
    this.escalateToIdControl = new FormControl(escalateToId);
  }

  get resolveInHours(): number | null {
    return this.resolveInHoursControl.value;
  }
  get escalateToId(): string | null {
    return this.escalateToIdControl.value;
  }
}

/**
 * SLA policy per priority: how long a fault has to be resolved and who it
 * escalates to when the deadline passes. One row per priority — the API keys
 * policies uniquely on (tenant, priority).
 */
@Component({
  selector: 'app-sla-policy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">SLA Policies</h1>
          <p class="page-subtitle">
            Resolution targets and escalation owners per fault priority
          </p>
        </div>
      </div>

      @if (loading()) {
        <div class="state">Loading…</div>
      } @else {
        <div class="table-card">
          <table class="policy-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Resolve within (hours)</th>
                <th>Escalate to</th>
                <th class="action-cell"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.priority) {
                <tr>
                  <td>
                    <span class="badge" [ngClass]="row.priority.toLowerCase()">
                      {{ row.priority }}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      class="input narrow"
                      min="1"
                      max="8760"
                      [formControl]="row.resolveInHoursControl"
                      placeholder="Not set"
                    />
                  </td>
                  <td>
                    <select
                      class="input"
                      [formControl]="row.escalateToIdControl"
                    >
                      <option [ngValue]="null">No escalation owner</option>
                      @for (user of users(); track user.userId) {
                        <option [ngValue]="user.userId">
                          {{ displayName(user) }}
                        </option>
                      }
                    </select>
                  </td>
                  <td class="action-cell">
                    <button
                      mat-flat-button
                      color="primary"
                      [disabled]="row.saving || !isValid(row)"
                      (click)="save(row)"
                    >
                      {{ row.saving ? 'Saving…' : 'Save' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="hint">
          <mat-icon inline>info</mat-icon>
          Faults raised without a matching policy get no SLA deadline and never
          auto-escalate.
        </p>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
      }
      .header-section {
        margin-bottom: 20px;
      }
      .page-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
      }
      .page-subtitle {
        color: #9ca3af;
        margin: 4px 0 0 0;
        font-size: 0.875rem;
      }
      .table-card {
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        overflow: hidden;
      }
      .policy-table {
        width: 100%;
        border-collapse: collapse;
      }
      .policy-table th {
        text-align: left;
        font-size: 0.75rem;
        color: #9ca3af;
        font-weight: 600;
        padding: 12px 16px;
        border-bottom: 1px solid #1f2937;
      }
      .policy-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #111827;
      }
      .action-cell {
        text-align: right;
        width: 120px;
      }
      .input {
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 8px 12px;
        color: #e5e7eb;
        font-size: 0.875rem;
        outline: none;
        font-family: inherit;
        min-width: 200px;
      }
      .input.narrow {
        min-width: 120px;
        width: 120px;
      }
      .state {
        padding: 40px;
        text-align: center;
        color: #757575;
      }
      .hint {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #9ca3af;
        font-size: 0.8125rem;
        margin-top: 16px;
      }
      .badge {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        background: #1f2937;
        color: #d1d5db;
      }
      .low {
        background: #e8f5e9;
        color: #388e3c;
      }
      .medium {
        background: #fff3e0;
        color: #f57c00;
      }
      .high {
        background: #ffebee;
        color: #d32f2f;
      }
      .critical {
        background: #d32f2f;
        color: #fff;
      }
    `,
  ],
})
export class SlaPolicyComponent implements OnInit {
  private readonly faultService = inject(FaultService);
  private readonly snackBar = inject(MatSnackBar);

  readonly rows = signal<PolicyRow[]>([]);
  readonly users = signal<AssignableUser[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.faultService.assignableUsers().subscribe({
      next: (list) => this.users.set(list),
      error: () => this.users.set([]),
    });

    this.faultService.listSlaPolicies().subscribe({
      next: (policies) => {
        this.rows.set(this.buildRows(policies));
        this.loading.set(false);
      },
      error: () => {
        this.rows.set(this.buildRows([]));
        this.loading.set(false);
        this.snackBar.open('Could not load SLA policies', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  /** One row per priority, whether or not a policy exists yet. */
  private buildRows(policies: SlaPolicy[]): PolicyRow[] {
    return FAULT_PRIORITIES.map((priority) => {
      const existing = policies.find((p) => p.priority === priority);
      return new PolicyRow(
        priority,
        existing?.id,
        existing?.resolveInHours ?? null,
        existing?.escalateToId ?? null,
      );
    });
  }

  isValid(row: PolicyRow): boolean {
    return (
      row.resolveInHours !== null &&
      Number.isInteger(row.resolveInHours) &&
      row.resolveInHours > 0 &&
      row.resolveInHours <= 8760
    );
  }

  displayName(user: AssignableUser): string {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.employeeCode || user.userId;
  }

  save(row: PolicyRow): void {
    if (!this.isValid(row)) return;

    row.saving = true;
    this.rows.update((rows) => [...rows]);

    const done = (saved: SlaPolicy) => {
      row.id = saved.id;
      row.saving = false;
      this.rows.update((rows) => [...rows]);
      this.snackBar.open(`${row.priority} SLA saved`, 'Close', {
        duration: 3000,
      });
    };

    const fail = (err: { error?: { message?: string } }) => {
      row.saving = false;
      this.rows.update((rows) => [...rows]);
      this.snackBar.open(
        err?.error?.message ?? 'Could not save the policy',
        'Close',
        { duration: 5000 },
      );
    };

    if (row.id) {
      this.faultService
        .updateSlaPolicy(row.id, {
          resolveInHours: row.resolveInHours as number,
          escalateToId: row.escalateToId,
        })
        .subscribe({ next: done, error: fail });
    } else {
      this.faultService
        .createSlaPolicy({
          priority: row.priority,
          resolveInHours: row.resolveInHours as number,
          escalateToId: row.escalateToId ?? undefined,
        })
        .subscribe({ next: done, error: fail });
    }
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LeavePageService, LeaveRow } from './leave.service';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  providers: [LeavePageService],
  template: `
    <h1>Leave requests</h1>
    <p>Review chargeable days and employee requests within your team scope.</p>
    <div class="toolbar">
      <mat-form-field>
        <mat-label>Status</mat-label>
        <mat-select
          [value]="page.status()"
          [disabled]="page.loading() || page.busy()"
          (selectionChange)="selected.set(null); page.load(0, $event.value)"
        >
          <mat-option value="PENDING">Pending</mat-option>
          <mat-option value="APPROVED">Approved</mat-option>
          <mat-option value="REJECTED">Rejected</mat-option>
          <mat-option value="CANCELLED">Cancelled / withdrawn</mat-option>
        </mat-select>
      </mat-form-field>
      <button
        mat-button
        [disabled]="page.loading() || page.busy()"
        (click)="page.load()"
      >
        Refresh
      </button>
    </div>
    @if (page.error()) {
      <p role="alert">{{ page.error() }}</p>
    }
    @if (page.message()) {
      <p role="status">{{ page.message() }}</p>
    }
    @if (page.loading()) {
      <p role="status">Loading requests…</p>
    }
    @for (row of page.rows(); track row.id) {
      <mat-card>
        <mat-card-header>
          <mat-card-title
            >{{ row.employee.firstName }}
            {{ row.employee.lastName }}</mat-card-title
          >
          <mat-card-subtitle
            >{{ row.employee.employeeCode }} · {{ row.leaveType.name }} ·
            {{ row.status }}</mat-card-subtitle
          >
        </mat-card-header>
        <mat-card-content>
          <p>
            {{ row.startDate | date: 'mediumDate' : 'UTC' }} –
            {{ row.endDate | date: 'mediumDate' : 'UTC' }}
          </p>
          <p>
            {{ row.requestedDays }} chargeable day(s) ·
            {{
              row.duration === 'FULL_DAY'
                ? 'Full day'
                : row.duration === 'FIRST_HALF'
                  ? 'First half'
                  : 'Second half'
            }}
          </p>
          <p>{{ row.reason || 'No reason provided' }}</p>
          @if (row.decisionReason) {
            <p>Decision: {{ row.decisionReason }}</p>
          }
        </mat-card-content>
        @if (
          page.canApprove() &&
          (row.status === 'PENDING' || row.status === 'APPROVED')
        ) {
          <mat-card-actions>
            <button
              mat-button
              [disabled]="page.busy() || page.loading()"
              (click)="review(row)"
            >
              Review request
            </button>
          </mat-card-actions>
        }
      </mat-card>
    } @empty {
      @if (!page.loading() && !page.error()) {
        <p>No requests with this status.</p>
      }
    }
    @if (selected(); as row) {
      <section class="review" aria-label="Review leave request">
        <h2>Review {{ row.employee.firstName }}'s request</h2>
        <p>
          {{ row.requestedDays }} day(s) will be
          {{
            row.status === 'APPROVED'
              ? 'returned to the available balance on cancellation'
              : 'converted from reserved to used on final approval, or returned on rejection'
          }}.
        </p>
        <mat-form-field>
          <mat-label>Decision reason (required for cancellation)</mat-label>
          <textarea matInput [formControl]="reason" maxlength="1000"></textarea>
        </mat-form-field>
        @if (row.status === 'PENDING') {
          <button
            mat-flat-button
            [disabled]="page.busy() || page.loading() || reason.invalid"
            (click)="
              page.decide(row, 'approve', reason.value); selected.set(null)
            "
          >
            Confirm approval
          </button>
          <button
            mat-button
            [disabled]="page.busy() || page.loading() || reason.invalid"
            (click)="
              page.decide(row, 'reject', reason.value); selected.set(null)
            "
          >
            Confirm rejection
          </button>
        } @else {
          <button
            mat-flat-button
            [disabled]="
              page.busy() ||
              page.loading() ||
              reason.invalid ||
              reason.value.trim().length < 3
            "
            (click)="
              page.decide(row, 'cancel', reason.value); selected.set(null)
            "
          >
            Cancel approved leave
          </button>
        }
        <button
          mat-button
          [disabled]="page.busy()"
          (click)="selected.set(null)"
        >
          Close
        </button>
      </section>
    }
    <nav aria-label="Leave pagination">
      <button
        mat-button
        [disabled]="page.page() === 0 || page.loading() || page.busy()"
        (click)="selected.set(null); page.load(page.page() - 1)"
      >
        Previous
      </button>
      <span>Page {{ page.page() + 1 }}</span>
      <button
        mat-button
        [disabled]="
          page.rows().length < page.pageSize || page.loading() || page.busy()
        "
        (click)="selected.set(null); page.load(page.page() + 1)"
      >
        Next
      </button>
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
        max-width: 1100px;
        margin: auto;
      }
      .toolbar,
      nav {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      mat-card {
        margin-bottom: 16px;
      }
      .review {
        padding: 24px;
        border: 1px solid currentColor;
        border-radius: 12px;
        margin: 24px 0;
      }
      mat-form-field {
        display: block;
      }
      [role='alert'] {
        color: var(--mat-sys-error, #b3261e);
      }
    `,
  ],
})
export class LeaveRequestsComponent implements OnInit {
  readonly page = inject(LeavePageService);
  readonly selected = signal<LeaveRow | null>(null);
  readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(1000)],
  });

  ngOnInit(): void {
    this.page.initialize();
  }
  review(row: LeaveRow): void {
    this.selected.set(row);
    this.reason.reset();
  }
}

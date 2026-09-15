import { Component, Inject, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  FAULT_TRANSITIONS,
  Fault,
  FaultService,
  FaultStatus,
} from '../../../core/services/fault.service';

/** Moves that must carry an explanation on the timeline. */
const NOTES_REQUIRED: readonly FaultStatus[] = [
  'ON_HOLD',
  'RESOLVED',
  'REOPENED',
  'CLOSED',
];

/**
 * Status change dialog. Only transitions the server-side state machine
 * accepts are offered, so an operator cannot be shown a move that will 409.
 */
@Component({
  selector: 'app-fault-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Change status — {{ data.fault.faultNumber }}</h2>

    <mat-dialog-content>
      <p class="current">
        Currently <strong>{{ label(data.fault.status) }}</strong>
      </p>

      @if (allowed().length === 0) {
        <p class="error">
          This fault is closed and cannot move to another status.
        </p>
      } @else {
        <label class="field-label">New status</label>
        <select class="input" [formControl]="statusControl">
          @for (option of allowed(); track option) {
            <option [ngValue]="option">{{ label(option) }}</option>
          }
        </select>

        <label class="field-label">
          Note {{ notesRequired() ? '(required)' : '(optional)' }}
        </label>
        <textarea
          class="input"
          rows="3"
          [formControl]="notesControl"
          maxlength="2000"
          [placeholder]="notesPlaceholder()"
        ></textarea>

        @if (statusSignal() === 'ON_HOLD') {
          <p class="hint">
            <mat-icon inline>pause</mat-icon>
            The SLA clock pauses while the fault is on hold and resumes with the
            deadline pushed out by the same span.
          </p>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="saving() || !canSave()"
        (click)="save()"
      >
        {{ saving() ? 'Saving…' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .current {
        color: #9ca3af;
        font-size: 0.875rem;
        margin: 0 0 8px;
      }
      .field-label {
        display: block;
        font-size: 0.8125rem;
        color: #9ca3af;
        margin: 12px 0 6px;
      }
      .input {
        width: 100%;
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 9px 12px;
        color: #e5e7eb;
        font-size: 0.875rem;
        outline: none;
        font-family: inherit;
      }
      .hint {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        color: #94a3b8;
        font-size: 0.8125rem;
        margin-top: 12px;
      }
      .error {
        color: #ef4444;
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class FaultStatusDialogComponent {
  private readonly faultService = inject(FaultService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<FaultStatusDialogComponent>);

  readonly saving = signal(false);
  readonly statusControl = new FormControl<FaultStatus | null>(null);
  readonly notesControl = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(2000),
  });
  readonly statusSignal = toSignal(this.statusControl.valueChanges, {
    initialValue: null,
  });
  readonly notesSignal = toSignal(this.notesControl.valueChanges, {
    initialValue: '',
  });

  readonly allowed = computed<FaultStatus[]>(() =>
    // Reassignment (X → ASSIGNED) belongs to the assign dialog, not here.
    (FAULT_TRANSITIONS[this.data.fault.status] ?? []).filter(
      (s) =>
        s !== 'OPEN' &&
        s !== this.data.fault.status &&
        !(
          (s === 'ASSIGNED' || s === 'IN_PROGRESS') &&
          !this.data.fault.assignedToId
        ),
    ),
  );

  readonly notesRequired = computed(() => {
    const next = this.statusSignal();
    return next ? NOTES_REQUIRED.includes(next) : false;
  });

  readonly canSave = computed(() => {
    if (!this.statusSignal()) return false;
    return (
      this.notesSignal().length <= 2000 &&
      (!this.notesRequired() || this.notesSignal().trim().length > 0)
    );
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { fault: Fault }) {
    this.statusControl.setValue(this.allowed()[0] ?? null);
  }

  label(status: string): string {
    return status.replace(/_/g, ' ');
  }

  notesPlaceholder(): string {
    switch (this.statusSignal()) {
      case 'ON_HOLD':
        return 'What is the fault waiting on?';
      case 'RESOLVED':
        return 'What was the resolution?';
      case 'CLOSED':
        return 'Closing summary…';
      case 'REOPENED':
        return 'Why is this fault being reopened?';
      default:
        return 'Context for the timeline…';
    }
  }

  save(): void {
    const next = this.statusSignal();
    if (!next || !this.canSave()) return;

    this.saving.set(true);
    this.faultService
      .updateStatus(
        this.data.fault.id,
        next,
        this.notesControl.value.trim() || undefined,
      )
      .subscribe({
        next: () => {
          this.snackBar.open(
            `${this.data.fault.faultNumber} → ${this.label(next)}`,
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err?.error?.message ?? 'Status update failed',
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}

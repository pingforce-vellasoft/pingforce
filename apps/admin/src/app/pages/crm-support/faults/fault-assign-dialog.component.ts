import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  AssignableUser,
  Fault,
  FaultService,
} from '../../../core/services/fault.service';

/**
 * Assign or unassign a fault. Assigning an OPEN fault moves it to ASSIGNED
 * server-side; faults already in progress keep their status so work is not
 * reset by a reassignment.
 */
@Component({
  selector: 'app-fault-assign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Assign {{ data.fault.faultNumber }}</h2>

    <mat-dialog-content>
      <label class="field-label">Assignee</label>
      <select class="input" [formControl]="assignedToIdControl">
        @if (data.fault.status === 'OPEN' || data.fault.status === 'ASSIGNED') {
          <option [ngValue]="null">Unassigned (return to queue)</option>
        }
        @for (user of users(); track user.userId) {
          <option [ngValue]="user.userId">{{ displayName(user) }}</option>
        }
      </select>

      <label class="field-label">Note (optional)</label>
      <textarea
        class="input"
        rows="3"
        [formControl]="notesControl"
        maxlength="2000"
        placeholder="Why this technician, context for the handover…"
      ></textarea>

      @if (loadFailed()) {
        <p class="error">Could not load the employee list. Close and retry.</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="saving() || notesControl.invalid"
        (click)="save()"
      >
        {{ saving() ? 'Saving…' : 'Assign' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
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
      .error {
        color: #ef4444;
        font-size: 0.8125rem;
        margin-top: 12px;
      }
    `,
  ],
})
export class FaultAssignDialogComponent implements OnInit {
  private readonly faultService = inject(FaultService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<FaultAssignDialogComponent>);

  readonly users = signal<AssignableUser[]>([]);
  readonly saving = signal(false);
  readonly loadFailed = signal(false);

  readonly assignedToIdControl = new FormControl<string | null>(null);
  readonly notesControl = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(2000),
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { fault: Fault }) {
    this.assignedToIdControl.setValue(data.fault.assignedToId ?? null);
  }

  ngOnInit(): void {
    this.faultService.assignableUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.loadFailed.set(true),
    });
  }

  displayName(user: AssignableUser): string {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.employeeCode || user.userId;
  }

  save(): void {
    if (this.notesControl.invalid) return;
    const assignedToId = this.assignedToIdControl.value;
    this.saving.set(true);
    this.faultService
      .assign(
        this.data.fault.id,
        assignedToId ?? undefined,
        this.notesControl.value.trim() || undefined,
      )
      .subscribe({
        next: () => {
          this.snackBar.open(
            assignedToId
              ? `${this.data.fault.faultNumber} assigned`
              : `${this.data.fault.faultNumber} returned to the queue`,
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err?.error?.message ?? 'Assignment failed',
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

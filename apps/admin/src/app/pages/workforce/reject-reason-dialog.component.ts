import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Captures the mandatory rejection reason for a device change request. The
 * employee is shown this text, and it is the audit record of why a replacement
 * was refused — so the confirm button stays disabled until it is written.
 */
@Component({
  selector: 'app-reject-reason-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Reject device change</h2>
    <mat-dialog-content>
      <p>The employee sees this reason, so make it actionable.</p>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Reason for rejection</mat-label>
        <textarea
          matInput
          rows="3"
          maxlength="500"
          [ngModel]="reason()"
          (ngModelChange)="reason.set($event)"
          placeholder="e.g. Please hand the damaged handset to IT first"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="warn"
        [disabled]="reason().trim().length < 3"
        [mat-dialog-close]="reason().trim()"
      >
        Reject request
      </button>
    </mat-dialog-actions>
  `,
})
export class RejectReasonDialogComponent {
  readonly reason = signal('');

  constructor(readonly dialogRef: MatDialogRef<RejectReasonDialogComponent>) {}
}

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface AdjustDialogData {
  sessionId: string;
  employeeName: string;
  punchIn: string | null;
  punchOut: string | null;
}

/**
 * Corrects the punch times on one session. Writes a pre-approved
 * AttendanceCorrection server-side, so the original values stay auditable.
 */
@Component({
  selector: 'app-attendance-adjust-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, MatIconModule],
  template: `
    <div class="premium-dialog">
      <div class="glow-effect glow-purple"></div>
      <div class="glow-effect glow-blue"></div>

      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-container">
            <mat-icon class="header-icon">edit_calendar</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">Adjust Punch Times</h2>
            <p class="dialog-subtitle">
              Correcting session for
              <span class="highlight">{{ data.employeeName }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="dialog-content">
        <div class="notice">
          <mat-icon>info</mat-icon>
          <span>
            The original times are retained and this change is recorded against
            your account.
          </span>
        </div>

        <div class="input-group">
          <label>Check-in</label>
          <input type="datetime-local" [(ngModel)]="punchIn" [max]="now" />
        </div>

        <div class="input-group">
          <label>Check-out</label>
          <input type="datetime-local" [(ngModel)]="punchOut" [max]="now" />
          <p class="hint" *ngIf="!data.punchOut">
            This session has no check-out recorded.
          </p>
        </div>

        <div class="input-group">
          <label>Reason</label>
          <textarea
            [(ngModel)]="reason"
            rows="3"
            placeholder="e.g. Employee confirmed they left at 18:30; device battery died."
            required
          ></textarea>
        </div>

        <p class="error" *ngIf="validationError">{{ validationError }}</p>
      </div>

      <div class="dialog-actions">
        <button mat-dialog-close class="btn-cancel">Cancel</button>
        <button
          (click)="onSubmit()"
          [disabled]="!reason || (!punchIn && !punchOut)"
          class="btn-confirm"
        >
          <span>Save Correction</span>
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 24px !important;
        padding: 0 !important;
      }
      .premium-dialog {
        position: relative;
        overflow: hidden;
        background-color: #131620;
        color: #e5e7eb;
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow:
          0 25px 50px -12px rgba(0, 0, 0, 0.5),
          0 0 40px rgba(168, 85, 247, 0.1);
        border-radius: 24px;
        font-family: 'Inter', system-ui, sans-serif;
        min-width: 420px;
      }
      .glow-effect {
        position: absolute;
        width: 192px;
        height: 192px;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.2;
        pointer-events: none;
      }
      .glow-purple {
        top: -96px;
        right: -96px;
        background-color: #9333ea;
      }
      .glow-blue {
        bottom: -96px;
        left: -96px;
        background-color: #2563eb;
      }
      .dialog-header {
        position: relative;
        z-index: 10;
        padding: 32px 32px 16px 32px;
      }
      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .icon-container {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: linear-gradient(
          135deg,
          rgba(168, 85, 247, 0.2),
          rgba(59, 130, 246, 0.2)
        );
        border: 1px solid rgba(168, 85, 247, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .header-icon {
        color: #c084fc;
      }
      .dialog-title {
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(to right, #ffffff, #9ca3af);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1.2;
      }
      .dialog-subtitle {
        font-size: 0.875rem;
        color: #9ca3af;
        margin-top: 4px;
        margin-bottom: 0;
      }
      .highlight {
        color: #ffffff;
        font-weight: 500;
      }
      .dialog-content {
        position: relative;
        z-index: 10;
        padding: 16px 32px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .notice {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 12px;
        padding: 12px;
        font-size: 0.8125rem;
        color: #93c5fd;
      }
      .notice mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .input-group label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
      }
      input[type='datetime-local'],
      textarea {
        width: 100%;
        background-color: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 0.875rem;
        color: #e5e7eb;
        outline: none;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      textarea {
        resize: none;
      }
      input[type='datetime-local']:focus,
      textarea:focus {
        border-color: rgba(168, 85, 247, 0.5);
        box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.5);
      }
      .hint {
        font-size: 0.75rem;
        color: #6b7280;
        margin: 6px 0 0 0;
      }
      .error {
        font-size: 0.8125rem;
        color: #f87171;
        margin: 0;
      }
      .dialog-actions {
        position: relative;
        z-index: 10;
        padding: 16px 32px 32px 32px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .btn-cancel {
        background: transparent;
        border: none;
        padding: 10px 24px;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #9ca3af;
        cursor: pointer;
      }
      .btn-cancel:hover {
        color: #ffffff;
        background-color: rgba(255, 255, 255, 0.05);
      }
      .btn-confirm {
        background: linear-gradient(to right, #9333ea, #2563eb);
        border: none;
        padding: 10px 24px;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s;
      }
      .btn-confirm mat-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
        line-height: 16px;
      }
      .btn-confirm:hover:not(:disabled) {
        transform: scale(1.05);
      }
      .btn-confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      input[type='datetime-local']::-webkit-calendar-picker-indicator {
        filter: invert(1) opacity(0.5);
        cursor: pointer;
      }
    `,
  ],
})
export class AttendanceAdjustDialogComponent {
  now = new Date().toISOString().slice(0, 16);
  punchIn = '';
  punchOut = '';
  reason = '';
  validationError = '';

  constructor(
    public dialogRef: MatDialogRef<AttendanceAdjustDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AdjustDialogData,
  ) {
    this.punchIn = this.toLocalInput(data.punchIn);
    this.punchOut = this.toLocalInput(data.punchOut);
  }

  /** ISO (UTC) → the local value a datetime-local input expects. */
  private toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  }

  onSubmit() {
    this.validationError = '';

    if (this.punchIn && this.punchOut) {
      if (new Date(this.punchOut) <= new Date(this.punchIn)) {
        this.validationError = 'Check-out must be after check-in.';
        return;
      }
    }

    this.dialogRef.close({
      sessionId: this.data.sessionId,
      punchIn: this.punchIn ? new Date(this.punchIn).toISOString() : undefined,
      punchOut: this.punchOut
        ? new Date(this.punchOut).toISOString()
        : undefined,
      reason: this.reason,
    });
  }
}

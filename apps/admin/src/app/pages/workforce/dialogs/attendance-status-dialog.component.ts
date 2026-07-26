import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface StatusDialogData {
  attendanceId: string;
  employeeName: string;
  date: string;
  currentStatus: string;
}

/**
 * Sets the day-level attendance status regardless of recorded punches —
 * off-site work, approved absence, a day that should read ON_LEAVE. Writes a
 * pre-approved WRONG_ATTENDANCE_STATUS correction for audit.
 */
@Component({
  selector: 'app-attendance-status-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, MatIconModule],
  template: `
    <div class="premium-dialog">
      <div class="glow-effect glow-purple"></div>
      <div class="glow-effect glow-blue"></div>

      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-container">
            <mat-icon class="header-icon">fact_check</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">Override Day Status</h2>
            <p class="dialog-subtitle">
              <span class="highlight">{{ data.employeeName }}</span> ·
              {{ data.date | date: 'mediumDate' }}
            </p>
          </div>
        </div>
      </div>

      <div class="dialog-content">
        <div class="current">
          Currently marked
          <strong>{{ data.currentStatus || 'unset' }}</strong>
        </div>

        <div class="input-group">
          <label>New status</label>
          <div class="status-grid">
            <button
              *ngFor="let s of statuses"
              type="button"
              class="status-chip"
              [class.selected]="status === s.value"
              (click)="status = s.value"
            >
              <mat-icon>{{ s.icon }}</mat-icon>
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label>Reason</label>
          <textarea
            [(ngModel)]="reason"
            rows="3"
            placeholder="e.g. Worked from the client site; approved by regional manager."
            required
          ></textarea>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-dialog-close class="btn-cancel">Cancel</button>
        <button
          (click)="onSubmit()"
          [disabled]="!status || !reason || status === data.currentStatus"
          class="btn-confirm"
        >
          <span>Apply Override</span>
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
        min-width: 440px;
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
      .current {
        font-size: 0.8125rem;
        color: #9ca3af;
      }
      .current strong {
        color: #e5e7eb;
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
      .status-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .status-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 8px;
        background-color: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        color: #9ca3af;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .status-chip mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .status-chip:hover {
        border-color: rgba(168, 85, 247, 0.4);
        color: #e5e7eb;
      }
      .status-chip.selected {
        border-color: rgba(168, 85, 247, 0.7);
        background: rgba(168, 85, 247, 0.12);
        color: #ffffff;
      }
      textarea {
        width: 100%;
        background-color: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 0.875rem;
        color: #e5e7eb;
        outline: none;
        resize: none;
        box-sizing: border-box;
      }
      textarea:focus {
        border-color: rgba(168, 85, 247, 0.5);
        box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.5);
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
    `,
  ],
})
export class AttendanceStatusDialogComponent {
  readonly statuses = [
    { value: 'PRESENT', label: 'Present', icon: 'check_circle' },
    { value: 'ABSENT', label: 'Absent', icon: 'cancel' },
    { value: 'LATE', label: 'Late', icon: 'schedule' },
    { value: 'HALF_DAY', label: 'Half Day', icon: 'timelapse' },
    { value: 'ON_LEAVE', label: 'On Leave', icon: 'beach_access' },
  ];

  status = '';
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<AttendanceStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StatusDialogData,
  ) {
    this.status = data.currentStatus;
  }

  onSubmit() {
    if (!this.status || !this.reason) return;
    this.dialogRef.close({
      attendanceId: this.data.attendanceId,
      status: this.status,
      reason: this.reason,
    });
  }
}

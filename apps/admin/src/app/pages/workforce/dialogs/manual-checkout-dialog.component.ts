import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manual-checkout-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, MatIconModule],
  template: `
    <div class="premium-dialog">
      <!-- Glow effects -->
      <div class="glow-effect glow-purple"></div>
      <div class="glow-effect glow-blue"></div>

      <!-- Header -->
      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-container">
            <mat-icon class="header-icon">history_toggle_off</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">Manual Checkout</h2>
            <p class="dialog-subtitle">Force end session for <span class="highlight">{{data.employeeName}}</span></p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <div class="input-group">
          <label>Checkout Date & Time</label>
          <input 
            type="datetime-local" 
            [(ngModel)]="checkoutTime" 
            [max]="currentDate"
            required>
        </div>

        <div class="input-group">
          <label>Reason for Override</label>
          <textarea 
            [(ngModel)]="reason" 
            rows="3" 
            placeholder="e.g. Employee forgot to punch out due to late night task."
            required></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button mat-dialog-close class="btn-cancel">Cancel</button>
        <button (click)="onSubmit()" [disabled]="!checkoutTime || !reason" class="btn-confirm">
          <span>Confirm Checkout</span>
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
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
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.1);
      border-radius: 24px;
      font-family: 'Inter', system-ui, sans-serif;
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
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2));
      border: 1px solid rgba(168, 85, 247, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.2);
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
    .input-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    input[type="datetime-local"], textarea {
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
    input[type="datetime-local"]:focus, textarea:focus {
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
      font-weight: 500;
      color: #9ca3af;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel:hover {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.05);
    }
    .btn-confirm {
      position: relative;
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
      overflow: hidden;
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
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
    }
    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Custom scrollbar for textarea */
    textarea::-webkit-scrollbar {
      width: 6px;
    }
    textarea::-webkit-scrollbar-track {
      background: transparent;
    }
    textarea::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    textarea::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Calendar picker icon color override for dark mode */
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
      filter: invert(1) opacity(0.5);
      cursor: pointer;
    }
    input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
      filter: invert(1) opacity(0.8);
    }
  `]
})
export class ManualCheckoutDialogComponent {
  currentDate = new Date().toISOString().slice(0, 16);
  checkoutTime = this.currentDate;
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<ManualCheckoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { attendanceSessionId: string; employeeName: string }
  ) {}

  onSubmit() {
    if (this.checkoutTime && this.reason) {
      const isoString = new Date(this.checkoutTime).toISOString();
      this.dialogRef.close({
        checkoutTime: isoString,
        reason: this.reason
      });
    }
  }
}

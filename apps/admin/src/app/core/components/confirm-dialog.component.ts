import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

export interface ConfirmDialogData {
  title: string;
  message: string;
  /** Highlighted subject (role name, employee name…) rendered in <strong>. */
  emphasis?: string;
  /** Text rendered after the emphasis, completing the sentence. */
  messageSuffix?: string;
  /** Secondary line, e.g. "This action cannot be undone." */
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'primary' | 'warn' | 'accent';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NgClass],
  template: `
    <div class="dialog-container">
      <div class="dialog-header" [ngClass]="data.color || 'warn'">
        <div class="icon-circle">
          <mat-icon>{{ data.icon || 'warning' }}</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      <mat-dialog-content>
        <!--
          Interpolation, never [innerHTML]: callers embed user-editable values
          (role names, employee names) in the message, so binding it as HTML
          made this dialog a stored-XSS sink. The emphasis and messageSuffix
          fields keep the bold styling without one.
        -->
        <p class="dialog-message">
          <span>{{ data.message }}</span>
          @if (data.emphasis) {
            <strong>{{ data.emphasis }}</strong>
          }
          @if (data.messageSuffix) {
            <span>{{ data.messageSuffix }}</span>
          }
        </p>
        @if (data.subMessage) {
          <p class="dialog-sub-message">{{ data.subMessage }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close class="cancel-btn">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button
          mat-flat-button
          [color]="data.color || 'warn'"
          [mat-dialog-close]="true"
          class="confirm-btn"
        >
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 0;
        background: var(--bg-surface);
        color: var(--text-primary);
        overflow: hidden;
      }

      .dialog-header {
        padding: 32px 32px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
      }

      .icon-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
      }

      .dialog-header.warn .icon-circle {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      .dialog-header.primary .icon-circle {
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
      }

      .icon-circle mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      h2[mat-dialog-title] {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        line-height: 1.2;
        color: var(--text-primary);
      }

      mat-dialog-content {
        padding: 0 32px 24px !important;
        text-align: center;
        margin: 0;
        max-height: none;
      }

      .dialog-message {
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-secondary);
        margin: 0;
      }

      .dialog-actions {
        padding: 16px 32px 32px !important;
        margin-bottom: 0;
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .cancel-btn,
      .confirm-btn {
        min-width: 120px;
        height: 44px;
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: 14px;
        letter-spacing: 0.3px !important;
      }

      .cancel-btn {
        color: var(--text-secondary) !important;
        background: rgba(255, 255, 255, 0.05);
      }

      .cancel-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary) !important;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}
}

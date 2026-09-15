import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  Fault,
  FaultAttachment,
  FaultService,
  FaultTimelineEntry,
} from '../../../core/services/fault.service';
import { FaultAssignDialogComponent } from './fault-assign-dialog.component';
import { FaultStatusDialogComponent } from './fault-status-dialog.component';

/**
 * Single-fault workspace: SLA header, lifecycle timeline with per-entry
 * customer visibility, attachments and the linked visit/customer context.
 */
@Component({
  selector: 'app-fault-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container">
      <button class="back" (click)="back()">
        <mat-icon inline>arrow_back</mat-icon> Back to faults
      </button>

      @if (loading()) {
        <div class="state">Loading…</div>
      } @else if (!fault()) {
        <div class="state">
          <mat-icon>error_outline</mat-icon>
          <p>This fault could not be loaded.</p>
        </div>
      } @else {
        <div class="header-card">
          <div class="header-main">
            <div class="title-row">
              <span class="mono number">{{ fault()!.faultNumber }}</span>
              <span class="badge" [ngClass]="fault()!.status.toLowerCase()">
                {{ label(fault()!.status) }}
              </span>
              <span class="badge" [ngClass]="fault()!.priority.toLowerCase()">
                {{ fault()!.priority }}
              </span>
              @if (fault()!.isEscalated) {
                <span class="badge escalated">
                  <mat-icon inline>trending_up</mat-icon>
                  Escalated L{{ fault()!.escalationLevel }}
                </span>
              }
              @if (fault()!.reopenCount > 0) {
                <span class="badge reopened">
                  Reopened ×{{ fault()!.reopenCount }}
                </span>
              }
            </div>
            <h1 class="page-title">{{ fault()!.title }}</h1>
            <p class="meta">
              {{ fault()!.channel }} · raised
              {{ fault()!.createdAt | date: 'medium' }}
              @if (fault()!.category) {
                · {{ fault()!.category }}
                @if (fault()!.subCategory) {
                  / {{ fault()!.subCategory }}
                }
              }
            </p>
          </div>

          <div class="header-side">
            <div
              class="sla-tile"
              [class.breached]="isBreached()"
              [class.due-soon]="!isBreached() && isDueSoon()"
            >
              <span class="sla-label">SLA</span>
              <span class="sla-value">{{ slaLabel() }}</span>
              @if (fault()!.slaDeadline) {
                <span class="sla-sub">
                  due {{ fault()!.slaDeadline | date: 'short' }}
                </span>
              }
              @if (fault()!.slaPausedMinutes > 0) {
                <span class="sla-sub">
                  {{ fault()!.slaPausedMinutes }}m paused
                </span>
              }
            </div>

            <div class="actions">
              <button
                mat-stroked-button
                (click)="openAssign()"
                [disabled]="
                  fault()!.status === 'CLOSED' || fault()!.status === 'RESOLVED'
                "
              >
                <mat-icon>person_add</mat-icon> Assign
              </button>
              <button
                mat-flat-button
                color="primary"
                (click)="openStatus()"
                [disabled]="fault()!.status === 'CLOSED'"
              >
                <mat-icon>swap_horiz</mat-icon> Status
              </button>
              <button
                mat-stroked-button
                color="warn"
                (click)="escalate()"
                [disabled]="
                  fault()!.status === 'CLOSED' || fault()!.status === 'RESOLVED'
                "
              >
                <mat-icon>priority_high</mat-icon> Escalate
              </button>
            </div>
          </div>
        </div>

        <mat-tab-group class="tabs">
          <mat-tab label="Timeline">
            <div class="tab-body">
              <div class="note-composer">
                <textarea
                  class="note-input"
                  rows="2"
                  [formControl]="noteTextControl"
                  maxlength="2000"
                  placeholder="Add a note to this fault…"
                ></textarea>
                <div class="note-actions">
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      [formControl]="noteCustomerVisibleControl"
                    />
                    Visible to customer
                  </label>
                  <button
                    mat-flat-button
                    color="primary"
                    [disabled]="
                      savingNote() ||
                      noteTextControl.invalid ||
                      !noteTextControl.value.trim()
                    "
                    (click)="addNote()"
                  >
                    {{ savingNote() ? 'Saving…' : 'Add note' }}
                  </button>
                </div>
              </div>

              @if (timeline().length === 0) {
                <div class="state">No timeline entries yet.</div>
              }
              @for (entry of timeline(); track entry.id) {
                <div class="timeline-entry">
                  <div class="entry-marker"></div>
                  <div class="entry-body">
                    <div class="entry-head">
                      <span
                        class="badge"
                        [ngClass]="entry.status.toLowerCase()"
                      >
                        {{ label(entry.status) }}
                      </span>
                      <span class="entry-time">
                        {{ entry.createdAt | date: 'medium' }}
                      </span>
                      @if (entry.isCustomerVisible) {
                        <button
                          class="badge customer-visible toggle"
                          matTooltip="Visible to the customer — click to make internal"
                          [disabled]="savingNote()"
                          (click)="toggleVisibility(entry)"
                        >
                          <mat-icon inline>visibility</mat-icon> Customer
                        </button>
                      } @else {
                        <button
                          class="badge internal toggle"
                          matTooltip="Internal only — click to share with the customer"
                          [disabled]="savingNote()"
                          (click)="toggleVisibility(entry)"
                        >
                          <mat-icon inline>lock</mat-icon> Internal
                        </button>
                      }
                    </div>
                    @if (entry.notes) {
                      <p class="entry-notes">{{ entry.notes }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab [label]="'Attachments (' + attachments().length + ')'">
            <div class="tab-body">
              <div class="upload-row">
                <input
                  type="file"
                  #fileInput
                  class="file-input"
                  (change)="onFileSelected($event)"
                />
                <label class="checkbox">
                  <input
                    type="checkbox"
                    [formControl]="uploadCustomerVisibleControl"
                  />
                  Visible to customer
                </label>
                @if (uploading()) {
                  <span class="uploading">Uploading…</span>
                }
              </div>

              @if (attachments().length === 0) {
                <div class="state">No attachments.</div>
              }
              @for (file of attachments(); track file.id) {
                <div class="attachment">
                  <mat-icon>{{ fileIcon(file) }}</mat-icon>
                  <div class="attachment-body">
                    <a [href]="file.fileUrl" target="_blank" rel="noopener">
                      {{ file.fileName }}
                    </a>
                    <span class="attachment-meta">
                      {{ fileSize(file.fileSize) }} ·
                      {{ file.createdAt | date: 'short' }}
                    </span>
                  </div>
                  @if (file.isCustomerVisible) {
                    <span class="badge customer-visible">Customer</span>
                  } @else {
                    <span class="badge internal">Internal</span>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Details">
            <div class="tab-body">
              <dl class="details">
                <dt>Description</dt>
                <dd class="pre">{{ fault()!.description }}</dd>

                <dt>Customer</dt>
                <dd>{{ customerName() }}</dd>

                <dt>Assignee</dt>
                <dd>{{ assigneeName() }}</dd>

                <dt>Linked visit</dt>
                <dd>
                  @if (fault()!.visitId) {
                    <a class="link" (click)="openVisit()">
                      {{ fault()!.visitId }}
                    </a>
                  } @else {
                    <span class="muted">No visit dispatched</span>
                  }
                </dd>

                <dt>Connection</dt>
                <dd>
                  @if (fault()!.connectionId) {
                    <span class="mono">{{ fault()!.connectionId }}</span>
                  } @else {
                    <span class="muted">Not linked</span>
                  }
                </dd>

                <dt>Resolved</dt>
                <dd>
                  {{
                    fault()!.resolvedAt
                      ? (fault()!.resolvedAt | date: 'medium')
                      : '—'
                  }}
                </dd>

                <dt>Closed</dt>
                <dd>
                  {{
                    fault()!.closedAt
                      ? (fault()!.closedAt | date: 'medium')
                      : '—'
                  }}
                </dd>

                <dt>Customer rating</dt>
                <dd>
                  @if (fault()!.customerRating) {
                    {{ fault()!.customerRating }}/5
                    @if (fault()!.customerRatingComment) {
                      — {{ fault()!.customerRatingComment }}
                    }
                  } @else {
                    <span class="muted">Not rated</span>
                  }
                </dd>
              </dl>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
      }
      .back {
        background: transparent;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .header-card {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 20px;
      }
      .header-main {
        min-width: 0;
        flex: 1;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .number {
        color: #9ca3af;
        font-size: 0.875rem;
      }
      .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
      }
      .meta {
        color: #9ca3af;
        font-size: 0.8125rem;
        margin: 6px 0 0;
      }
      .header-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }
      .sla-tile {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 10px 14px;
        min-width: 160px;
      }
      .sla-tile.due-soon {
        border-color: #f59e0b;
      }
      .sla-tile.breached {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.08);
      }
      .sla-label {
        font-size: 0.6875rem;
        color: #6b7280;
        letter-spacing: 0.08em;
      }
      .sla-value {
        font-size: 1.125rem;
        font-weight: 700;
      }
      .sla-sub {
        font-size: 0.6875rem;
        color: #9ca3af;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .tabs {
        margin-top: 20px;
      }
      .tab-body {
        padding: 20px 4px;
      }
      .timeline-entry {
        display: flex;
        gap: 12px;
        padding-bottom: 18px;
      }
      .entry-marker {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #3b82f6;
        margin-top: 5px;
        flex-shrink: 0;
      }
      .entry-body {
        min-width: 0;
        flex: 1;
      }
      .entry-head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .entry-time {
        font-size: 0.75rem;
        color: #6b7280;
      }
      .entry-notes {
        margin: 6px 0 0;
        font-size: 0.875rem;
        white-space: pre-wrap;
      }
      .note-composer {
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 20px;
      }
      .note-input {
        width: 100%;
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 8px;
        padding: 8px 10px;
        color: #e5e7eb;
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
      }
      .note-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .toggle {
        border: none;
        cursor: pointer;
        font-family: inherit;
      }
      .toggle:disabled {
        cursor: default;
        opacity: 0.6;
      }
      .upload-row {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding-bottom: 16px;
        border-bottom: 1px solid #1f2937;
        margin-bottom: 16px;
      }
      .file-input {
        color: #9ca3af;
        font-size: 0.8125rem;
      }
      .checkbox {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8125rem;
        color: #9ca3af;
      }
      .uploading {
        font-size: 0.8125rem;
        color: #9ca3af;
      }
      .attachment {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid #111827;
      }
      .attachment-body {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .attachment-body a {
        color: #60a5fa;
        text-decoration: none;
      }
      .attachment-meta {
        font-size: 0.75rem;
        color: #6b7280;
      }
      .details {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 10px 20px;
        margin: 0;
      }
      .details dt {
        color: #9ca3af;
        font-size: 0.8125rem;
      }
      .details dd {
        margin: 0;
        font-size: 0.875rem;
      }
      .pre {
        white-space: pre-wrap;
      }
      .link {
        color: #60a5fa;
        cursor: pointer;
      }
      .muted {
        color: #6b7280;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .state {
        padding: 32px;
        text-align: center;
        color: #757575;
      }
      .badge {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        background: #1f2937;
        color: #d1d5db;
        display: inline-flex;
        align-items: center;
        gap: 4px;
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
      .open {
        background: #e3f2fd;
        color: #1976d2;
      }
      .assigned {
        background: #ede7f6;
        color: #5e35b1;
      }
      .in_progress {
        background: #fff3e0;
        color: #f57c00;
      }
      .on_hold {
        background: #eceff1;
        color: #546e7a;
      }
      .resolved {
        background: #e8f5e9;
        color: #388e3c;
      }
      .reopened {
        background: #fce4ec;
        color: #c2185b;
      }
      .closed {
        background: #e0e0e0;
        color: #616161;
      }
      .escalated {
        background: #7c2d12;
        color: #fed7aa;
      }
      .customer-visible {
        background: #064e3b;
        color: #6ee7b7;
      }
      .internal {
        background: #1f2937;
        color: #9ca3af;
      }
    `,
  ],
})
export class FaultDetailComponent implements OnInit {
  private readonly faultService = inject(FaultService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly fault = signal<Fault | null>(null);
  readonly attachments = signal<FaultAttachment[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly savingNote = signal(false);

  readonly uploadCustomerVisibleControl = new FormControl(false, {
    nonNullable: true,
  });
  readonly noteTextControl = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(2000),
  });
  readonly noteCustomerVisibleControl = new FormControl(false, {
    nonNullable: true,
  });

  private faultId = '';

  readonly timeline = computed(() => this.fault()?.faultTimelines ?? []);

  ngOnInit(): void {
    this.faultId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    if (!this.faultId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.faultService.getById(this.faultId).subscribe({
      next: (fault) => {
        this.fault.set(fault);
        this.loading.set(false);
        this.loadAttachments();
      },
      error: () => {
        this.fault.set(null);
        this.loading.set(false);
      },
    });
  }

  private loadAttachments(): void {
    this.faultService.attachments(this.faultId).subscribe({
      next: (files) => this.attachments.set(files),
      error: () => this.attachments.set([]),
    });
  }

  /** Posts a staff note; internal unless explicitly shared. */
  addNote(): void {
    const text = this.noteTextControl.value.trim();
    if (!text || this.noteTextControl.invalid) return;

    this.savingNote.set(true);
    this.faultService
      .addNote(this.faultId, text, this.noteCustomerVisibleControl.value)
      .subscribe({
        next: () => {
          this.savingNote.set(false);
          this.noteTextControl.reset();
          this.noteCustomerVisibleControl.reset();
          this.load();
        },
        error: (err) => {
          this.savingNote.set(false);
          this.snackBar.open(
            err?.error?.message ?? 'Could not add the note',
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  /** Publishes or retracts one timeline entry for the customer. */
  toggleVisibility(entry: FaultTimelineEntry): void {
    const next = !entry.isCustomerVisible;
    this.savingNote.set(true);
    this.faultService
      .setTimelineVisibility(this.faultId, entry.id, next)
      .subscribe({
        next: () => {
          this.savingNote.set(false);
          this.snackBar.open(
            next ? 'Shared with the customer' : 'Hidden from the customer',
            'Close',
            { duration: 3000 },
          );
          this.load();
        },
        error: (err) => {
          this.savingNote.set(false);
          this.snackBar.open(
            err?.error?.message ?? 'Could not change visibility',
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.faultService
      .uploadAttachment(
        this.faultId,
        file,
        this.uploadCustomerVisibleControl.value,
      )
      .subscribe({
        next: () => {
          this.uploading.set(false);
          input.value = '';
          this.loadAttachments();
          this.snackBar.open('Attachment uploaded', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.uploading.set(false);
          this.snackBar.open(err?.error?.message ?? 'Upload failed', 'Close', {
            duration: 5000,
          });
        },
      });
  }

  openAssign(): void {
    const fault = this.fault();
    if (!fault) return;
    this.dialog
      .open(FaultAssignDialogComponent, {
        width: '480px',
        panelClass: 'premium-dialog',
        data: { fault },
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }

  openStatus(): void {
    const fault = this.fault();
    if (!fault) return;
    this.dialog
      .open(FaultStatusDialogComponent, {
        width: '480px',
        panelClass: 'premium-dialog',
        data: { fault },
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }

  escalate(): void {
    const fault = this.fault();
    if (!fault) return;
    this.faultService.escalate(fault.id).subscribe({
      next: () => {
        this.snackBar.open(`${fault.faultNumber} escalated`, 'Close', {
          duration: 3000,
        });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message ?? 'Escalation failed',
          'Close',
          { duration: 5000 },
        );
      },
    });
  }

  openVisit(): void {
    const visitId = this.fault()?.visitId;
    if (visitId) void this.router.navigate(['/dashboard/visits', visitId]);
  }

  back(): void {
    void this.router.navigate(['/dashboard/crm/faults']);
  }

  label(status: string): string {
    return status.replace(/_/g, ' ');
  }

  customerName(): string {
    const c = this.fault()?.customer;
    return c?.companyName ?? c?.name ?? '—';
  }

  assigneeName(): string {
    const user = this.fault()?.assignedToUser;
    if (!user) return 'Unassigned';
    const p = user.profile;
    if (p) return `${p.firstName} ${p.lastName ?? ''}`.trim();
    return user.email;
  }

  isBreached(): boolean {
    const f = this.fault();
    if (!f?.slaDeadline) return false;
    if (f.status === 'RESOLVED' || f.status === 'CLOSED') return false;
    return new Date(f.slaDeadline).getTime() < Date.now();
  }

  isDueSoon(): boolean {
    const f = this.fault();
    if (!f?.slaDeadline) return false;
    if (f.status === 'RESOLVED' || f.status === 'CLOSED') return false;
    const remaining = new Date(f.slaDeadline).getTime() - Date.now();
    return remaining > 0 && remaining < 60 * 60 * 1000;
  }

  slaLabel(): string {
    const f = this.fault();
    if (!f?.slaDeadline) return 'No policy';
    if (f.status === 'RESOLVED' || f.status === 'CLOSED') return 'Met';

    const diff = new Date(f.slaDeadline).getTime() - Date.now();
    const overdue = diff < 0;
    const mins = Math.floor(Math.abs(diff) / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    const span =
      days > 0
        ? `${days}d ${hours % 24}h`
        : hours > 0
          ? `${hours}h ${mins % 60}m`
          : `${mins}m`;

    return overdue ? `${span} over` : `${span} left`;
  }

  fileIcon(file: FaultAttachment): string {
    if (file.mimeType.startsWith('image/')) return 'image';
    if (file.mimeType.startsWith('video/')) return 'videocam';
    if (file.mimeType === 'application/pdf') return 'picture_as_pdf';
    return 'insert_drive_file';
  }

  fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

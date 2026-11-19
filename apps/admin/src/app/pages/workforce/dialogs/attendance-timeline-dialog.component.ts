import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  SessionTimeline,
  TimelineEvent,
  WorkforceService,
} from '../../../core/services/workforce.service';

export interface AttendanceTimelineDialogData {
  readonly sessionId: string;
  readonly employeeName: string;
}

interface EventStyle {
  readonly label: string;
  readonly icon: string;
  readonly tone: 'in' | 'out' | 'break' | 'gap' | 'correction';
}

const EVENT_STYLES: Record<TimelineEvent['type'], EventStyle> = {
  CHECK_IN: { label: 'Checked in', icon: 'login', tone: 'in' },
  CHECK_OUT: { label: 'Checked out', icon: 'logout', tone: 'out' },
  BREAK_START: {
    label: 'Break started',
    icon: 'free_breakfast',
    tone: 'break',
  },
  BREAK_END: { label: 'Break ended', icon: 'play_arrow', tone: 'break' },
  TRACKING_GAP_START: {
    label: 'Tracking lost',
    icon: 'location_off',
    tone: 'gap',
  },
  TRACKING_GAP_END: {
    label: 'Tracking resumed',
    icon: 'location_on',
    tone: 'gap',
  },
  CORRECTION_REQUESTED: {
    label: 'Correction requested',
    icon: 'edit_calendar',
    tone: 'correction',
  },
  CORRECTION_DECIDED: {
    label: 'Correction decided',
    icon: 'fact_check',
    tone: 'correction',
  },
};

/**
 * "View timeline" for one attendance session: punches, breaks, tracking gaps
 * and corrections in time order (GET /attendance/sessions/:id/timeline).
 */
@Component({
  selector: 'app-attendance-timeline-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  styleUrls: ['./create-dialog.shared.scss'],
  template: `
    <div class="premium-dialog">
      <div class="glow-effect glow-purple"></div>
      <div class="glow-effect glow-blue"></div>

      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-container">
            <mat-icon class="header-icon">timeline</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">Attendance timeline</h2>
            <p class="dialog-subtitle">{{ data.employeeName }}</p>
          </div>
        </div>
      </div>

      <div class="dialog-content">
        @if (loading()) {
          <p class="hint">Loading timeline…</p>
        } @else if (error()) {
          <p class="hint error">{{ error() }}</p>
        } @else if (timeline(); as t) {
          <div class="summary">
            <span>
              {{ t.punchIn | date: 'mediumDate' }} ·
              {{ t.punchIn | date: 'shortTime' }} –
              {{ t.punchOut ? (t.punchOut | date: 'shortTime') : 'still in' }}
            </span>
            <span>
              {{ t.tracking.points }} tracking point{{
                t.tracking.points === 1 ? '' : 's'
              }}
            </span>
          </div>

          <ol class="timeline">
            @for (e of t.events; track $index) {
              <li [class]="'tone-' + style(e).tone">
                <mat-icon>{{ style(e).icon }}</mat-icon>
                <div class="body">
                  <div class="row">
                    <strong>{{ style(e).label }}</strong>
                    <time>{{ e.at | date: 'shortTime' }}</time>
                  </div>
                  @if (describe(e); as text) {
                    <div class="detail">{{ text }}</div>
                  }
                </div>
              </li>
            }
          </ol>
        }
      </div>

      <div class="dialog-actions">
        <button mat-dialog-close class="btn-cancel">Close</button>
      </div>
    </div>
  `,
  styles: [
    `
      .summary {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        color: #9ca3af;
        margin-bottom: 16px;
      }
      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 55vh;
        overflow-y: auto;
      }
      .timeline li {
        display: flex;
        gap: 12px;
        padding: 10px 0;
        border-left: 2px solid rgba(255, 255, 255, 0.08);
        padding-left: 12px;
      }
      .timeline mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      .body {
        flex: 1;
        min-width: 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      time {
        color: #9ca3af;
        font-variant-numeric: tabular-nums;
      }
      .detail {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 2px;
        overflow-wrap: anywhere;
      }
      .tone-in mat-icon {
        color: #34d399;
      }
      .tone-out mat-icon {
        color: #60a5fa;
      }
      .tone-break mat-icon {
        color: #fbbf24;
      }
      .tone-gap mat-icon {
        color: #f87171;
      }
      .tone-correction mat-icon {
        color: #c084fc;
      }
      .error {
        color: #f87171;
      }
    `,
  ],
})
export class AttendanceTimelineDialogComponent implements OnInit {
  readonly data = inject<AttendanceTimelineDialogData>(MAT_DIALOG_DATA);
  private readonly workforce = inject(WorkforceService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly timeline = signal<SessionTimeline | null>(null);

  ngOnInit(): void {
    this.workforce.getSessionTimeline(this.data.sessionId).subscribe({
      next: (t) => {
        this.timeline.set(t);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.status === 404
            ? 'This session is not visible to you.'
            : 'Could not load the timeline. Try again.',
        );
        this.loading.set(false);
      },
    });
  }

  style(e: TimelineEvent): EventStyle {
    return EVENT_STYLES[e.type];
  }

  /** One short line of detail per event type; null when nothing to add. */
  describe(e: TimelineEvent): string | null {
    const d = e.detail;
    switch (e.type) {
      case 'CHECK_IN':
        return [
          d['method'],
          d['accuracy'] != null ? `±${d['accuracy']} m` : null,
          d['spoofed'] ? 'mock location flagged' : null,
        ]
          .filter(Boolean)
          .join(' · ');
      case 'BREAK_START':
        return `${d['breakType'] ?? 'Break'}${d['paid'] ? ' (paid)' : ''}`;
      case 'BREAK_END':
      case 'TRACKING_GAP_END':
        return d['durationMinutes'] != null
          ? `${d['durationMinutes']} min`
          : null;
      case 'TRACKING_GAP_START':
        return [
          d['reason'],
          d['batteryLevel'] != null ? `battery ${d['batteryLevel']}%` : null,
          d['excused'] ? 'excused' : null,
        ]
          .filter(Boolean)
          .join(' · ');
      case 'CORRECTION_REQUESTED':
        return [d['correctionType'], d['reason']].filter(Boolean).join(': ');
      case 'CORRECTION_DECIDED':
        return String(d['status'] ?? '');
      default:
        return null;
    }
  }
}

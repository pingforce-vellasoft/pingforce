import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  FAULT_PRIORITIES,
  FAULT_STATUSES,
  Fault,
  FaultListFilter,
  FaultPriority,
  FaultService,
  FaultStatus,
} from '../../../core/services/fault.service';
import { AuthService } from '../../../core/auth/auth.service';
import { FaultCreateDialogComponent } from './fault-create-dialog.component';
import { FaultStatusDialogComponent } from './fault-status-dialog.component';
import { FaultAssignDialogComponent } from './fault-assign-dialog.component';

/** Named queues an operator switches between; each maps to a filter preset. */
type SavedView = 'ALL' | 'MY_QUEUE' | 'BREACHED' | 'UNASSIGNED';

/** Statuses that still represent outstanding work. */
const OPEN_STATES: FaultStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'REOPENED',
];

/**
 * Fault (support ticket) console.
 *
 * Server-side filtered and paginated — the tenant's fault register is far too
 * large to hold client-side, and the SLA countdown must reflect the server's
 * deadline rather than a stale snapshot.
 */
@Component({
  selector: 'app-fault-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">Faults</h1>
          <p class="page-subtitle">
            Customer issues, SLA tracking, assignment and escalation
          </p>
        </div>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Fault
        </button>
      </div>

      <div class="stat-strip">
        @for (stat of stats(); track stat.key) {
          <button
            class="stat-tile"
            [class.critical]="stat.key === 'BREACHED' && stat.value > 0"
            (click)="selectView(stat.key)"
          >
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </button>
        }
      </div>

      <div class="views">
        @for (view of savedViews; track view.key) {
          <button
            class="view-chip"
            [class.active]="activeView() === view.key"
            (click)="selectView(view.key)"
          >
            <mat-icon inline>{{ view.icon }}</mat-icon>
            {{ view.label }}
          </button>
        }
      </div>

      <div class="filters">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            class="search-input"
            placeholder="Search number or title…"
            [value]="filter().q ?? ''"
            (keyup)="onSearch($event)"
          />
        </div>

        <select class="select-input" [formControl]="statusControl">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ label(s) }}</option>
          }
        </select>

        <select class="select-input" [formControl]="priorityControl">
          <option value="">All priorities</option>
          @for (p of priorities; track p) {
            <option [value]="p">{{ p }}</option>
          }
        </select>

        <select class="select-input" [formControl]="channelControl">
          <option value="">All channels</option>
          <option value="STAFF">Staff</option>
          <option value="PORTAL">Customer</option>
          <option value="MOBILE">Mobile</option>
        </select>

        <input type="date" class="date-input" [formControl]="dateFromControl" />
        <input type="date" class="date-input" [formControl]="dateToControl" />

        @if (hasFilters()) {
          <button class="clear-btn" (click)="clearFilters()">
            <mat-icon inline>close</mat-icon> Clear
          </button>
        }
      </div>

      <div class="table-card">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="faultNumber">
            <th mat-header-cell *matHeaderCellDef>Fault</th>
            <td mat-cell *matCellDef="let row">
              <strong class="mono">{{ row.faultNumber }}</strong>
              <div class="text-small text-muted">{{ row.title }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef>Customer</th>
            <td mat-cell *matCellDef="let row">
              {{ customerName(row) }}
              <div class="text-small text-muted">{{ row.channel }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>Priority</th>
            <td mat-cell *matCellDef="let row">
              <span class="badge" [ngClass]="row.priority.toLowerCase()">
                {{ row.priority }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">
              <span class="badge" [ngClass]="row.status.toLowerCase()">
                {{ label(row.status) }}
              </span>
              @if (row.isEscalated) {
                <span
                  class="badge escalated"
                  [matTooltip]="'Escalation level ' + row.escalationLevel"
                >
                  <mat-icon inline>trending_up</mat-icon> L{{
                    row.escalationLevel
                  }}
                </span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="sla">
            <th mat-header-cell *matHeaderCellDef>SLA</th>
            <td mat-cell *matCellDef="let row">
              @if (row.slaDeadline) {
                <span
                  class="badge"
                  [class.breached]="isBreached(row)"
                  [class.due-soon]="!isBreached(row) && isDueSoon(row)"
                  [matTooltip]="row.slaDeadline | date: 'medium'"
                >
                  {{ slaLabel(row) }}
                </span>
                @if (row.slaPausedMinutes > 0) {
                  <span
                    class="badge paused"
                    matTooltip="SLA clock paused while on hold"
                  >
                    <mat-icon inline>pause</mat-icon>
                    {{ row.slaPausedMinutes }}m
                  </span>
                }
              } @else {
                <span class="text-muted text-small">No policy</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="assignee">
            <th mat-header-cell *matHeaderCellDef>Assignee</th>
            <td mat-cell *matCellDef="let row">
              @if (row.assignedToUser) {
                {{ assigneeName(row) }}
              } @else {
                <span class="badge unassigned">Unassigned</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let row">
              {{ row.createdAt | date: 'short' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="action-cell"></th>
            <td mat-cell *matCellDef="let row" class="action-cell">
              <button
                mat-icon-button
                [matMenuTriggerFor]="menu"
                (click)="$event.stopPropagation()"
              >
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="open(row)">
                  <mat-icon>open_in_new</mat-icon> Open
                </button>
                <button
                  mat-menu-item
                  (click)="openAssign(row)"
                  [disabled]="
                    row.status === 'CLOSED' || row.status === 'RESOLVED'
                  "
                >
                  <mat-icon>person_add</mat-icon> Assign
                </button>
                <button
                  mat-menu-item
                  (click)="openStatus(row)"
                  [disabled]="row.status === 'CLOSED'"
                >
                  <mat-icon>swap_horiz</mat-icon> Change status
                </button>
                <button
                  mat-menu-item
                  (click)="escalate(row)"
                  [disabled]="
                    row.status === 'CLOSED' || row.status === 'RESOLVED'
                  "
                >
                  <mat-icon>priority_high</mat-icon> Escalate
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: columns"
            class="clickable"
            [class.row-breached]="isBreached(row)"
            (click)="open(row)"
          ></tr>
        </table>

        @if (loading()) {
          <div class="state">Loading…</div>
        } @else if (rows().length === 0) {
          <div class="state">
            <mat-icon>inbox</mat-icon>
            <p>No faults match these filters.</p>
          </div>
        }

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize()"
          [pageIndex]="pageIndex()"
          [pageSizeOptions]="[25, 50, 100]"
          (page)="onPage($event)"
        ></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
      }
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .page-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
      }
      .page-subtitle {
        color: #9ca3af;
        margin: 4px 0 0 0;
        font-size: 0.875rem;
      }
      .stat-strip {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .stat-tile {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        min-width: 130px;
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 12px 16px;
        cursor: pointer;
        text-align: left;
      }
      .stat-tile.critical {
        border-color: #ef4444;
      }
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #e5e7eb;
      }
      .stat-label {
        font-size: 0.75rem;
        color: #9ca3af;
      }
      .views {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .view-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #0b0d14;
        border: 1px solid #1f2937;
        color: #9ca3af;
        border-radius: 999px;
        padding: 7px 14px;
        font-size: 0.8125rem;
        cursor: pointer;
      }
      .view-chip.active {
        border-color: #3b82f6;
        color: #e5e7eb;
        background: #111827;
      }
      .filters {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-icon {
        position: absolute;
        left: 10px;
        color: #6b7280;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .search-input {
        padding-left: 34px;
        min-width: 240px;
      }
      .search-input,
      .select-input,
      .date-input {
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 9px 12px;
        color: #e5e7eb;
        font-size: 0.875rem;
        outline: none;
      }
      .clear-btn {
        background: transparent;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 0.8125rem;
      }
      .table-card {
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 12px;
        overflow: hidden;
      }
      table {
        width: 100%;
      }
      .clickable {
        cursor: pointer;
      }
      .row-breached td {
        border-left: 2px solid #ef4444;
      }
      .action-cell {
        width: 56px;
        text-align: right;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .text-small {
        font-size: 12px;
      }
      .text-muted {
        color: #757575;
      }
      .state {
        padding: 40px;
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
        margin-right: 4px;
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
      .unassigned {
        background: #374151;
        color: #9ca3af;
      }
      .paused {
        background: #1e293b;
        color: #94a3b8;
      }
      .due-soon {
        background: #fff3e0;
        color: #f57c00;
      }
      .breached {
        background: #ef4444;
        color: #fff;
      }
    `,
  ],
})
export class FaultListComponent implements OnInit {
  private readonly faultService = inject(FaultService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusControl = new FormControl('', { nonNullable: true });
  readonly priorityControl = new FormControl('', { nonNullable: true });
  readonly channelControl = new FormControl('', { nonNullable: true });
  readonly dateFromControl = new FormControl('', { nonNullable: true });
  readonly dateToControl = new FormControl('', { nonNullable: true });

  readonly statuses = FAULT_STATUSES;
  readonly priorities = FAULT_PRIORITIES;

  readonly savedViews: { key: SavedView; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All', icon: 'list' },
    { key: 'MY_QUEUE', label: 'My queue', icon: 'person' },
    { key: 'BREACHED', label: 'SLA breached', icon: 'warning' },
    { key: 'UNASSIGNED', label: 'Unassigned', icon: 'inbox' },
  ];

  readonly columns = [
    'faultNumber',
    'customer',
    'priority',
    'status',
    'sla',
    'assignee',
    'created',
    'actions',
  ];

  readonly rows = signal<Fault[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly activeView = signal<SavedView>('ALL');
  readonly filter = signal<FaultListFilter>({ skip: 0, take: 25 });

  readonly pageSize = computed(() => this.filter().take ?? 25);
  readonly pageIndex = computed(() =>
    Math.floor((this.filter().skip ?? 0) / this.pageSize()),
  );

  readonly hasFilters = computed(() => {
    const f = this.filter();
    return Boolean(
      f.q ||
        f.status?.length ||
        f.priority?.length ||
        f.channel ||
        f.dateFrom ||
        f.dateTo,
    );
  });

  readonly stats = signal<{ key: SavedView; label: string; value: number }[]>([
    { key: 'ALL', label: 'Open', value: 0 },
    { key: 'BREACHED', label: 'SLA breached', value: 0 },
    { key: 'UNASSIGNED', label: 'Unassigned', value: 0 },
  ]);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.setStatus(value));
    this.priorityControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.setPriority(value));
    this.channelControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.setChannel(value));
    this.dateFromControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.setDate('dateFrom', value));
    this.dateToControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.setDate('dateTo', value));
  }

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => this.patch({ q: q || undefined, skip: 0 }));
    this.load();
    this.loadStats();
  }

  /**
   * Queue counters. Each call asks for a single row and reads `total`, so the
   * strip costs three counts rather than three full pages.
   */
  private loadStats(): void {
    const probe = (filter: FaultListFilter) =>
      this.faultService.list({ ...filter, take: 1, skip: 0 });

    probe({ status: OPEN_STATES }).subscribe({
      next: (page) => this.setStat('ALL', page.total),
      error: () => undefined,
    });
    probe({ slaBreached: true }).subscribe({
      next: (page) => this.setStat('BREACHED', page.total),
      error: () => undefined,
    });
    probe({ unassigned: true, status: OPEN_STATES }).subscribe({
      next: (page) => this.setStat('UNASSIGNED', page.total),
      error: () => undefined,
    });
  }

  private setStat(key: SavedView, value: number): void {
    this.stats.update((stats) =>
      stats.map((s) => (s.key === key ? { ...s, value } : s)),
    );
  }

  private patch(changes: Partial<FaultListFilter>): void {
    this.filter.update((f) => ({ ...f, ...changes }));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.faultService.list(this.filter()).subscribe({
      next: (page) => {
        this.rows.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Could not load faults', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  /** Reloads both the current page and the queue counters. */
  private reload(): void {
    this.load();
    this.loadStats();
  }

  selectView(view: SavedView): void {
    this.activeView.set(view);
    const base: FaultListFilter = {
      ...this.filter(),
      skip: 0,
      slaBreached: undefined,
      unassigned: undefined,
      assignedToId: undefined,
    };

    switch (view) {
      case 'MY_QUEUE':
        base.assignedToId = this.currentUserId() ?? undefined;
        break;
      case 'BREACHED':
        base.slaBreached = true;
        break;
      case 'UNASSIGNED':
        base.unassigned = true;
        break;
      default:
        break;
    }

    this.filter.set(base);
    this.load();
  }

  private currentUserId(): string | null {
    return this.auth.currentUser()?.userId ?? null;
  }

  onSearch(event: Event): void {
    this.search$.next((event.target as HTMLInputElement).value.trim());
  }

  setStatus(value: string): void {
    this.patch({
      status: value ? [value as FaultStatus] : undefined,
      skip: 0,
    });
  }

  setPriority(value: string): void {
    this.patch({
      priority: value ? [value as FaultPriority] : undefined,
      skip: 0,
    });
  }

  setChannel(value: string): void {
    this.patch({ channel: value || undefined, skip: 0 });
  }

  setDate(key: 'dateFrom' | 'dateTo', value: string): void {
    this.patch({ [key]: value || undefined, skip: 0 });
  }

  clearFilters(): void {
    for (const control of [
      this.statusControl,
      this.priorityControl,
      this.channelControl,
      this.dateFromControl,
      this.dateToControl,
    ]) {
      control.reset('', { emitEvent: false });
    }
    this.filter.set({ skip: 0, take: this.pageSize() });
    this.activeView.set('ALL');
    this.load();
  }

  onPage(event: PageEvent): void {
    this.patch({
      skip: event.pageIndex * event.pageSize,
      take: event.pageSize,
    });
  }

  open(fault: Fault): void {
    void this.router.navigate(['/dashboard/crm/faults', fault.id]);
  }

  openCreate(): void {
    this.dialog
      .open(FaultCreateDialogComponent, {
        width: '560px',
        panelClass: 'premium-dialog',
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.reload();
      });
  }

  openAssign(fault: Fault): void {
    this.dialog
      .open(FaultAssignDialogComponent, {
        width: '480px',
        panelClass: 'premium-dialog',
        data: { fault },
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.reload();
      });
  }

  openStatus(fault: Fault): void {
    this.dialog
      .open(FaultStatusDialogComponent, {
        width: '480px',
        panelClass: 'premium-dialog',
        data: { fault },
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.reload();
      });
  }

  escalate(fault: Fault): void {
    this.faultService.escalate(fault.id).subscribe({
      next: () => {
        this.snackBar.open(`${fault.faultNumber} escalated`, 'Close', {
          duration: 3000,
        });
        this.reload();
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

  label(status: string): string {
    return status.replace(/_/g, ' ');
  }

  customerName(fault: Fault): string {
    return fault.customer?.companyName ?? fault.customer?.name ?? '—';
  }

  assigneeName(fault: Fault): string {
    const p = fault.assignedToUser?.profile;
    if (p) return `${p.firstName} ${p.lastName ?? ''}`.trim();
    return fault.assignedToUser?.email ?? '—';
  }

  isBreached(fault: Fault): boolean {
    if (!fault.slaDeadline) return false;
    if (fault.status === 'RESOLVED' || fault.status === 'CLOSED') return false;
    return new Date(fault.slaDeadline).getTime() < Date.now();
  }

  isDueSoon(fault: Fault): boolean {
    if (!fault.slaDeadline) return false;
    if (fault.status === 'RESOLVED' || fault.status === 'CLOSED') return false;
    const remaining = new Date(fault.slaDeadline).getTime() - Date.now();
    return remaining > 0 && remaining < 60 * 60 * 1000;
  }

  /** Compact countdown, e.g. "2h 15m left" or "3h overdue". */
  slaLabel(fault: Fault): string {
    if (!fault.slaDeadline) return '—';
    if (fault.status === 'RESOLVED' || fault.status === 'CLOSED') return 'Met';

    const diff = new Date(fault.slaDeadline).getTime() - Date.now();
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

    return overdue ? `${span} overdue` : `${span} left`;
  }
}

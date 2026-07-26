import {
  Component,
  Inject,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { WorkforceService } from '../../core/services/workforce.service';
import {
  AssignConflict,
  AssignableEmployee,
  AssignedEmployee,
} from './geofence-assignment.model';

export interface GeofenceEmployeesDialogData {
  readonly geofenceId: string;
  readonly geofenceName: string;
}

/**
 * Manages which employees may punch attendance at one geofence.
 *
 * Two tabs: the current roster (with removal) and a searchable picker. The
 * picker's behaviour depends on the tenant's one-vs-many policy — under the
 * single-geofence default, employees already assigned elsewhere are hidden
 * until the admin opts into "show all", and adding one of them prompts to
 * confirm the move rather than silently reassigning.
 *
 * Removal is deliberately loud: an employee left with no geofence cannot punch
 * anywhere, so the result banner names how many are in that state.
 */
@Component({
  selector: 'app-geofence-employees-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>groups</mat-icon>
      <span>Employees at {{ data.geofenceName }}</span>
    </h2>

    <mat-dialog-content class="dialog-body">
      <!-- Tenant has zero employees: assignment is impossible, so send them to
           create employees rather than showing an empty picker. -->
      @if (tenantHasEmployees() === false) {
        <div class="empty-state">
          <mat-icon class="empty-icon">person_off</mat-icon>
          <h3>No employees yet</h3>
          <p>
            This geofence cannot be staffed until you create employees. Add
            employees first, then come back to assign them to
            {{ data.geofenceName }}.
          </p>
          <button mat-flat-button color="primary" (click)="goToEmployees()">
            <mat-icon>person_add</mat-icon> Create Employees
          </button>
        </div>
      } @else {
        <mat-tab-group animationDuration="120ms">
          <!-- ── Assigned roster ─────────────────────────────────────────── -->
          <mat-tab>
            <ng-template mat-tab-label>
              Assigned
              <span class="tab-count">{{ assigned().length }}</span>
            </ng-template>

            <div class="tab-body">
              @if (loadingAssigned()) {
                <div class="loading"><mat-spinner diameter="28" /></div>
              } @else if (assigned().length === 0) {
                <div class="empty-state small">
                  <mat-icon class="empty-icon">wrong_location</mat-icon>
                  <h3>Nobody assigned</h3>
                  <p>
                    No employee can punch attendance here yet. Use the
                    <strong>Add Employees</strong> tab to assign them.
                  </p>
                </div>
              } @else {
                <div class="list">
                  @for (e of assigned(); track e.id) {
                    <div class="row">
                      <div class="who">
                        <div class="avatar">{{ initials(e) }}</div>
                        <div class="names">
                          <span class="name">{{ fullName(e) }}</span>
                          <span class="code">{{ e.employeeCode }}</span>
                        </div>
                      </div>
                      <div class="row-actions">
                        @if (!e.assignedBy) {
                          <mat-icon
                            class="migrated-flag"
                            matTooltip="Carried over when geofence assignment was introduced — not assigned by an admin"
                            >history</mat-icon
                          >
                        }
                        <button
                          mat-icon-button
                          class="remove-btn"
                          [disabled]="saving()"
                          matTooltip="Remove from this geofence"
                          (click)="remove(e)"
                        >
                          <mat-icon>person_remove</mat-icon>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <!-- ── Picker ──────────────────────────────────────────────────── -->
          <mat-tab label="Add Employees">
            <div class="tab-body">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Search by name or employee code</mat-label>
                <input
                  matInput
                  [ngModel]="search()"
                  (ngModelChange)="onSearch($event)"
                  placeholder="e.g. Priya, EMP-0142"
                />
                <mat-icon matPrefix>search</mat-icon>
              </mat-form-field>

              @if (!allowMultiple()) {
                <div class="policy-note">
                  <mat-icon>info</mat-icon>
                  <span>
                    This tenant allows
                    <strong>one geofence per employee</strong>. Employees
                    assigned elsewhere are hidden.
                  </span>
                  <mat-checkbox
                    [ngModel]="showAll()"
                    (ngModelChange)="onToggleShowAll($event)"
                    >Show them anyway</mat-checkbox
                  >
                </div>
              }

              @if (loadingPicker()) {
                <div class="loading"><mat-spinner diameter="28" /></div>
              } @else if (candidates().length === 0) {
                <div class="empty-state small">
                  <mat-icon class="empty-icon">search_off</mat-icon>
                  <h3>No matching employees</h3>
                  <p>
                    @if (search()) {
                      Nothing matches "{{ search() }}".
                    } @else if (!allowMultiple() && !showAll()) {
                      Every employee is already assigned to a geofence. Tick
                      "Show them anyway" to move one here.
                    } @else {
                      Everyone is already assigned to this geofence.
                    }
                  </p>
                </div>
              } @else {
                <div class="list">
                  @for (c of candidates(); track c.id) {
                    <label class="row selectable">
                      <mat-checkbox
                        [checked]="selected().has(c.id)"
                        (change)="toggle(c.id)"
                      />
                      <div class="who">
                        <div class="avatar">{{ initials(c) }}</div>
                        <div class="names">
                          <span class="name">{{ fullName(c) }}</span>
                          <span class="code">{{ c.employeeCode }}</span>
                        </div>
                      </div>
                      @if (c.currentGeofences.length) {
                        <span
                          class="current-chip"
                          [class.warn]="c.requiresReassign"
                          [matTooltip]="
                            c.requiresReassign
                              ? 'Adding this employee will move them off their current geofence'
                              : 'Also assigned to these geofences'
                          "
                        >
                          <mat-icon>place</mat-icon>
                          {{ geofenceNames(c) }}
                        </span>
                      }
                    </label>
                  }
                </div>
              }

              @if (reassignCount() > 0) {
                <div class="warn-banner">
                  <mat-icon>swap_horiz</mat-icon>
                  <span>
                    {{ reassignCount() }} selected
                    {{
                      reassignCount() === 1 ? 'employee is' : 'employees are'
                    }}
                    assigned to another geofence. Saving will
                    <strong>move</strong> them here.
                  </span>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }

      @if (error()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [disabled]="saving()" (click)="close()">Close</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="selected().size === 0 || saving()"
        (click)="save()"
      >
        @if (saving()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>person_add</mat-icon>
        }
        Assign {{ selected().size || '' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
      }
      .dialog-body {
        min-width: 520px;
        max-width: 640px;
        min-height: 340px;
      }
      .tab-body {
        padding-top: 16px;
      }
      .full-width {
        width: 100%;
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 320px;
        overflow-y: auto;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
      .row.selectable {
        cursor: pointer;
      }
      .row.selectable:hover {
        background: rgba(0, 0, 0, 0.03);
      }
      .who {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e8eefc;
        color: #274690;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .names {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .code {
        font-size: 11px;
        opacity: 0.6;
      }
      .row-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .migrated-flag {
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.45;
      }
      .remove-btn {
        color: #c62828;
      }
      .current-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 999px;
        background: #eef1f5;
        color: #4a5568;
        white-space: nowrap;
      }
      .current-chip.warn {
        background: #fff4e5;
        color: #a65b00;
      }
      .current-chip mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }
      .tab-count {
        margin-left: 6px;
        background: #e8eefc;
        color: #274690;
        border-radius: 999px;
        padding: 1px 7px;
        font-size: 11px;
      }
      .policy-note {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 12px;
        background: #f5f7fa;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 12px;
      }
      .policy-note mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        opacity: 0.6;
      }
      .warn-banner,
      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        border-radius: 8px;
        padding: 10px 12px;
        margin-top: 12px;
      }
      .warn-banner {
        background: #fff4e5;
        color: #a65b00;
      }
      .error-banner {
        background: #fdecea;
        color: #b3261e;
      }
      .empty-state {
        text-align: center;
        padding: 36px 20px;
      }
      .empty-state.small {
        padding: 24px 16px;
      }
      .empty-icon {
        font-size: 42px;
        width: 42px;
        height: 42px;
        opacity: 0.28;
      }
      .empty-state h3 {
        margin: 10px 0 4px;
        font-size: 15px;
      }
      .empty-state p {
        margin: 0 0 14px;
        font-size: 13px;
        opacity: 0.7;
        line-height: 1.5;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 32px;
      }
    `,
  ],
})
export class GeofenceEmployeesDialogComponent implements OnInit {
  private readonly workforce = inject(WorkforceService);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly searchInput = new Subject<string>();

  readonly assigned = signal<AssignedEmployee[]>([]);
  readonly candidates = signal<AssignableEmployee[]>([]);
  readonly selected = signal<Set<string>>(new Set());
  readonly search = signal('');
  readonly showAll = signal(false);
  readonly allowMultiple = signal(true);
  /** Null until the first picker load resolves, so the empty state waits. */
  readonly tenantHasEmployees = signal<boolean | null>(null);
  readonly loadingAssigned = signal(true);
  readonly loadingPicker = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /** How many of the selected employees would be moved off another geofence. */
  readonly reassignCount = computed(() => {
    const sel = this.selected();
    return this.candidates().filter((c) => sel.has(c.id) && c.requiresReassign)
      .length;
  });

  constructor(
    public readonly dialogRef: MatDialogRef<GeofenceEmployeesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: GeofenceEmployeesDialogData,
  ) {}

  ngOnInit(): void {
    // Debounced so typing a name does not fire a request per keystroke.
    this.searchInput
      .pipe(debounceTime(280), distinctUntilChanged())
      .subscribe(() => this.loadCandidates());

    this.loadAssigned();
    this.loadCandidates();
  }

  private loadAssigned(): void {
    this.loadingAssigned.set(true);
    this.workforce.getGeofenceEmployees(this.data.geofenceId).subscribe({
      next: (res) => {
        this.assigned.set([...res.employees]);
        this.loadingAssigned.set(false);
      },
      error: (err) => {
        this.error.set(
          this.messageOf(err, 'Could not load assigned employees.'),
        );
        this.loadingAssigned.set(false);
      },
    });
  }

  private loadCandidates(): void {
    this.loadingPicker.set(true);
    this.workforce
      .getAssignableEmployees(this.data.geofenceId, {
        search: this.search() || undefined,
        scope: this.showAll() ? 'ALL' : 'ASSIGNABLE',
        pageSize: 100,
      })
      .subscribe({
        next: (res) => {
          this.candidates.set([...res.employees]);
          this.allowMultiple.set(res.allowMultipleGeofencesPerEmployee);
          this.tenantHasEmployees.set(res.tenantHasEmployees);
          // Drop selections that fell out of the new result set, so the count
          // on the save button never claims more than is actually visible.
          const visible = new Set(res.employees.map((e) => e.id));
          this.selected.update((sel) => {
            const next = new Set<string>();
            sel.forEach((id) => {
              if (visible.has(id)) next.add(id);
            });
            return next;
          });
          this.loadingPicker.set(false);
        },
        error: (err) => {
          this.error.set(this.messageOf(err, 'Could not load employees.'));
          this.loadingPicker.set(false);
        },
      });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.searchInput.next(value);
  }

  onToggleShowAll(value: boolean): void {
    this.showAll.set(value);
    this.loadCandidates();
  }

  toggle(id: string): void {
    this.selected.update((sel) => {
      const next = new Set(sel);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  save(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    // The API rejects a move it was not told about. Since the picker already
    // showed which employees are assigned elsewhere and warned about it, send
    // `reassign` when any of them is selected rather than making the admin
    // hit a 409 first.
    const reassign = this.reassignCount() > 0;

    this.saving.set(true);
    this.error.set(null);
    this.workforce
      .assignEmployeesToGeofence(this.data.geofenceId, ids, reassign)
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.selected.set(new Set());
          const parts = [`${res.assigned} assigned`];
          if (res.reassigned) parts.push(`${res.reassigned} moved`);
          if (res.skipped) parts.push(`${res.skipped} already here`);
          this.snack.open(parts.join(' · '), 'Dismiss', { duration: 4000 });
          this.loadAssigned();
          this.loadCandidates();
          this.dialogRef.disableClose = false;
        },
        error: (err) => {
          this.saving.set(false);
          // 409 lists exactly who conflicts — name them instead of showing a
          // generic failure the admin cannot act on.
          const conflicts: AssignConflict[] | undefined = err?.error?.conflicts;
          if (err?.status === 409 && conflicts?.length) {
            const names = conflicts
              .map(
                (c) =>
                  `${c.employeeName ?? 'Employee'} (on ${c.currentGeofenceName})`,
              )
              .join(', ');
            this.error.set(
              `Already assigned elsewhere: ${names}. Tick "Show them anyway" and re-select to move them.`,
            );
            return;
          }
          this.error.set(this.messageOf(err, 'Could not assign employees.'));
        },
      });
  }

  remove(employee: AssignedEmployee): void {
    this.saving.set(true);
    this.error.set(null);
    this.workforce
      .unassignEmployeesFromGeofence(this.data.geofenceId, [employee.id])
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          // Being left with no geofence means this person cannot punch at all,
          // which is a consequence worth stating rather than a quiet success.
          const stranded = res.leftWithoutGeofence.length;
          this.snack.open(
            stranded > 0
              ? `${this.fullName(employee)} removed — now has no geofence and cannot punch attendance.`
              : `${this.fullName(employee)} removed from this geofence.`,
            'Dismiss',
            { duration: stranded > 0 ? 7000 : 3500 },
          );
          this.loadAssigned();
          this.loadCandidates();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.messageOf(err, 'Could not remove employee.'));
        },
      });
  }

  goToEmployees(): void {
    this.dialogRef.close();
    void this.router.navigate(['/workforce/employees']);
  }

  fullName(e: {
    firstName: string;
    lastName: string;
    displayName?: string | null;
  }): string {
    return e.displayName?.trim() || `${e.firstName} ${e.lastName}`.trim();
  }

  initials(e: { firstName: string; lastName: string }): string {
    return `${e.firstName?.[0] ?? ''}${e.lastName?.[0] ?? ''}`.toUpperCase();
  }

  geofenceNames(c: AssignableEmployee): string {
    return c.currentGeofences.map((g) => g.name).join(', ');
  }

  close(): void {
    this.dialogRef.close(true);
  }

  private messageOf(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: unknown } })?.error?.message;
    return typeof message === 'string' ? message : fallback;
  }
}

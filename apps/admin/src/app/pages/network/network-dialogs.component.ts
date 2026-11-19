import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ImpactResult,
  NetworkConnection,
  NetworkService,
  Olte,
  TreeNode,
} from '../../core/services/network.service';

/** A user who can be assigned to a connection (Employee with a login). */
export interface AssignableUser {
  userId: string;
  label: string;
}

const DIALOG_IMPORTS = [
  CommonModule,
  ReactiveFormsModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatButtonModule,
  MatIconModule,
  MatProgressSpinnerModule,
];

export const CONNECTION_STATUSES = [
  'ACTIVE',
  'PENDING_INSTALLATION',
  'SUSPENDED',
  'DISCONNECTED',
  'FAULTY',
  'MAINTENANCE',
];

// ---------------------------------------------------------------------------
// OLTE create/edit dialog
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-olte-form-dialog',
  standalone: true,
  imports: DIALOG_IMPORTS,
  template: `
    <h2 mat-dialog-title>{{ data.olte ? 'Edit OLTE' : 'New OLTE' }}</h2>
    <mat-dialog-content [formGroup]="form" class="dialog-form">
      <mat-form-field appearance="outline" *ngIf="!data.olte">
        <mat-label>Code</mat-label>
        <input matInput formControlName="code" placeholder="OLTE-001" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Total Ports</mat-label>
        <input matInput type="number" formControlName="totalPorts" />
      </mat-form-field>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Latitude</mat-label>
          <input matInput type="number" formControlName="latitude" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Longitude</mat-label>
          <input matInput type="number" formControlName="longitude" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Address</mat-label>
        <input matInput formControlName="address" />
      </mat-form-field>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Area</mat-label>
          <input matInput formControlName="area" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Village</mat-label>
          <input matInput formControlName="village" />
        </mat-form-field>
      </div>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Mandal</mat-label>
          <input matInput formControlName="mandal" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>District</mat-label>
          <input matInput formControlName="district" />
        </mat-form-field>
      </div>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || saving()"
        (click)="save()"
      >
        {{ data.olte ? 'Save' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        min-width: 380px;
        padding-top: 8px;
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .row > * {
        flex: 1;
      }
      .error {
        color: #c62828;
        font-size: 13px;
      }
    `,
  ],
})
export class OlteFormDialogComponent {
  private fb = inject(FormBuilder);
  private networkService = inject(NetworkService);
  readonly dialogRef = inject(MatDialogRef<OlteFormDialogComponent>);
  readonly data: { olte?: Olte } = inject(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    code: [this.data.olte?.code ?? '', Validators.required],
    name: [this.data.olte?.name ?? '', Validators.required],
    totalPorts: [this.data.olte?.totalPorts ?? 0],
    latitude: [this.data.olte?.latitude ?? null],
    longitude: [this.data.olte?.longitude ?? null],
    address: [this.data.olte?.address ?? ''],
    area: [this.data.olte?.area ?? ''],
    village: [this.data.olte?.village ?? ''],
    mandal: [this.data.olte?.mandal ?? ''],
    district: [this.data.olte?.district ?? ''],
  });

  save(): void {
    this.saving.set(true);
    this.error.set('');
    const raw = this.form.getRawValue();
    const payload: Partial<Olte> = {
      name: raw.name ?? '',
      totalPorts: Number(raw.totalPorts) || 0,
      latitude: raw.latitude !== null ? Number(raw.latitude) : undefined,
      longitude: raw.longitude !== null ? Number(raw.longitude) : undefined,
      address: raw.address || undefined,
      area: raw.area || undefined,
      village: raw.village || undefined,
      mandal: raw.mandal || undefined,
      district: raw.district || undefined,
    };
    const request = this.data.olte
      ? this.networkService.updateOlte(this.data.olte.id, payload)
      : this.networkService.createOlte({ ...payload, code: raw.code ?? '' });
    request.subscribe({
      next: (olte) => this.dialogRef.close(olte),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save OLTE');
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Connection create dialog
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-connection-form-dialog',
  standalone: true,
  imports: DIALOG_IMPORTS,
  template: `
    <h2 mat-dialog-title>New Connection</h2>
    <mat-dialog-content [formGroup]="form" class="dialog-form">
      <mat-form-field appearance="outline">
        <mat-label>Connection Code</mat-label>
        <input
          matInput
          formControlName="connectionCode"
          placeholder="CONN-1001"
        />
      </mat-form-field>
      <p class="hint" *ngIf="isEdit">
        Code, OLTE and parent are changed with <strong>Move</strong>, so the
        topology stays consistent.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>OLTE</mat-label>
        <mat-select formControlName="olteId">
          <mat-option *ngFor="let olte of data.oltes" [value]="olte.id">
            {{ olte.code }} — {{ olte.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" *ngIf="!isEdit">
        <mat-label
          >Parent Connection (optional — blank = direct to OLTE)</mat-label
        >
        <input
          matInput
          formControlName="parentConnectionId"
          placeholder="Connection ID"
        />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Customer ID (optional — blank = junction)</mat-label>
        <input matInput formControlName="customerId" />
      </mat-form-field>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Node Type</mat-label>
          <mat-select formControlName="nodeType">
            <mat-option value="CUSTOMER">Customer</mat-option>
            <mat-option value="JUNCTION">Junction</mat-option>
            <mat-option value="SPLITTER">Splitter</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option *ngFor="let s of statuses" [value]="s">{{
              s
            }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Latitude</mat-label>
          <input matInput type="number" formControlName="latitude" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Longitude</mat-label>
          <input matInput type="number" formControlName="longitude" />
        </mat-form-field>
      </div>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Connection Type</mat-label>
          <mat-select formControlName="connectionType">
            <mat-option value="FIBER">Fiber</mat-option>
            <mat-option value="COPPER">Copper</mat-option>
            <mat-option value="WIRELESS">Wireless</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cable Type</mat-label>
          <input matInput formControlName="cableType" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Assigned employee</mat-label>
        <mat-select formControlName="assignedEmployeeId">
          <mat-option [value]="''">Unassigned</mat-option>
          <mat-option *ngFor="let u of employees" [value]="u.userId">
            {{ u.label }}
          </mat-option>
        </mat-select>
        <mat-hint
          >Field staff see assigned connections and their route on the mobile
          map.</mat-hint
        >
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Remarks</mat-label>
        <input matInput formControlName="remarks" />
      </mat-form-field>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || saving()"
        (click)="save()"
      >
        {{ isEdit ? 'Save' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        min-width: 420px;
        padding-top: 8px;
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .row > * {
        flex: 1;
      }
      .error {
        color: #c62828;
        font-size: 13px;
      }
      .hint {
        margin: -8px 0 12px;
        font-size: 12px;
        color: #666;
      }
    `,
  ],
})
export class ConnectionFormDialogComponent {
  private fb = inject(FormBuilder);
  private networkService = inject(NetworkService);
  readonly dialogRef = inject(MatDialogRef<ConnectionFormDialogComponent>);
  readonly data: {
    oltes: Olte[];
    olteId?: string;
    parentConnectionId?: string;
    /** Present = edit mode. */
    connection?: NetworkConnection;
    employees?: AssignableUser[];
  } = inject(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly error = signal('');
  readonly statuses = CONNECTION_STATUSES;
  readonly isEdit = !!this.data.connection;
  readonly employees: AssignableUser[] = this.withCurrentAssignee();

  private readonly c = this.data.connection;

  readonly form = this.fb.group({
    connectionCode: [this.c?.connectionCode ?? '', Validators.required],
    olteId: [this.c?.olteId ?? this.data.olteId ?? '', Validators.required],
    parentConnectionId: [this.data.parentConnectionId ?? ''],
    customerId: [this.c?.customerId ?? ''],
    nodeType: [this.c?.nodeType ?? 'CUSTOMER'],
    status: [this.c?.status ?? 'PENDING_INSTALLATION'],
    latitude: [this.c?.latitude ?? (null as number | null)],
    longitude: [this.c?.longitude ?? (null as number | null)],
    connectionType: [this.c?.connectionType ?? 'FIBER'],
    cableType: [this.c?.cableType ?? ''],
    assignedEmployeeId: [this.c?.assignedEmployeeId ?? ''],
    remarks: [this.c?.remarks ?? ''],
  });

  constructor() {
    if (this.isEdit) {
      this.form.controls.connectionCode.disable();
      this.form.controls.olteId.disable();
    }
  }

  /** Keep a current assignee selectable even if they are not in the page. */
  private withCurrentAssignee(): AssignableUser[] {
    const list = this.data.employees ?? [];
    const current = this.data.connection?.assignedEmployeeId;
    return current && !list.some((u) => u.userId === current)
      ? [...list, { userId: current, label: 'Current assignee' }]
      : list;
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    const raw = this.form.getRawValue();
    if (this.c) {
      this.saveEdit(this.c.id, raw);
      return;
    }
    this.networkService
      .createConnection({
        connectionCode: raw.connectionCode ?? '',
        olteId: raw.olteId ?? '',
        parentConnectionId: raw.parentConnectionId || undefined,
        customerId: raw.customerId || undefined,
        nodeType: raw.nodeType ?? 'CUSTOMER',
        status: raw.status ?? 'PENDING_INSTALLATION',
        latitude: raw.latitude !== null ? Number(raw.latitude) : undefined,
        longitude: raw.longitude !== null ? Number(raw.longitude) : undefined,
        connectionType: raw.connectionType || undefined,
        cableType: raw.cableType || undefined,
        assignedEmployeeId: raw.assignedEmployeeId || undefined,
        remarks: raw.remarks || undefined,
      })
      .subscribe({
        next: (conn) => this.dialogRef.close(conn),
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Failed to create connection');
        },
      });
  }

  /**
   * Metadata only (PATCH). Topology moves go through the Move dialog.
   * Clearing customer or assignee sends null so the API unlinks it.
   */
  private saveEdit(
    id: string,
    raw: ReturnType<typeof this.form.getRawValue>,
  ): void {
    this.networkService
      .updateConnection(id, {
        customerId: raw.customerId || null,
        nodeType: raw.nodeType ?? undefined,
        status: raw.status ?? undefined,
        latitude: raw.latitude !== null ? Number(raw.latitude) : undefined,
        longitude: raw.longitude !== null ? Number(raw.longitude) : undefined,
        connectionType: raw.connectionType || undefined,
        cableType: raw.cableType || undefined,
        assignedEmployeeId: raw.assignedEmployeeId || null,
        remarks: raw.remarks || undefined,
      })
      .subscribe({
        next: (conn) => this.dialogRef.close(conn),
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Failed to save connection');
        },
      });
  }
}

// ---------------------------------------------------------------------------
// Move dialog: re-attach a connection (and its subtree) under another node
// or directly on an OLTE (3.7_ConnectionMap §5.3, NETWORK:MOVE).
// ---------------------------------------------------------------------------

interface ParentOption {
  id: string;
  label: string;
}

/** Flattens an OLTE tree, skipping `excludeId` and everything under it. */
export function parentOptions(
  nodes: readonly TreeNode[],
  excludeId: string,
  prefix = '',
): ParentOption[] {
  const out: ParentOption[] = [];
  for (const n of nodes) {
    if (n.id === excludeId) continue;
    const name = n.customer?.displayName || n.customer?.legalName;
    out.push({
      id: n.id,
      label: `${prefix}${n.connectionCode}${name ? ' — ' + name : ''}`,
    });
    out.push(...parentOptions(n.children, excludeId, prefix + '  '));
  }
  return out;
}

@Component({
  selector: 'app-move-connection-dialog',
  standalone: true,
  imports: DIALOG_IMPORTS,
  template: `
    <h2 mat-dialog-title>Move {{ data.connection.connectionCode }}</h2>
    <mat-dialog-content class="dialog-form">
      <p class="note">
        Moves this connection with its
        {{ data.connection.downstreamCount ?? 0 }} downstream node(s).
      </p>
      <mat-form-field appearance="outline">
        <mat-label>OLTE</mat-label>
        <mat-select
          [value]="olteId()"
          (selectionChange)="pickOlte($event.value)"
        >
          <mat-option *ngFor="let olte of data.oltes" [value]="olte.id">
            {{ olte.code }} — {{ olte.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>New parent</mat-label>
        <mat-select
          [value]="parentId()"
          (selectionChange)="parentId.set($event.value)"
        >
          <mat-option [value]="''"
            >Directly on the OLTE (uses a port)</mat-option
          >
          <mat-option *ngFor="let o of options()" [value]="o.id">
            <span class="tree-label">{{ o.label }}</span>
          </mat-option>
        </mat-select>
      </mat-form-field>
      <mat-spinner *ngIf="loading()" diameter="24"></mat-spinner>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="saving() || loading() || unchanged()"
        (click)="save()"
      >
        Move
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        min-width: 420px;
        padding-top: 8px;
      }
      .note {
        margin-top: 0;
        color: #555;
      }
      .tree-label {
        white-space: pre;
      }
      .error {
        color: #c62828;
        font-size: 13px;
      }
    `,
  ],
})
export class MoveConnectionDialogComponent {
  private networkService = inject(NetworkService);
  readonly dialogRef = inject(MatDialogRef<MoveConnectionDialogComponent>);
  readonly data: { connection: NetworkConnection; oltes: Olte[] } =
    inject(MAT_DIALOG_DATA);

  readonly olteId = signal(this.data.connection.olteId);
  readonly parentId = signal(this.data.connection.parentConnectionId ?? '');
  readonly options = signal<ParentOption[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  constructor() {
    this.loadTree(this.olteId());
  }

  unchanged(): boolean {
    const c = this.data.connection;
    return (
      this.olteId() === c.olteId &&
      this.parentId() === (c.parentConnectionId ?? '')
    );
  }

  pickOlte(olteId: string): void {
    this.olteId.set(olteId);
    this.parentId.set('');
    this.loadTree(olteId);
  }

  private loadTree(olteId: string): void {
    this.loading.set(true);
    this.networkService.getTree(olteId).subscribe({
      next: (tree) => {
        this.options.set(parentOptions(tree.tree, this.data.connection.id));
        this.loading.set(false);
      },
      error: () => {
        this.options.set([]);
        this.loading.set(false);
        this.error.set('Could not load the OLTE tree');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    const parent = this.parentId();
    this.networkService
      .moveConnection(
        this.data.connection.id,
        parent
          ? { newParentConnectionId: parent }
          : { newOlteId: this.olteId() },
      )
      .subscribe({
        next: (conn) => this.dialogRef.close(conn),
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Move failed');
        },
      });
  }
}

// ---------------------------------------------------------------------------
// Impact-warning dialog (move / disconnect confirmations — BRD BR-3.3)
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-impact-dialog',
  standalone: true,
  imports: DIALOG_IMPORTS,
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">warning</mat-icon> Confirm {{ data.actionLabel }}
    </h2>
    <mat-dialog-content>
      <p>
        <strong>{{ data.connection.connectionCode }}</strong>
        <span *ngIf="data.connection.customer as c">
          ({{ c.displayName || c.legalName }})</span
        >
      </p>
      <ng-container *ngIf="impact() as i; else loading">
        <p *ngIf="i.downstreamCustomerCount > 0" class="impact-warning">
          {{ i.downstreamCustomerCount }} downstream customer(s) will be
          affected by this change.
        </p>
        <p *ngIf="i.downstreamCustomerCount === 0">
          No downstream customers are affected.
        </p>
        <ul class="impact-list">
          <li *ngFor="let d of i.downstream.slice(0, 10)">
            {{ d.connectionCode }} — {{ d.status }}
          </li>
          <li *ngIf="i.downstream.length > 10">
            … and {{ i.downstream.length - 10 }} more
          </li>
        </ul>
      </ng-container>
      <ng-template #loading>
        <mat-spinner diameter="28"></mat-spinner>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="warn"
        [disabled]="!impact()"
        [mat-dialog-close]="true"
      >
        {{ data.actionLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .impact-warning {
        color: #c62828;
        font-weight: 600;
      }
      .impact-list {
        max-height: 160px;
        overflow-y: auto;
        font-size: 13px;
        color: #555;
      }
    `,
  ],
})
export class ImpactDialogComponent {
  private networkService = inject(NetworkService);
  readonly dialogRef = inject(MatDialogRef<ImpactDialogComponent>);
  readonly data: { connection: NetworkConnection; actionLabel: string } =
    inject(MAT_DIALOG_DATA);
  readonly impact = signal<ImpactResult | null>(null);

  constructor() {
    this.networkService
      .getImpact(this.data.connection.id)
      .subscribe((impact) => this.impact.set(impact));
  }
}

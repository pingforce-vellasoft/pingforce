import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  AssignableUser,
  FAULT_PRIORITIES,
  FaultPriority,
  FaultService,
} from '../../../core/services/fault.service';

/**
 * Raise a fault on behalf of a customer (channel STAFF).
 *
 * The fault number is the tenant-unique natural key and is not editable after
 * creation, so it is generated here in the same shape the customer portal
 * uses and shown read-only.
 */
@Component({
  selector: 'app-fault-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>New fault</h2>

    <mat-dialog-content>
      <div class="row">
        <div class="col">
          <label class="field-label">Fault number</label>
          <input class="input mono" [value]="faultNumber" readonly />
        </div>
        <div class="col">
          <label class="field-label">Priority</label>
          <select class="input" [formControl]="form.controls.priority">
            @for (p of priorities; track p) {
              <option [ngValue]="p">{{ p }}</option>
            }
          </select>
        </div>
      </div>

      <label class="field-label">Title *</label>
      <input
        class="input"
        [formControl]="form.controls.title"
        maxlength="200"
        placeholder="Short summary of the issue"
      />

      <label class="field-label">Description *</label>
      <textarea
        class="input"
        rows="4"
        [formControl]="form.controls.description"
        maxlength="5000"
        placeholder="What is wrong, what was observed, any reference numbers…"
      ></textarea>

      <div class="row">
        <div class="col">
          <label class="field-label">Customer</label>
          <select class="input" [formControl]="form.controls.customerId">
            <option [ngValue]="null">No customer</option>
            @for (c of customers(); track c.id) {
              <option [ngValue]="c.id">{{ customerName(c) }}</option>
            }
          </select>
        </div>
        <div class="col">
          <label class="field-label">Assign to</label>
          <select class="input" [formControl]="form.controls.assignedToId">
            <option [ngValue]="null">Leave in the queue</option>
            @for (u of users(); track u.userId) {
              <option [ngValue]="u.userId">{{ userName(u) }}</option>
            }
          </select>
        </div>
      </div>

      <div class="row">
        <div class="col">
          <label class="field-label">Category</label>
          <input
            class="input"
            [formControl]="form.controls.category"
            maxlength="100"
            placeholder="e.g. Connectivity"
          />
        </div>
        <div class="col">
          <label class="field-label">Sub-category</label>
          <input
            class="input"
            [formControl]="form.controls.subCategory"
            maxlength="100"
            placeholder="e.g. Fibre cut"
          />
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="saving() || !canSave()"
        (click)="save()"
      >
        {{ saving() ? 'Creating…' : 'Create fault' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .row {
        display: flex;
        gap: 12px;
      }
      .col {
        flex: 1;
        min-width: 0;
      }
      .field-label {
        display: block;
        font-size: 0.8125rem;
        color: #9ca3af;
        margin: 12px 0 6px;
      }
      .input {
        width: 100%;
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 9px 12px;
        color: #e5e7eb;
        font-size: 0.875rem;
        outline: none;
        font-family: inherit;
        box-sizing: border-box;
      }
      .input[readonly] {
        color: #9ca3af;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
    `,
  ],
})
export class FaultCreateDialogComponent implements OnInit {
  private readonly faultService = inject(FaultService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<FaultCreateDialogComponent>);

  readonly priorities = FAULT_PRIORITIES;
  readonly customers = signal<
    { id: string; name?: string; companyName?: string }[]
  >([]);
  readonly users = signal<AssignableUser[]>([]);
  readonly saving = signal(false);

  readonly faultNumber = this.generateFaultNumber();

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(5000)],
    }),
    priority: new FormControl<FaultPriority>('MEDIUM', { nonNullable: true }),
    customerId: new FormControl<string | null>(null),
    assignedToId: new FormControl<string | null>(null),
    category: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(100),
    }),
    subCategory: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(100),
    }),
  });

  ngOnInit(): void {
    this.faultService.customers().subscribe({
      next: (list) => this.customers.set(list),
      error: () => this.customers.set([]),
    });
    this.faultService.assignableUsers().subscribe({
      next: (list) => this.users.set(list),
      error: () => this.users.set([]),
    });
  }

  canSave(): boolean {
    const value = this.form.getRawValue();
    return (
      this.form.valid &&
      value.title.trim().length > 0 &&
      value.description.trim().length > 0
    );
  }

  customerName(c: { name?: string; companyName?: string; id: string }): string {
    return c.companyName ?? c.name ?? c.id;
  }

  userName(u: AssignableUser): string {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return name || u.employeeCode || u.userId;
  }

  /** Same shape the portal uses: PF-<epoch36><3 digits>. */
  private generateFaultNumber(): string {
    const suffix = Math.floor(100 + Math.random() * 900);
    return `PF-${Date.now().toString(36).toUpperCase()}${suffix}`;
  }

  save(): void {
    if (!this.canSave()) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.faultService
      .create({
        faultNumber: this.faultNumber,
        title: value.title.trim(),
        description: value.description.trim(),
        priority: value.priority,
        customerId: value.customerId ?? undefined,
        assignedToId: value.assignedToId ?? undefined,
        category: value.category.trim() || undefined,
        subCategory: value.subCategory.trim() || undefined,
      })
      .subscribe({
        next: (fault) => {
          this.snackBar.open(`${fault.faultNumber} created`, 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err?.error?.message ?? 'Could not create the fault',
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}

import { Component, inject } from '@angular/core';
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
import { VisitEmployee } from '../../../core/services/visits.service';

export interface CreateVisitDialogData {
  employees: VisitEmployee[];
}

@Component({
  selector: 'app-create-visit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Plan Visit</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Purpose</mat-label>
          <input matInput formControlName="purpose" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Visit Type</mat-label>
          <mat-select formControlName="visitType">
            @for (type of visitTypes; track type) {
              <mat-option [value]="type">{{ type }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select formControlName="priority">
            @for (priority of priorities; track priority) {
              <mat-option [value]="priority">{{ priority }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Planned Start</mat-label>
          <input
            matInput
            type="datetime-local"
            formControlName="plannedStartAt"
            required
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Assign To (optional)</mat-label>
          <mat-select formControlName="employeeId">
            <mat-option [value]="''">Unassigned</mat-option>
            @for (employee of data.employees; track employee.id) {
              <mat-option [value]="employee.id">
                {{ employee.employeeCode }} — {{ employee.firstName }}
                {{ employee.lastName }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid"
        (click)="save()"
      >
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 360px;
        padding-top: 8px;
      }
    `,
  ],
})
export class CreateVisitDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateVisitDialogComponent>);
  readonly data = inject<CreateVisitDialogData>(MAT_DIALOG_DATA);

  readonly visitTypes = [
    'PLANNED',
    'AD_HOC',
    'EMERGENCY',
    'MAINTENANCE',
    'INSPECTION',
    'INSTALLATION',
    'COMPLAINT',
    'SALES',
    'SURVEY',
    'FOLLOW_UP',
  ];
  readonly priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  readonly form = this.fb.nonNullable.group({
    purpose: ['', Validators.required],
    description: [''],
    visitType: ['PLANNED'],
    priority: ['MEDIUM'],
    plannedStartAt: ['', Validators.required],
    employeeId: [''],
  });

  save(): void {
    const value = this.form.getRawValue();
    this.dialogRef.close({
      purpose: value.purpose,
      description: value.description || undefined,
      visitType: value.visitType,
      priority: value.priority,
      plannedStartAt: new Date(value.plannedStartAt).toISOString(),
      employeeId: value.employeeId || undefined,
    });
  }
}

@Component({
  selector: 'app-assign-visit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Assign Visit</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Employee</mat-label>
          <mat-select formControlName="employeeId" required>
            @for (employee of data.employees; track employee.id) {
              <mat-option [value]="employee.id">
                {{ employee.employeeCode }} — {{ employee.firstName }}
                {{ employee.lastName }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid"
        (click)="dialogRef.close(form.getRawValue().employeeId)"
      >
        Assign
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        min-width: 320px;
        padding-top: 8px;
      }
      mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class AssignVisitDialogComponent {
  private fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<AssignVisitDialogComponent>);
  readonly data = inject<CreateVisitDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
  });
}

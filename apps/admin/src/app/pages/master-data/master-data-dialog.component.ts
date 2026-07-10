import { Component, Inject, inject } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  MasterData,
  MasterDataService,
} from '../../core/services/master-data.service';

export interface MasterDataDialogData {
  type: string;
  isEdit: boolean;
  item?: MasterData;
}

@Component({
  selector: 'app-master-data-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.isEdit ? 'Edit' : 'Create' }} {{ getTypeName() }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter name" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Code</mat-label>
          <input
            matInput
            formControlName="code"
            placeholder="Enter code (e.g. BR-01)"
          />
          @if (form.get('code')?.hasError('required')) {
            <mat-error>Code is required</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || isLoading"
        (click)="onSave()"
      >
        {{ data.isEdit ? 'Update' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .form-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 300px;
        margin-top: 16px;
      }
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class MasterDataDialogComponent {
  private fb = inject(FormBuilder);
  private masterDataService = inject(MasterDataService);

  form: FormGroup;
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<MasterDataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MasterDataDialogData,
  ) {
    this.form = this.fb.group({
      name: [data.item?.name || '', Validators.required],
      code: [data.item?.code || '', Validators.required],
    });
  }

  getTypeName(): string {
    return this.data.type.charAt(0).toUpperCase() + this.data.type.slice(1);
  }

  onSave() {
    if (this.form.invalid) return;

    this.isLoading = true;
    const request = this.data.isEdit
      ? this.masterDataService.update(
          this.data.type,
          this.data.item!.id,
          this.form.value,
        )
      : this.masterDataService.create(this.data.type, this.form.value);

    request.subscribe({
      next: (result) => {
        this.dialogRef.close(result);
      },
      error: (err) => {
        console.error('Save failed', err);
        this.isLoading = false;
      },
    });
  }
}

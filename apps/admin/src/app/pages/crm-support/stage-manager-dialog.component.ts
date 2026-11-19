import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import {
  CrmSupportService,
  PipelineStage,
} from '../../core/services/crm-support.service';

/** Moves the item at `index` one step up (-1) or down (+1); copy returned. */
export function moveItem<T>(
  list: readonly T[],
  index: number,
  delta: -1 | 1,
): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Pipeline stage manager (3.4 SALES_PIPELINE.md §4): add, rename, reorder and
 * remove the tenant's stages. Every change is saved immediately; the board
 * reloads when the dialog closes. Removing a stage that still holds leads is
 * refused by the API with a message to move them first.
 */
@Component({
  selector: 'app-stage-manager-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Pipeline stages</h2>
    <mat-dialog-content class="content">
      <div class="stage-row" *ngFor="let s of stages(); let i = index">
        <mat-form-field appearance="outline" class="name">
          <input
            matInput
            [value]="s.name"
            [attr.aria-label]="'Name of stage ' + (i + 1)"
            (keydown.enter)="rename(s, $any($event.target).value)"
            (blur)="rename(s, $any($event.target).value)"
          />
        </mat-form-field>
        <button
          mat-icon-button
          matTooltip="Move up"
          [disabled]="busy() || i === 0"
          (click)="reorder(i, -1)"
        >
          <mat-icon>arrow_upward</mat-icon>
        </button>
        <button
          mat-icon-button
          matTooltip="Move down"
          [disabled]="busy() || i === stages().length - 1"
          (click)="reorder(i, 1)"
        >
          <mat-icon>arrow_downward</mat-icon>
        </button>
        <button
          mat-icon-button
          color="warn"
          matTooltip="Remove (only when empty)"
          [disabled]="busy() || stages().length === 1"
          (click)="remove(s)"
        >
          <mat-icon>delete</mat-icon>
        </button>
      </div>
      <div class="add-row">
        <mat-form-field appearance="outline" class="name">
          <mat-label>New stage</mat-label>
          <input
            matInput
            #newName
            (keydown.enter)="add(newName.value); newName.value = ''"
          />
        </mat-form-field>
        <button
          mat-stroked-button
          [disabled]="busy()"
          (click)="add(newName.value); newName.value = ''"
        >
          <mat-icon>add</mat-icon> Add
        </button>
      </div>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .content {
        min-width: 420px;
      }
      .stage-row,
      .add-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .name {
        flex: 1;
      }
      .add-row {
        margin-top: 8px;
        gap: 8px;
      }
      .error {
        color: #c62828;
        font-size: 13px;
      }
    `,
  ],
})
export class StageManagerDialogComponent {
  private crm = inject(CrmSupportService);
  readonly dialogRef = inject(MatDialogRef<StageManagerDialogComponent>);
  readonly data: { stages: PipelineStage[] } = inject(MAT_DIALOG_DATA);

  readonly stages = signal<PipelineStage[]>([...this.data.stages]);
  readonly busy = signal(false);
  readonly error = signal('');

  add(name: string): void {
    const clean = name.trim();
    if (!clean) return;
    this.run(this.crm.createStage(clean), (created) =>
      this.stages.update((list) => [...list, created]),
    );
  }

  rename(stage: PipelineStage, name: string): void {
    const clean = name.trim();
    if (!clean || clean === stage.name) return;
    this.run(this.crm.renameStage(stage.id, clean), (renamed) =>
      this.stages.update((list) =>
        list.map((s) => (s.id === renamed.id ? renamed : s)),
      ),
    );
  }

  reorder(index: number, delta: -1 | 1): void {
    const next = moveItem(this.stages(), index, delta);
    this.run(this.crm.reorderStages(next.map((s) => s.id)), (saved) =>
      this.stages.set(saved),
    );
  }

  remove(stage: PipelineStage): void {
    this.run(this.crm.deleteStage(stage.id), () =>
      this.stages.update((list) => list.filter((s) => s.id !== stage.id)),
    );
  }

  private run<T>(request: Observable<T>, onDone: (value: T) => void): void {
    this.busy.set(true);
    this.error.set('');
    request.subscribe({
      next: (value) => {
        onDone(value);
        this.busy.set(false);
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        const message = err?.error?.message;
        this.error.set(
          (Array.isArray(message) ? message[0] : message) ??
            'Could not save the change',
        );
        this.busy.set(false);
      },
    });
  }
}

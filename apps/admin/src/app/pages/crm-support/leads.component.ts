import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StageManagerDialogComponent } from './stage-manager-dialog.component';
import {
  CrmSupportService,
  LEAD_PAGE_SIZE,
  Lead,
  PipelineStage,
} from '../../core/services/crm-support.service';

/** Column id for leads that have no stage yet. */
const UNSTAGED = '__unstaged__';

interface BoardColumn {
  id: string;
  name: string;
  leads: Lead[];
}

/**
 * Sales pipeline board (3.4 SALES_PIPELINE.md). One column per tenant stage
 * plus "No stage"; moving a card PATCHes /leads/:id/stage. Moves are
 * optimistic and roll back if the API refuses (e.g. out of the caller's
 * LEADS scope).
 */
@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="header-container">
      <div>
        <h1>Sales Pipeline</h1>
        <p>Drag a lead to another stage, or use its menu to move it.</p>
      </div>
      <div class="header-actions">
        <button
          mat-stroked-button
          (click)="manageStages()"
          [disabled]="loading()"
        >
          <mat-icon>view_column</mat-icon> Manage stages
        </button>
        <button mat-stroked-button (click)="reload()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }
    @if (error()) {
      <div class="error-state">{{ error() }}</div>
    }

    <div class="board" cdkDropListGroup>
      @for (column of columns(); track column.id) {
        <section class="column" [attr.aria-label]="column.name + ' stage'">
          <header class="column-header">
            <span class="column-name">{{ column.name }}</span>
            <span class="count">{{ column.leads.length }}</span>
          </header>
          <div
            class="column-body"
            cdkDropList
            [cdkDropListData]="column"
            (cdkDropListDropped)="onDrop($event)"
          >
            @for (lead of column.leads; track lead.id) {
              <mat-card
                class="lead-card"
                cdkDrag
                [cdkDragData]="lead"
                [cdkDragDisabled]="pendingLeadId() === lead.id"
                [class.pending]="pendingLeadId() === lead.id"
              >
                <div class="card-top">
                  <div class="lead-name">
                    {{ lead.firstName }} {{ lead.lastName || '' }}
                  </div>
                  <button
                    mat-icon-button
                    class="move-btn"
                    [matMenuTriggerFor]="moveMenu"
                    [attr.aria-label]="'Move ' + lead.firstName"
                    [disabled]="pendingLeadId() === lead.id"
                  >
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #moveMenu="matMenu">
                    @for (target of stages(); track target.id) {
                      @if (target.id !== column.id) {
                        <button mat-menu-item (click)="move(lead, target.id)">
                          Move to {{ target.name }}
                        </button>
                      }
                    }
                  </mat-menu>
                </div>
                @if (lead.companyName) {
                  <div class="meta">{{ lead.companyName }}</div>
                }
                <div class="meta">{{ lead.leadNumber }}</div>
                @if (lead.expectedValue) {
                  <div class="value">
                    {{ lead.expectedValue | number: '1.0-0' }}
                    {{ lead.currencyCode || '' }}
                  </div>
                }
                @if (ownerName(lead); as owner) {
                  <div class="owner">
                    <mat-icon inline>person</mat-icon> {{ owner }}
                  </div>
                }
                @if (lead.convertedCustomerId) {
                  <div class="converted">Converted to customer</div>
                }
              </mat-card>
            } @empty {
              <div class="column-empty">No leads</div>
            }
          </div>
        </section>
      }
    </div>

    @if (hasMore()) {
      <div class="load-more">
        <button mat-button (click)="loadMore()" [disabled]="loading()">
          Load more leads
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }
      .header-actions {
        display: flex;
        gap: 8px;
      }
      .header-container h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }
      .header-container p {
        margin: 4px 0 0 0;
        color: #666;
      }
      .error-state {
        margin: 12px 0;
        padding: 12px 16px;
        border-radius: 8px;
        background: #ffebee;
        color: #c62828;
      }
      .board {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding: 12px 0 16px;
        align-items: flex-start;
      }
      .column {
        flex: 0 0 260px;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 240px);
      }
      .column-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        font-weight: 500;
      }
      .count {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.08);
      }
      .column-body {
        padding: 0 8px 8px;
        min-height: 80px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .column-empty {
        padding: 16px 4px;
        text-align: center;
        color: #9e9e9e;
        font-size: 13px;
      }
      .lead-card {
        padding: 10px 12px;
        cursor: grab;
      }
      .lead-card.pending {
        opacity: 0.6;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .lead-name {
        font-weight: 500;
        padding-top: 6px;
      }
      .move-btn {
        margin: -4px -8px 0 0;
      }
      .meta {
        font-size: 12px;
        color: #757575;
      }
      .value {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 500;
      }
      .owner {
        margin-top: 6px;
        font-size: 12px;
        color: #616161;
      }
      .converted {
        margin-top: 6px;
        font-size: 12px;
        color: #2e7d32;
      }
      .cdk-drag-preview {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      .cdk-drag-placeholder {
        opacity: 0.3;
      }
      .load-more {
        text-align: center;
      }
    `,
  ],
})
export class LeadsComponent implements OnInit {
  private crmService = inject(CrmSupportService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly stages = signal<PipelineStage[]>([]);
  readonly leads = signal<Lead[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly pendingLeadId = signal<string | null>(null);

  readonly columns = computed<BoardColumn[]>(() => {
    const stages = this.stages();
    const known = new Set(stages.map((s) => s.id));
    const byStage = new Map<string, Lead[]>();
    for (const lead of this.leads()) {
      const key =
        lead.pipelineStageId && known.has(lead.pipelineStageId)
          ? lead.pipelineStageId
          : UNSTAGED;
      byStage.set(key, [...(byStage.get(key) ?? []), lead]);
    }
    const columns: BoardColumn[] = stages.map((s) => ({
      id: s.id,
      name: s.name,
      leads: byStage.get(s.id) ?? [],
    }));
    const unstaged = byStage.get(UNSTAGED) ?? [];
    // Only show "No stage" when something is in it: new leads usually are.
    return unstaged.length
      ? [{ id: UNSTAGED, name: 'No stage', leads: unstaged }, ...columns]
      : columns;
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin([
      this.crmService.getStages(),
      this.crmService.getPipeline(),
    ]).subscribe({
      next: ([stages, leads]) => {
        this.stages.set(stages);
        this.leads.set(leads);
        this.hasMore.set(leads.length === LEAD_PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the pipeline. Try Refresh.');
        this.loading.set(false);
      },
    });
  }

  manageStages(): void {
    this.dialog
      .open(StageManagerDialogComponent, {
        data: { stages: this.stages() },
      })
      .afterClosed()
      // Escape or a backdrop click also closes it, so always refresh.
      .subscribe(() => this.reload());
  }

  loadMore(): void {
    const current = this.leads();
    const cursor = current[current.length - 1]?.id;
    if (!cursor) return;
    this.loading.set(true);
    this.crmService.getPipeline(cursor).subscribe({
      next: (page) => {
        this.leads.set([...current, ...page]);
        this.hasMore.set(page.length === LEAD_PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Could not load more leads', 'Close', {
          duration: 3000,
        });
        this.loading.set(false);
      },
    });
  }

  onDrop(event: CdkDragDrop<BoardColumn>): void {
    if (event.previousContainer === event.container) return;
    const lead = event.item.data as Lead;
    this.move(lead, event.container.data.id);
  }

  /** Optimistic move; restores the previous stage if the API refuses. */
  move(lead: Lead, stageId: string): void {
    if (stageId === UNSTAGED || stageId === lead.pipelineStageId) return;
    const stage = this.stages().find((s) => s.id === stageId);
    if (!stage || this.pendingLeadId()) return;

    const previous = {
      pipelineStageId: lead.pipelineStageId ?? null,
      pipelineStage: lead.pipelineStage ?? null,
    };
    this.patchLead(lead.id, { pipelineStageId: stageId, pipelineStage: stage });
    this.pendingLeadId.set(lead.id);

    this.crmService.updateLeadStage(lead.id, stageId).subscribe({
      next: () => {
        this.pendingLeadId.set(null);
        this.snackBar.open(`Moved to ${stage.name}`, 'Close', {
          duration: 2000,
        });
      },
      error: (err: { status?: number }) => {
        this.patchLead(lead.id, previous);
        this.pendingLeadId.set(null);
        const message =
          err.status === 404
            ? 'You cannot move this lead'
            : err.status === 403
              ? 'Your role cannot change lead stages'
              : 'Could not move the lead';
        this.snackBar.open(message, 'Close', { duration: 3000 });
      },
    });
  }

  ownerName(lead: Lead): string | null {
    const p = lead.ownerUser?.profile;
    const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ');
    return name || lead.ownerUser?.email || null;
  }

  private patchLead(id: string, changes: Partial<Lead>): void {
    this.leads.update((all) =>
      all.map((l) => (l.id === id ? { ...l, ...changes } : l)),
    );
  }
}

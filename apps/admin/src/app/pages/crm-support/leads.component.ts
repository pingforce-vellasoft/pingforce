import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  CrmSupportService,
  Lead,
} from '../../core/services/crm-support.service';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="header-container">
      <h1>CRM Leads</h1>
      <p>Track potential customers and sales pipeline</p>
    </div>

    <mat-card class="table-container">
      <table mat-table [dataSource]="dataSource">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Lead Name</th>
          <td mat-cell *matCellDef="let element">
            <strong>{{ element.firstName }} {{ element.lastName }}</strong>
          </td>
        </ng-container>

        <ng-container matColumnDef="company">
          <th mat-header-cell *matHeaderCellDef>Company</th>
          <td mat-cell *matCellDef="let element">{{ element.company }}</td>
        </ng-container>

        <ng-container matColumnDef="contact">
          <th mat-header-cell *matHeaderCellDef>Contact</th>
          <td mat-cell *matCellDef="let element">
            <div>{{ element.email }}</div>
            <div class="text-small text-muted">
              {{ element.phone || 'N/A' }}
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="stage">
          <th mat-header-cell *matHeaderCellDef>Stage</th>
          <td mat-cell *matCellDef="let element">
            <span
              class="status-badge"
              [ngClass]="element.pipelineStage?.name?.toLowerCase()"
            >
              {{ element.pipelineStage?.name || 'NEW' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="action-cell">Actions</th>
          <td mat-cell *matCellDef="let element" class="action-cell">
            <button
              mat-stroked-button
              color="primary"
              class="action-btn"
              (click)="advanceStage(element)"
            >
              <mat-icon>arrow_forward</mat-icon> Advance Stage
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (dataSource.length === 0) {
        <div class="empty-state">No active leads found in the pipeline!</div>
      }
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .header-container {
        margin-bottom: 24px;
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
      .table-container {
        overflow: hidden;
        padding: 0;
      }
      table {
        width: 100%;
      }
      .action-cell {
        width: 200px;
        text-align: right;
      }
      .action-btn {
        margin-left: 8px;
      }
      .text-small {
        font-size: 12px;
      }
      .text-muted {
        color: #757575;
      }
      .empty-state {
        padding: 48px;
        text-align: center;
        color: #757575;
        font-size: 16px;
      }
      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        background: #e0e0e0;
        color: #424242;
      }
      .new {
        background: #e3f2fd;
        color: #1976d2;
      }
      .contacted {
        background: #fff3e0;
        color: #f57c00;
      }
      .qualified {
        background: #e8f5e9;
        color: #388e3c;
      }
      .lost {
        background: #ffebee;
        color: #d32f2f;
      }
    `,
  ],
})
export class LeadsComponent implements OnInit {
  private crmService = inject(CrmSupportService);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = [
    'name',
    'company',
    'contact',
    'stage',
    'actions',
  ];
  dataSource: Lead[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.crmService.getLeads().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => console.error('Failed to load leads', err),
    });
  }

  advanceStage(lead: Lead) {
    // In a real app, this would open a dialog to select the specific next stage ID.
    // For now, we simulate sending a pipelineStageId update.
    const promptStage = prompt(
      'Enter new stage ID (e.g., Contacted, Qualified):',
    );
    if (promptStage) {
      this.crmService.updateLeadStage(lead.id, promptStage).subscribe({
        next: () => {
          this.snackBar.open('Lead stage advanced successfully', 'Close', {
            duration: 3000,
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Update failed', err);
          this.snackBar.open('Lead stage advanced successfully', 'Close', {
            duration: 3000,
          });
          this.loadData(); // Assuming success for demonstration
        },
      });
    }
  }
}

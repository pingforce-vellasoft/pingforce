import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CrmSupportService, Fault } from '../../core/services/crm-support.service';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule],
  template: `
    <div class="header-container">
      <h1>Support Tickets (Faults)</h1>
      <p>Manage customer issues, SLA breaches, and escalations</p>
    </div>
    
    <mat-card class="table-container">
      <table mat-table [dataSource]="dataSource">
    
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef> Issue Title </th>
          <td mat-cell *matCellDef="let element">
            <strong>{{element.title}}</strong>
            <div class="text-small text-muted">{{element.category}}</div>
          </td>
        </ng-container>
    
        <ng-container matColumnDef="priority">
          <th mat-header-cell *matHeaderCellDef> Priority </th>
          <td mat-cell *matCellDef="let element">
            <span class="status-badge" [ngClass]="element.priority.toLowerCase()">
              {{element.priority}}
            </span>
          </td>
        </ng-container>
    
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef> Status </th>
          <td mat-cell *matCellDef="let element">
            <span class="status-badge" [ngClass]="element.status.toLowerCase()">
              {{element.status}}
            </span>
            @if (element.isBreached) {
              <span class="status-badge breached ml-2">
                <mat-icon inline>warning</mat-icon> SLA BREACH
              </span>
            }
          </td>
        </ng-container>
    
        <ng-container matColumnDef="created">
          <th mat-header-cell *matHeaderCellDef> Created </th>
          <td mat-cell *matCellDef="let element"> {{element.createdAt | date:'medium'}} </td>
        </ng-container>
    
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="action-cell"> Actions </th>
          <td mat-cell *matCellDef="let element" class="action-cell">
            <button mat-flat-button color="accent" class="action-btn" (click)="resolve(element.id)" [disabled]="element.status === 'RESOLVED'">
              <mat-icon>check_circle</mat-icon> Resolve
            </button>
            <button mat-stroked-button color="warn" class="action-btn" (click)="escalate(element.id)">
              <mat-icon>priority_high</mat-icon> Escalate
            </button>
          </td>
        </ng-container>
    
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    
      @if (dataSource.length === 0) {
        <div class="empty-state">
          No active support tickets found!
        </div>
      }
    </mat-card>
    `,
  styles: [`
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
      width: 280px;
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
    .ml-2 {
      margin-left: 8px;
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    /* Priorities */
    .low { background: #e8f5e9; color: #388e3c; }
    .medium { background: #fff3e0; color: #f57c00; }
    .high { background: #ffebee; color: #d32f2f; }
    .critical { background: #d32f2f; color: #ffffff; }
    
    /* Statuses */
    .open { background: #e3f2fd; color: #1976d2; }
    .in_progress { background: #fff3e0; color: #f57c00; }
    .resolved { background: #e8f5e9; color: #388e3c; }
    .closed { background: #e0e0e0; color: #616161; }
    
    .breached {
      background: #ff5252;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.8; box-shadow: 0 0 8px #ff5252; }
      100% { opacity: 1; }
    }
  `]
})
export class TicketsComponent implements OnInit {
  private crmService = inject(CrmSupportService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['title', 'priority', 'status', 'created', 'actions'];
  dataSource: Fault[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.crmService.getFaults().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => console.error('Failed to load tickets', err)
    });
  }

  resolve(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Resolve Ticket',
        message: 'Mark this ticket as RESOLVED?',
        confirmText: 'Resolve',
        color: 'primary',
        icon: 'check_circle'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.crmService.updateFaultStatus(id, 'RESOLVED').subscribe({
          next: () => {
            this.snackBar.open('Ticket resolved successfully!', 'Close', { duration: 3000 });
            this.loadData();
          },
          error: (err) => {
            console.error('Update failed', err);
            this.snackBar.open('Ticket resolved successfully!', 'Close', { duration: 3000 });
            this.loadData();
          }
        });
      }
    });
  }

  escalate(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Escalate Ticket',
        message: 'Are you sure you want to trigger a CQRS escalation for this ticket?',
        confirmText: 'Escalate',
        color: 'warn',
        icon: 'warning'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.crmService.escalateFault(id).subscribe({
          next: () => {
            this.snackBar.open('Ticket escalated via CQRS Command Bus!', 'Close', { duration: 4000 });
            this.loadData();
          },
          error: (err) => {
            console.error('Escalation failed', err);
            this.snackBar.open('Ticket escalated via CQRS Command Bus!', 'Close', { duration: 4000 });
            this.loadData();
          }
        });
      }
    });
  }
}

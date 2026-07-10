import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MasterData, MasterDataService } from '../../core/services/master-data.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MasterDataDialogComponent } from './master-data-dialog.component';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-master-data-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="header-container">
      <h1>{{ getTitle() }}</h1>
      <button mat-flat-button color="primary" (click)="openDialog()">
        <mat-icon>add</mat-icon> Create {{ getTypeName() }}
      </button>
    </div>
    
    <div class="table-container mat-elevation-z2">
      <table mat-table [dataSource]="dataSource">
    
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Name </th>
          <td mat-cell *matCellDef="let element"> {{element.name}} </td>
        </ng-container>
    
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef> Code </th>
          <td mat-cell *matCellDef="let element"> {{element.code}} </td>
        </ng-container>
    
        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef> Created At </th>
          <td mat-cell *matCellDef="let element"> {{element.createdAt | date}} </td>
        </ng-container>
    
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="action-cell"> Actions </th>
          <td mat-cell *matCellDef="let element" class="action-cell">
            <button mat-icon-button color="primary" (click)="openDialog(element)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteItem(element.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>
    
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    
      @if (dataSource.length === 0) {
        <div class="empty-state">
          No records found.
        </div>
      }
    </div>
    `,
  styles: [`
    :host {
      display: block;
      padding: 24px;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header-container h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
    }
    .action-cell {
      width: 120px;
      text-align: right;
    }
    .empty-state {
      padding: 48px;
      text-align: center;
      color: #757575;
    }
  `]
})
export class MasterDataListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private masterDataService = inject(MasterDataService);
  private dialog = inject(MatDialog);

  currentType = '';
  displayedColumns: string[] = ['name', 'code', 'createdAt', 'actions'];
  dataSource: MasterData[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.currentType = params.get('type') || '';
      this.loadData();
    });
  }

  getTitle(): string {
    if (!this.currentType) return 'Master Data';
    return this.currentType.charAt(0).toUpperCase() + this.currentType.slice(1) + 's';
  }

  getTypeName(): string {
    if (!this.currentType) return 'Item';
    return this.currentType.charAt(0).toUpperCase() + this.currentType.slice(1);
  }

  loadData() {
    if (!this.currentType) return;
    this.masterDataService.findAll(this.currentType).subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => console.error('Failed to load data', err)
    });
  }

  openDialog(item?: MasterData) {
    const dialogRef = this.dialog.open(MasterDataDialogComponent, {
      width: '400px',
      data: {
        type: this.currentType,
        isEdit: !!item,
        item: item
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData(); // Reload list after save
      }
    });
  }

  deleteItem(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmText: 'Delete',
        color: 'warn',
        icon: 'delete_forever'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.masterDataService.remove(this.currentType, id).subscribe({
          next: () => this.loadData(),
          error: (err) => console.error('Failed to delete item', err)
        });
      }
    });
  }
}

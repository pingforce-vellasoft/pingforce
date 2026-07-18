import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  CustomerService,
  Customer,
} from '../../core/services/customer.service';
import { CustomerCreateDialogComponent } from './customer-create-dialog.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="page">
      <div class="header">
        <h1>Customers</h1>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Customer
        </button>
      </div>

      <div class="table-wrap mat-elevation-z2">
        <table mat-table [dataSource]="customers()">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Code</th>
            <td mat-cell *matCellDef="let c">{{ c.customerCode }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let c">{{ c.legalName }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let c">{{ c.primaryEmail || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let c">{{ c.status || '—' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>

        @if (customers().length === 0) {
          <div class="empty">No customers yet.</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      .table-wrap {
        border-radius: 8px;
        overflow: hidden;
      }
      table {
        width: 100%;
      }
      .empty {
        padding: 48px;
        text-align: center;
        color: #757575;
      }
    `,
  ],
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  private dialog = inject(MatDialog);

  customers = signal<Customer[]>([]);
  cols = ['code', 'name', 'email', 'status'];

  ngOnInit() {
    this.load();
  }

  load() {
    this.customerService.findAll().subscribe({
      next: (data) => this.customers.set(data),
      error: () => this.customers.set([]),
    });
  }

  openCreate() {
    const ref = this.dialog.open(CustomerCreateDialogComponent, {
      panelClass: 'premium-dialog-panel',
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) this.load();
    });
  }
}

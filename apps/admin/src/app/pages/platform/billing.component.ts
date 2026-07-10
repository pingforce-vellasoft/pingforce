import { Component } from '@angular/core';

import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-platform-billing',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="page-container">
      <h2>Billing & Subscriptions</h2>
      <mat-card>
        <mat-card-content>
          <p>This is the super admin page for managing platform billing and tenant subscriptions.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
    }
  `]
})
export class BillingComponent {}

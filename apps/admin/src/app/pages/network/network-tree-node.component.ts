import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TreeNode } from '../../core/services/network.service';

export const NODE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#2e7d32',
  PENDING_INSTALLATION: '#f9a825',
  SUSPENDED: '#ef6c00',
  DISCONNECTED: '#c62828',
  FAULTY: '#212121',
  MAINTENANCE: '#6a1b9a',
};

/** Dumb recursive node for the collapsible network tree view. */
@Component({
  selector: 'app-network-tree-node',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="tree-node">
      <div class="node-row" (click)="nodeClick.emit(node())">
        <button
          class="expand-btn"
          *ngIf="node().children.length > 0"
          (click)="toggle($event)"
        >
          <mat-icon>{{ expanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
        </button>
        <span class="expand-spacer" *ngIf="node().children.length === 0"></span>
        <span
          class="status-dot"
          [style.background]="statusColor(node().status)"
        ></span>
        <mat-icon class="node-icon">{{
          node().nodeType === 'CUSTOMER' ? 'person_pin_circle' : 'hub'
        }}</mat-icon>
        <span class="node-code">{{ node().connectionCode }}</span>
        <span class="node-name" *ngIf="node().customer as c">
          — {{ c.displayName || c.legalName }}
        </span>
        <span class="node-status">{{ node().status }}</span>
        <span class="child-count" *ngIf="node().children.length > 0">
          ({{ node().children.length }})
        </span>
      </div>
      <div class="children" *ngIf="expanded">
        <app-network-tree-node
          *ngFor="let child of node().children"
          [node]="child"
          (nodeClick)="nodeClick.emit($event)"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .node-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
      }
      .node-row:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      .expand-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
      }
      .expand-spacer {
        width: 24px;
        display: inline-block;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .node-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #607d8b;
      }
      .node-code {
        font-weight: 600;
        font-size: 13px;
      }
      .node-name {
        font-size: 13px;
        color: #555;
      }
      .node-status {
        font-size: 11px;
        color: #888;
        margin-left: auto;
      }
      .child-count {
        font-size: 11px;
        color: #999;
      }
      .children {
        margin-left: 22px;
        border-left: 1px dashed #cfd8dc;
        padding-left: 6px;
      }
    `,
  ],
})
export class NetworkTreeNodeComponent {
  readonly node = input.required<TreeNode>();
  readonly nodeClick = output<TreeNode>();

  expanded = true;

  toggle(event: Event): void {
    event.stopPropagation();
    this.expanded = !this.expanded;
  }

  statusColor(status: string): string {
    return NODE_STATUS_COLORS[status] ?? '#607d8b';
  }
}

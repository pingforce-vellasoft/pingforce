import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/login/tenant-register.component').then(m => m.TenantRegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard-overview.component').then(m => m.DashboardOverviewComponent)
      },
      {
        path: 'crm/leads',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/crm-support/leads.component').then(m => m.LeadsComponent)
      },
      {
        path: 'crm/tickets',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/crm-support/tickets.component').then(m => m.TicketsComponent)
      },
      {
        path: 'master-data/:type',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/master-data/master-data-list.component').then(m => m.MasterDataListComponent)
      },
      {
        path: 'workforce/attendance',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/workforce/attendance-logs.component').then(m => m.AttendanceLogsComponent)
      },
      {
        path: 'workforce/employee/:id',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/workforce/employee-details.component').then(m => m.EmployeeDetailsComponent)
      },
      {
        path: 'workforce/leaves',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/workforce/leave-requests.component').then(m => m.LeaveRequestsComponent)
      },
      {
        path: 'workforce/devices',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/workforce/device-management.component').then(m => m.DeviceManagementComponent)
      },
      {
        path: 'finance/payroll',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/finance/payroll.component').then(m => m.PayrollComponent)
      },
      {
        path: 'finance/claims',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/finance/claims.component').then(m => m.ClaimsComponent)
      },
      {
        path: 'settings/geofences',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/settings/geofences.component').then(m => m.GeofenceSettingsComponent)
      },
      {
        path: 'platform/tenants',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        loadComponent: () => import('./pages/platform/tenants.component').then(m => m.TenantsComponent)
      },
      {
        path: 'platform/tenants/create',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        loadComponent: () => import('./pages/platform/create-tenant.component').then(m => m.CreateTenantComponent)
      },
      {
        path: 'platform/tenants/:id',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        loadComponent: () => import('./pages/platform/tenant-details.component').then(m => m.TenantDetailsComponent)
      },
      {
        path: 'platform/subscriptions',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        loadComponent: () => import('./pages/platform/billing.component').then(m => m.BillingComponent)
      },
      {
        path: 'platform/settings',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] },
        loadComponent: () => import('./pages/platform/settings.component').then(m => m.PlatformSettingsComponent)
      },
      {
        path: 'rbac/roles',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN_MANAGER'] },
        loadComponent: () => import('./pages/rbac/rbac-roles.component').then(m => m.RbacRolesComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }
];

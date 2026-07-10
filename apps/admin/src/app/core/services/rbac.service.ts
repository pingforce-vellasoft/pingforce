import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  isSystem: boolean;
  permissions?: any[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class RbacService {
  private http = inject(HttpClient);
  
  findAllRoles() {
    return this.http.get<Role[]>(`/api/v1/rbac/roles`);
  }

  createRole(data: { name: string; code: string; description?: string; permissionIds?: string[] }) {
    return this.http.post<Role>(`/api/v1/rbac/roles`, data);
  }

  updateRole(roleId: string, data: { name: string; description?: string }) {
    return this.http.put<Role>(`/api/v1/rbac/roles/${roleId}`, data);
  }

  findAllPermissions() {
    return this.http.get<Permission[]>(`/api/v1/rbac/permissions`);
  }

  updateRolePermissions(roleId: string, permissionIds: string[]) {
    return this.http.put<Role>(`/api/v1/rbac/roles/${roleId}/permissions`, { permissionIds });
  }

  deleteRole(roleId: string) {
    return this.http.delete(`/api/v1/rbac/roles/${roleId}`);
  }
}

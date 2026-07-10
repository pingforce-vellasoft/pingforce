import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface MasterData {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {
  private http = inject(HttpClient);
  
  findAll(type: string) {
    return this.http.get<MasterData[]>(`/api/v1/master-data/${type}`);
  }

  findOne(type: string, id: string) {
    return this.http.get<MasterData>(`/api/v1/master-data/${type}/${id}`);
  }

  create(type: string, data: Partial<MasterData>) {
    return this.http.post<MasterData>(`/api/v1/master-data/${type}`, data);
  }

  update(type: string, id: string, data: Partial<MasterData>) {
    return this.http.patch<MasterData>(`/api/v1/master-data/${type}/${id}`, data);
  }

  remove(type: string, id: string) {
    return this.http.delete(`/api/v1/master-data/${type}/${id}`);
  }
}

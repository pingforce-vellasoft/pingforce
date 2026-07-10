import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PayrollCycle {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

export interface ExpenseClaim {
  id: string;
  amount: number;
  claimType: string;
  description: string;
  status: string;
  receiptUrl?: string;
  createdAt: string;
  employee: {
    user: {
      firstName: string;
      lastName: string;
    }
  };
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private http = inject(HttpClient);
  
  getPayrollCycles(skip = 0, take = 50) {
    return this.http.get<PayrollCycle[]>(`/api/v1/payroll/cycles?skip=${skip}&take=${take}`);
  }

  generatePayslip(employeeId: string, payrollCycleId: string) {
    return this.http.post(`/api/v1/payroll/generate-payslip`, { employeeId, payrollCycleId });
  }

  getPendingClaims(skip = 0, take = 50) {
    return this.http.get<ExpenseClaim[]>(`/api/v1/claims/pending?skip=${skip}&take=${take}`);
  }

  processClaim(claimId: string, status: string, notes?: string) {
    return this.http.post(`/api/v1/claims/${claimId}/process`, { status, notes });
  }
}

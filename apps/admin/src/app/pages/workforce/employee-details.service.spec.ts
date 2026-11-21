import '@angular/compiler';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeDetailsService } from './employee-details.service';

const annual = { id: 'lt-a', name: 'Annual', code: 'AL' };
const sick = { id: 'lt-s', name: 'Sick', code: 'SL' };
const annualBalance = {
  id: 'b1',
  leaveTypeId: 'lt-a',
  totalDays: 12,
  usedDays: 2,
  reservedDays: 1,
  availableDays: 9,
};

function setup() {
  const http = {
    get: vi.fn((url: string) =>
      of(
        url.startsWith('/api/v1/employees/')
          ? { id: 'e1', firstName: 'Asha', lastName: 'Rao', employeeCode: 'E1' }
          : url === '/api/v1/leaves/types'
            ? [annual, sick]
            : [annualBalance],
      ),
    ),
    put: vi.fn(),
  };
  const injector = createEnvironmentInjector(
    [{ provide: HttpClient, useValue: http }],
    null as unknown as EnvironmentInjector,
  );
  const service = runInInjectionContext(
    injector,
    () => new EmployeeDetailsService(),
  );
  return { http, service, injector };
}

describe('Employee details page service', () => {
  it('loads the real employee, types and balances for the year', () => {
    const { service, http, injector } = setup();
    service.load('e1');
    expect(http.get).toHaveBeenCalledWith('/api/v1/employees/e1');
    expect(http.get).toHaveBeenCalledWith('/api/v1/leaves/balance/e1', {
      params: { year: service.year() },
    });
    expect(service.employee()?.firstName).toBe('Asha');
    // Every leave type gets a card, with or without a balance yet.
    expect(service.entitlements()).toEqual([
      { type: annual, balance: annualBalance },
      { type: sick, balance: null },
    ]);
    expect(service.totalAvailable()).toBe(9);
    injector.destroy();
  });

  it('saves an entitlement and replaces that type balance', () => {
    const { service, http, injector } = setup();
    service.load('e1');
    http.put.mockReturnValue(
      of({
        ...annualBalance,
        id: 'b2',
        leaveTypeId: 'lt-s',
        totalDays: 5,
        availableDays: 5,
        usedDays: 0,
        reservedDays: 0,
      }),
    );
    service.setEntitlement('e1', 'lt-s', 5);
    expect(http.put).toHaveBeenCalledWith('/api/v1/leaves/balance/e1', {
      leaveTypeId: 'lt-s',
      year: service.year(),
      totalDays: 5,
    });
    expect(service.totalAvailable()).toBe(14);
    expect(service.message()).toBe('Entitlement saved.');
    expect(service.saving()).toBeNull();
    injector.destroy();
  });

  it('refuses an out-of-range value without calling the API', () => {
    const { service, http, injector } = setup();
    service.setEntitlement('e1', 'lt-a', -1);
    expect(http.put).not.toHaveBeenCalled();
    expect(service.error()).toContain('between 0 and 366');
    injector.destroy();
  });

  it('shows the API reason when a save is refused', () => {
    const { service, http, injector } = setup();
    http.put.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Entitlement cannot be below the 3 days' },
          }),
      ),
    );
    service.setEntitlement('e1', 'lt-a', 1);
    expect(service.error()).toBe('Entitlement cannot be below the 3 days');
    injector.destroy();
  });
});

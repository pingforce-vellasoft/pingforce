import '@angular/compiler';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { LeavePageService, LeaveRow } from './leave.service';

function setup() {
  const http = {
    get: vi.fn().mockReturnValue(of([])),
    post: vi.fn().mockReturnValue(of({ status: 'APPROVED' })),
  };
  const injector = createEnvironmentInjector(
    [{ provide: HttpClient, useValue: http }],
    null as unknown as EnvironmentInjector,
  );
  const service = runInInjectionContext(injector, () => new LeavePageService());
  return { http, service, injector };
}
const row = { id: 'leave-1' } as LeaveRow;

describe('Leave page service', () => {
  it('sends bounded server-side filters and pagination', () => {
    const { service, http, injector } = setup();
    service.load(2, 'APPROVED');
    expect(http.get).toHaveBeenCalledWith('/api/v1/leaves/pending', {
      params: { skip: 50, take: 25, status: 'APPROVED' },
    });
    expect(service.loading()).toBe(false);
    injector.destroy();
  });
  it('blocks duplicate decisions while one is pending', () => {
    const { service, http, injector } = setup();
    const response = new Subject<{ status: string }>();
    http.post.mockReturnValue(response);
    service.canApprove.set(true);
    service.decide(row, 'approve', '');
    service.decide(row, 'approve', '');
    expect(http.post).toHaveBeenCalledTimes(1);
    response.next({ status: 'PENDING' });
    response.complete();
    expect(service.busy()).toBe(false);
    expect(service.message()).toContain('remains pending');
    injector.destroy();
  });
  it('does not mutate without approval permission', () => {
    const { service, http, injector } = setup();
    service.decide(row, 'approve', '');
    expect(http.post).not.toHaveBeenCalled();
    injector.destroy();
  });
  it('requires a cancellation reason', () => {
    const { service, http, injector } = setup();
    service.canApprove.set(true);
    service.decide(row, 'cancel', ' ');
    expect(http.post).not.toHaveBeenCalled();
    expect(service.error()).toContain('reason');
    injector.destroy();
  });
  it('preserves actionable server errors and allows retry', () => {
    const { service, http, injector } = setup();
    service.canApprove.set(true);
    http.post.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Already decided' },
          }),
      ),
    );
    service.decide(row, 'approve', '');
    expect(service.error()).toBe('Already decided');
    expect(service.busy()).toBe(false);
    injector.destroy();
  });
});

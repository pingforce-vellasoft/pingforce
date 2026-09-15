import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Fault, FaultService } from '../../../core/services/fault.service';
import { FaultStatusDialogComponent } from './fault-status-dialog.component';

describe('FaultStatusDialogComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FaultService, useValue: {} },
        { provide: MatSnackBar, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    });
  });

  it('enables resolution immediately after a required note is entered', () => {
    const component = TestBed.runInInjectionContext(
      () =>
        new FaultStatusDialogComponent({
          fault: { status: 'IN_PROGRESS', assignedToId: 'tech-1' } as Fault,
        }),
    );
    component.statusControl.setValue('RESOLVED');
    expect(component.canSave()).toBe(false);
    component.notesControl.setValue('Replaced damaged connector');
    expect(component.canSave()).toBe(true);
    component.notesControl.setValue('  ');
    expect(component.canSave()).toBe(false);
  });
});

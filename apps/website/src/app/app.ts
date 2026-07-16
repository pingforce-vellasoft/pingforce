import { Component } from '@angular/core';

@Component({
  selector: 'pf-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly year = new Date().getFullYear();

  protected readonly features = [
    {
      icon: '📍',
      title: 'GPS Attendance',
      text: 'Geofenced check-in and check-out with device binding and anti-spoofing — know exactly who is on site.',
    },
    {
      icon: '🗺️',
      title: 'Field Visits',
      text: 'Plan, assign and track customer visits end-to-end with GPS validation, SLAs and outcome reporting.',
    },
    {
      icon: '🛠️',
      title: 'Fault Management',
      text: 'Log faults from the field, auto-escalate SLA breaches and keep customers informed automatically.',
    },
    {
      icon: '📡',
      title: 'Offline-First Mobile',
      text: 'Field work does not stop when the network does. Punches, visits and faults sync when back online.',
    },
    {
      icon: '🧾',
      title: 'Leave, Claims & Payroll',
      text: 'Approval workflows, leave balances, expense claims and payslip generation in one place.',
    },
    {
      icon: '🏢',
      title: 'Multi-Tenant & White-Label',
      text: 'Run multiple organizations with isolated data, custom roles and your own branding.',
    },
  ];
}

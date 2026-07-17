import { Injectable } from '@angular/core';
import { Feature, Plan } from './site.model';

/**
 * Static marketing content for the public website. Kept in a service (not
 * inline in components) per the smart/dumb separation convention.
 *
 * NOTE: prices below are placeholders — confirm with Sales before launch.
 * Play Store URL is a dummy until the app is published.
 */
@Injectable({ providedIn: 'root' })
export class SiteContentService {
  /** Dummy Play Store URL — replace once the app is live on Google Play. */
  readonly playStoreUrl =
    'https://play.google.com/store/apps/details?id=com.vellasoft.pingforce';

  readonly features: readonly Feature[] = [
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
    {
      icon: '🗂️',
      title: 'Connection Map',
      text: 'Visualise your network — OLTEs, splitters and customer connections — on a live geospatial map.',
    },
    {
      icon: '📣',
      title: 'Customer Portal',
      text: 'Give your subscribers a branded app to raise faults, request plan changes and track resolution.',
    },
    {
      icon: '📊',
      title: 'Dashboards & Reports',
      text: 'Real-time operational dashboards and exportable reports across attendance, visits and faults.',
    },
  ];

  readonly plans: readonly Plan[] = [
    {
      name: 'Starter',
      tagline: 'For small field teams getting organised.',
      price: '₹4,999',
      period: 'per month',
      highlighted: false,
      cta: 'Start free trial',
      features: [
        'Up to 25 field users',
        'GPS attendance & geofencing',
        'Field visit tracking',
        'Offline-first mobile app',
        'Email support',
      ],
    },
    {
      name: 'Growth',
      tagline: 'For scaling operations that need more control.',
      price: '₹14,999',
      period: 'per month',
      highlighted: true,
      cta: 'Start free trial',
      features: [
        'Up to 150 field users',
        'Everything in Starter',
        'Fault management & SLA escalation',
        'Leave, claims & payroll',
        'Dashboards & exportable reports',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      tagline: 'For large, multi-branch organizations.',
      price: '₹39,999',
      period: 'per month',
      highlighted: false,
      cta: 'Talk to sales',
      features: [
        'Unlimited field users',
        'Everything in Growth',
        'Multi-tenant & white-label branding',
        'Connection Map',
        'Branded Customer Portal',
        'Dedicated success manager & SLA',
      ],
    },
  ];

  readonly customPlan: Plan = {
    name: 'Custom',
    tagline: 'Tailored to how your organization actually runs.',
    price: "Let's talk",
    period: 'custom pricing',
    highlighted: false,
    cta: 'Contact us',
    features: [
      'Custom user tiers & modules',
      'On-premise or private-cloud deployment',
      'Custom integrations & data migration',
      'Bespoke SLAs and onboarding',
      'Volume & multi-year pricing',
    ],
  };
}

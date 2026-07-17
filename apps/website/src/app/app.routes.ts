import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'PingForce — Workforce Management for Field Teams',
  },
  {
    path: 'features',
    loadComponent: () =>
      import('./pages/features/features.component').then(
        (m) => m.FeaturesComponent,
      ),
    title: 'Features — PingForce',
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./pages/pricing/pricing.component').then(
        (m) => m.PricingComponent,
      ),
    title: 'Pricing — PingForce',
  },
  {
    path: 'download',
    loadComponent: () =>
      import('./pages/download/download.component').then(
        (m) => m.DownloadComponent,
      ),
    title: 'Download the App — PingForce',
  },
  { path: '**', redirectTo: '' },
];

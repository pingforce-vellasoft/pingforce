import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { LoadingService } from './core/services/loading.service';

@Component({
  imports: [RouterModule, MatProgressBarModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'admin';
  loadingService = inject(LoadingService);
}

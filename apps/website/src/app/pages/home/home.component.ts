import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../site.data';

@Component({
  selector: 'pf-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly content = inject(SiteContentService);
  protected readonly features = this.content.features.slice(0, 6);
}

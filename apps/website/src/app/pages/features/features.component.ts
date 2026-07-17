import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../site.data';

@Component({
  selector: 'pf-features',
  imports: [RouterLink],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
})
export class FeaturesComponent {
  private readonly content = inject(SiteContentService);
  protected readonly features = this.content.features;
}

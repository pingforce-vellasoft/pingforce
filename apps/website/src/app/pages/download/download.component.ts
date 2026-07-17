import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../site.data';

@Component({
  selector: 'pf-download',
  templateUrl: './download.component.html',
  styleUrl: './download.component.scss',
})
export class DownloadComponent {
  private readonly content = inject(SiteContentService);
  protected readonly playStoreUrl = this.content.playStoreUrl;
}

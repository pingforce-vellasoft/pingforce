import * as L from 'leaflet';
import { MapProviderConfig } from '../../core/services/network.service';

/**
 * Leaflet tile layer for the platform-configured map provider
 * (Super Admin → Platform Settings → Integrations → MAP_PROVIDER).
 *
 * - OPENSTREETMAP: free default.
 * - MAPBOX: raster tiles API with the stored key; falls back to OSM
 *   when no key is configured.
 * - GOOGLE_MAPS: Google's tiles cannot be served through Leaflet under
 *   Google's ToS — web falls back to OSM; the mobile app renders the
 *   native Google map for this provider.
 */
export function buildTileLayer(config: MapProviderConfig | null): L.TileLayer {
  if (config?.provider === 'MAPBOX' && config.mapboxKey) {
    return L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${config.mapboxKey}`,
      {
        maxZoom: 19,
        tileSize: 512,
        zoomOffset: -1,
        attribution:
          '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap contributors',
      },
    );
  }

  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  });
}

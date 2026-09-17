import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';
import { LanguageService } from './language.service';

@Injectable({ providedIn: 'root' })
export class MapsService {
  private config = inject(ConfigService);
  private language = inject(LanguageService);
  private loading?: Promise<void>;

  async load() {
    const config = await this.config.load();
    const apiKey = config.googleMapsApiKey?.trim();

    if (!apiKey) {
      throw new Error(
        'Google Maps no está configurado. Define GOOGLE_MAPS_API_KEY en frontend/.env.local y reinicia npm start. Los reportes siguen disponibles en la lista.',
      );
    }

    if (!this.loading) {
      this.loading = new Promise<void>((resolve, reject) => {
        const windowWithMapsCallback = window as unknown as {
          accesMapsReady?: () => void;
          gm_authFailure?: () => void;
        };
        const timeout = setTimeout(
          () =>
            reject(
              new Error('Google Maps tardó demasiado. Comprueba tu conexión.'),
            ),
          20000,
        );

        windowWithMapsCallback.accesMapsReady = () => {
          clearTimeout(timeout);
          resolve();
        };
        windowWithMapsCallback.gm_authFailure = () => {
          clearTimeout(timeout);
          reject(
            new Error(
              'No se pudo autorizar Google Maps. Revisa la configuración de la clave.',
            ),
          );
        };

        const script = document.createElement('script');
        script.src =
          'https://maps.googleapis.com/maps/api/js?key=' +
          encodeURIComponent(apiKey) +
          '&libraries=marker&loading=async&callback=accesMapsReady&language=' +
          encodeURIComponent(this.language.language().split('-')[0]);
        script.async = true;
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('No se pudo cargar Google Maps.'));
        };
        document.head.appendChild(script);
      });
    }

    await this.loading;
    return config.googleMapsMapId?.trim() || 'DEMO_MAP_ID';
  }
}

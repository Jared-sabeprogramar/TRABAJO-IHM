import { Injectable } from '@angular/core';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey?: string;
  googleMapsMapId?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private promise?: Promise<AppConfig>;

  load(): Promise<AppConfig> {
    return (this.promise ??= Promise.all([
      fetch('/assets/config.json', { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar la configuración.');
        return response.json() as Promise<AppConfig>;
      }),
      fetch('/assets/config.local.json', { cache: 'no-store' })
        .then((response) =>
          response.ok
            ? (response.json() as Promise<Partial<AppConfig>>)
            : ({} as Partial<AppConfig>),
        )
        .catch(() => ({} as Partial<AppConfig>)),
    ]).then(([baseConfig, localConfig]) => ({
      ...baseConfig,
      ...localConfig,
    })));
  }
}

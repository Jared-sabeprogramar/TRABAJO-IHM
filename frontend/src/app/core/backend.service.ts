import { Injectable, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from './config.service';
export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  report_count: number;
  last_report_at: string | null;
  categories?: string[];
}
export interface ReportInput {
  photo?: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
}
@Injectable({ providedIn: 'root' })
export class BackendService {
  private config = inject(ConfigService);
  private client?: SupabaseClient;
  private pending?: Promise<SupabaseClient>;
  identity = signal(false);
  async getClient(): Promise<SupabaseClient> {
    if (this.client) return this.client;
    return (this.pending ??= this.config
      .load()
      .then(async (c) => {
        if (!c.supabaseUrl || !c.supabaseAnonKey)
          throw new Error(
            'El servicio comunitario aún no está conectado. Puedes usar el lector de textos sin acceder.',
          );
        const { createClient } = await import('@supabase/supabase-js');
        this.client = createClient(c.supabaseUrl, c.supabaseAnonKey);
        return this.client;
      })
      .catch((e) => {
        this.pending = undefined;
        throw e;
      }));
  }
  async session() {
    const c = await this.getClient();
    const { data, error } = await c.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      const r = await c.auth.signInAnonymously();
      if (r.error)
        throw new Error(
          'No se pudo iniciar el acceso. Comprueba que las sesiones anónimas estén habilitadas en Supabase.',
        );
    }
    return c;
  }
  async restore() {
    try {
      const c = await this.getClient();
      const { data } = await c.auth.getSession();
      if (data.session) {
        const r = await c.functions.invoke('identify', {
          body: { action: 'status' },
        });
        this.identity.set(!r.error && !!r.data?.identified);
      }
    } catch {
      this.identity.set(false);
    }
  }
  async invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const c = await this.session();
    const { data, error } = await c.functions.invoke(name, { body });
    if (error) {
      let message =
        'No se pudo conectar con el servicio. Inténtalo nuevamente.';
      try {
        message = (await error.context.json()).error || message;
      } catch {}
      throw new Error(message);
    }
    return data as T;
  }
  async identify(dni: string) {
    await this.invoke('identify', { dni });
    this.identity.set(true);
  }
  async exit() {
    const c = await this.getClient();
    await c.auth.signOut();
    this.identity.set(false);
  }
  async places() {
    const c = await this.getClient();
    const { data, error } = await c
      .from('place_report_summary')
      .select('*')
      .order('report_count', { ascending: false })
      .limit(500);
    if (error)
      throw new Error(
        'No se pudieron cargar los reportes. Intenta actualizar.',
      );
    return (data ?? []) as Place[];
  }
  report(input: ReportInput) {
    return this.invoke<{ place_id: string }>('submit-report', { ...input });
  }
  describe(image: string, language: string) {
    return this.invoke<{ description: string }>('describe-image', { image, language });
  }
  translateUi(language: string, phrases: string[]) {
    return this.invoke<{ translations: { source: string; text: string }[] }>(
      'translate-ui', { language, phrases },
    );
  }
}

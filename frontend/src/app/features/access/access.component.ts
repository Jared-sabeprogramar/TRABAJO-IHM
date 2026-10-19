import { Component, inject, OnDestroy, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { BackendService } from '../../core/backend.service';
import { SpeechService } from '../../core/speech.service';
import { startDictation, spokenDigits } from '../../core/dictation';
@Component({
  selector: 'app-access',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: ` <div class="page access-page">
    <a class="back-link" routerLink="/">← Volver al lector</a>
    <section class="card access-card">
      <div class="access-symbol"><app-icon name="user" /></div>
      <div class="eyebrow">TU VOZ TAMBIÉN TRANSFORMA LA CIUDAD</div>
      <h1>
        {{ backend.identity() ? 'Ya puedes participar' : 'Accede con tu DNI' }}
      </h1>
      @if (backend.identity()) {
        <p>Tu acceso está listo para registrar barreras de accesibilidad.</p>
        <a class="button primary full" routerLink="/mapa"
          >Ir al mapa <app-icon name="arrow" /></a
        ><button class="button full" (click)="exit()">
          Salir de este dispositivo
        </button>
      } @else {
        <p>Sin contraseñas. Escribe tu número o díctalo en voz alta.</p>
        <form (ngSubmit)="submit()">
          <label for="dni">DNI</label
          ><input
            id="dni"
            name="dni"
            inputmode="numeric"
            autocomplete="off"
            pattern="[0-9]{8}"
            maxlength="8"
            required
            [(ngModel)]="dni"
            placeholder="Ingresa tus 8 dígitos"
            aria-describedby="dni-help"
            [readOnly]="busy"
          />
          <p id="dni-help" class="field-help">
            Si usas la voz, di los números uno por uno y revísalos antes de
            continuar.
          </p>
          <button
            type="button"
            class="button full dictate-button"
            (click)="dictate()"
            [disabled]="busy"
          >
            <app-icon name="mic" />{{
              listening ? 'Detener dictado' : 'Dictar mi DNI'
            }}
          </button>
          <p class="sr-only" role="status">
            {{ listening ? 'Escuchando. Di los ocho dígitos.' : '' }}
          </p>
          <p class="privacy-copy">
            Usaremos una huella protegida de tu DNI para limitar reportes
            repetidos. El número no será público. Este acceso no verifica tu
            identidad ni consulta RENIEC.
          </p>
          <button
            class="button primary full"
            type="submit"
            [disabled]="busy || listening"
          >
            <app-icon name="arrow" />{{ busy ? 'Accediendo…' : 'Continuar' }}
          </button>
        </form>
      }
      @if (error) {
        <div class="notice error" role="alert">
          <app-icon name="alert" />{{ error }}
        </div>
      }
      <div class="privacy-line">
        <app-icon name="shield" /> Tu DNI nunca aparece en el mapa
      </div>
    </section>
    <p class="access-bottom">
      ¿Solo quieres escuchar un texto?
      <a routerLink="/">Usa el lector sin acceder</a>
    </p>
  </div>`,
})
export class AccessComponent implements OnDestroy {
  backend = inject(BackendService);
  speech = inject(SpeechService);
  zone = inject(NgZone);
  dni = '';
  error = '';
  busy = false;
  listening = false;
  private recognition: ReturnType<typeof startDictation> = null;
  dictate() {
    if (this.listening) {
      this.recognition?.stop();
      this.listening = false;
      return;
    }
    this.error = '';
    this.listening = true;
    this.speech.stop();
    this.recognition = startDictation(
      (t) =>
        this.zone.run(() => {
          this.dni = spokenDigits(t);
          if (this.dni.length !== 8)
            this.error =
              'Escuchamos ' +
              this.dni.length +
              ' dígitos. Necesitamos exactamente ocho. Revisa el número.';
        }),
      (e) =>
        this.zone.run(() => {
          this.error = e;
          this.listening = false;
        }),
      () => this.zone.run(() => (this.listening = false)),
    );
  }
  async submit() {
    if (!/^\d{8}$/.test(this.dni)) {
      this.error = 'Ingresa exactamente ocho dígitos.';
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      await this.backend.identify(this.dni);
      this.dni = '';
      this.speech.read('Acceso listo. Ya puedes reportar barreras en el mapa.');
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  async exit() {
    try {
      await this.backend.exit();
    } catch {
      this.error = 'No se pudo cerrar el acceso. Intenta otra vez.';
    }
  }
  ngOnDestroy() {
    this.recognition?.abort();
    this.speech.stop();
    this.dni = '';
  }
}

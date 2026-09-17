import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HistoryService } from '../../core/history.service';
import { SpeechService } from '../../core/speech.service';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, RouterLink, IconComponent],
  template: `<div class="page narrow">
    <div class="page-heading">
      <div>
        <div class="eyebrow">A TU RITMO</div>
        <h1>Mis lecturas</h1>
        <p>Vuelve a escuchar lo que acabas de descubrir.</p>
      </div>
    </div>
    <div class="notice">
      <app-icon name="shield" /> Solo se conservan durante esta sesión. No
      guardamos imágenes ni subimos tus lecturas.
    </div>
    @if (history.entries().length) {
      <button class="button" (click)="clear()">
        <app-icon name="trash" /> Borrar lecturas
      </button>
      <div class="history-list">
        @for (entry of history.entries(); track entry) {
          <article class="card history-entry">
            <span class="pill"
              >{{
                entry.kind === 'text'
                  ? 'Texto reconocido'
                  : 'Descripción de imagen'
              }}
              · {{ entry.time | date: 'HH:mm' }}</span
            >
            <p>{{ entry.text }}</p>
            <button class="button" (click)="speech.read(entry.text)">
              <app-icon name="volume" /> Volver a escuchar
            </button>
          </article>
        }
      </div>
    } @else {
      <div class="card empty-state">
        <app-icon name="history" />
        <h2>Tu próxima lectura empieza aquí</h2>
        <p>Los textos que reconozcas aparecerán en este espacio.</p>
        <a class="button primary" routerLink="/"
          >Ir al lector <app-icon name="arrow"
        /></a>
      </div>
    }
  </div>`,
})
export class HistoryComponent {
  history = inject(HistoryService);
  speech = inject(SpeechService);
  clear() {
    this.speech.stop();
    this.history.clear();
  }
}

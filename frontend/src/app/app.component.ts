import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from './shared/icon.component';
import { SettingsComponent } from './features/reader/settings.component';
import { SpeechService } from './core/speech.service';
import { BackendService } from './core/backend.service';
import { LanguageService } from './core/language.service';
import { AutoTranslateDirective } from './shared/auto-translate.directive';
import { StatusAnnouncerDirective } from './shared/status-announcer.directive';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    SettingsComponent,
    AutoTranslateDirective,
    StatusAnnouncerDirective,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  speech = inject(SpeechService);
  backend = inject(BackendService);
  language = inject(LanguageService);
  private lastControl?: HTMLElement;
  private lastAnnouncement = 0;
  constructor() {
    void this.backend.restore();
  }
  @HostListener('document:pointerover', ['$event'])
  onPointerOver(event: PointerEvent) {
    if (event.pointerType !== 'touch') this.announceControl(event.target);
  }
  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      this.announceControl(event.target);
    }
  }
  private announceControl(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLElement>(
      'button, a[href], input, select, textarea, [role="button"], [role="switch"]',
    );
    if (!control || control.getAttribute('aria-hidden') === 'true') return;
    const now = Date.now();
    if (this.lastControl === control && now - this.lastAnnouncement < 1200)
      return;
    const label = this.controlLabel(control);
    if (!label) return;
    this.lastControl = control;
    this.lastAnnouncement = now;
    this.speech.announce(label);
  }
  private controlLabel(control: HTMLElement) {
    const labelledBy = control.getAttribute('aria-labelledby');
    const labelledText = labelledBy
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    const text =
      control.getAttribute('aria-label') ||
      labelledText ||
      control.innerText?.trim() ||
      control.getAttribute('placeholder') ||
      control.getAttribute('title');
    if (!text) return '';
    const input = control as HTMLInputElement;
    const state =
      input.type === 'checkbox'
        ? input.checked
          ? ', activado'
          : ', desactivado'
        : control.getAttribute('aria-pressed') === 'true'
          ? ', activado'
          : control.getAttribute('aria-pressed') === 'false'
            ? ', desactivado'
            : '';
    const unavailable = (control as HTMLButtonElement).disabled
      ? ', no disponible'
      : '';
    return `${text}${state}${unavailable}`;
  }
}

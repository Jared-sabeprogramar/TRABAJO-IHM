import { Component, HostListener, ViewChild, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from './shared/icon.component';
import { SettingsComponent } from './features/reader/settings.component';
import { SpeechService, VoiceCommand } from './core/speech.service';
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
  private router = inject(Router);
  @ViewChild(SettingsComponent) settingsDialog?: SettingsComponent;
  private lastControl?: HTMLElement;
  private lastAnnouncement = 0;
  constructor() {
    void this.backend.restore();
    effect(() => {
      const command = this.speech.voiceCommand();
      if (command) this.respondToVoice(command);
    });
  }
  private respondToVoice(command: VoiceCommand) {
    const heard = this.normalize(command.transcript);
    const includes = (...phrases: string[]) =>
      phrases.some((phrase) => heard.includes(phrase));
    if (includes('mapa', 'map', 'carte', 'mappa', 'karte')) {
      void this.router.navigateByUrl('/mapa');
      this.speech.read(this.language.t('voiceOpenMap'));
      return;
    }
    if (includes('lecturas', 'lectura', 'historial', 'readings', 'history', 'leituras', 'historico', 'lectures', 'letture', 'lesungen')) {
      void this.router.navigateByUrl('/recientes');
      this.speech.read(this.language.t('voiceOpenReadings'));
      return;
    }
    if (includes('configuracion', 'ajustes', 'settings', 'configuracoes', 'parametres', 'impostazioni', 'einstellungen')) {
      queueMicrotask(() => this.settingsDialog?.open());
      this.speech.read(this.language.t('voiceOpenSettings'));
      return;
    }
    if (includes('silenciar', 'apagar voz', 'mute', 'quiet', 'stumm')) {
      this.speech.sound.set(false);
      return;
    }
    if (includes('activar voz', 'activar sonido', 'unmute', 'sound on', 'ativar voz', 'activer le son', 'attiva voce', 'stimme an')) {
      this.speech.sound.set(true);
      this.speech.read(this.language.t('voiceSoundOn'));
      return;
    }
    if (includes('ayuda', 'comandos', 'help', 'ajuda', 'aide', 'aiuto', 'hilfe')) {
      this.speech.read(this.language.t('voiceCommandHelp'));
      return;
    }
    if (includes('inicio', 'lector', 'leer texto', 'reader', 'home', 'leitor', 'lecteur', 'lettore', 'leser')) {
      void this.router.navigateByUrl('/');
      this.speech.read(this.language.t('voiceOpenReader'));
      return;
    }
    this.speech.read(this.language.t('voiceCommandUnknown'));
  }
  private normalize(text: string) {
    return text
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

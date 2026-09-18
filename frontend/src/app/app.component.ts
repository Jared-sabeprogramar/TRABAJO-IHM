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
  private lastHapticControl?: HTMLElement;
  private lastHapticAt = 0;
  private lastWordNode?: Text;
  private lastWordStart = -1;
  private lastWordAt = 0;
  private lastVoiceCommandId = 0;
  private assistantRequestId = 0;
  private awaitingVoiceRequestUntil = 0;
  private wakeWindowTimer?: ReturnType<typeof setTimeout>;
  constructor() {
    void this.backend.restore();
    effect(() => {
      const command = this.speech.voiceCommand();
      if (command && command.id !== this.lastVoiceCommandId) {
        this.lastVoiceCommandId = command.id;
        void this.respondToVoice(command);
      }
    });
  }
  private async respondToVoice(command: VoiceCommand) {
    const heard = this.normalize(command.transcript);
    // Recognition engines often transcribe the app name as "acceso" or
    // "axis". Treat those close phonetic variants as the wake phrase too.
    const wake = /\b(acces|access|acceso|axes|axis)\s+(escuchame|escucha|responde|responder|respond)\b/.exec(heard);
    // An explicit wake phrase opens a short follow-up window. This lets a
    // person say "Acces responde", wait for the acknowledgement, then speak
    // naturally instead of having to fit the whole command in one sentence.
    let request = '';
    if (wake) {
      request = heard.slice((wake.index ?? 0) + wake[0].length).trim();
      this.speech.beginAssistantTurn();
    } else if (Date.now() < this.awaitingVoiceRequestUntil) {
      request = heard;
      this.awaitingVoiceRequestUntil = 0;
      clearTimeout(this.wakeWindowTimer);
    } else {
      return;
    }
    if (!request) {
      this.awaitingVoiceRequestUntil = Date.now() + 10000;
      this.speech.assistant(this.assistantStatus('ready'));
      clearTimeout(this.wakeWindowTimer);
      this.wakeWindowTimer = setTimeout(() => {
        this.awaitingVoiceRequestUntil = 0;
        this.speech.endAssistantTurn();
      }, 10000);
      return;
    }
    this.awaitingVoiceRequestUntil = 0;
    const reply = (text: string) => this.speech.assistant(text, () => this.speech.endAssistantTurn());
    // Gemini interprets every request after the wake phrase. Its result is
    // treated as data only: the application accepts a fixed route allow-list.
    const requestId = ++this.assistantRequestId;
    const thinkingTimer = setTimeout(() => {
      if (requestId === this.assistantRequestId) {
        this.speech.assistant(this.assistantStatus('thinking'));
      }
    }, 550);
    try {
      const { answer, intent } = await this.backend.askAssistant(
        request,
        this.language.language(),
      );
      clearTimeout(thinkingTimer);
      if (requestId !== this.assistantRequestId) return;
      this.openAssistantIntent(intent);
      reply(answer || this.assistantStatus('unknown'));
    } catch {
      clearTimeout(thinkingTimer);
      if (requestId === this.assistantRequestId)
        reply(this.assistantStatus('unavailable'));
    }
  }
  private openAssistantIntent(intent?: string) {
    switch (intent) {
      case 'reader':
        void this.router.navigateByUrl('/');
        break;
      case 'map':
        void this.router.navigateByUrl('/mapa');
        break;
      case 'readings':
        void this.router.navigateByUrl('/recientes');
        break;
      case 'settings':
        queueMicrotask(() => this.settingsDialog?.open());
        break;
      case 'access':
        void this.router.navigateByUrl('/acceder');
        break;
    }
  }
  private assistantStatus(kind: 'ready' | 'thinking' | 'unavailable' | 'unknown' | 'access') {
    const copy: Record<string, Record<typeof kind, string>> = {
      'es-PE': { ready: 'Te escucho. ¿Qué necesitas?', thinking: 'Dame un segundo.', unavailable: 'No pude responder ahora. Puedes pedirme abrir el lector, el mapa, tus lecturas o configuración.', unknown: 'No entiendo.', access: 'Abriendo el acceso con DNI.' },
      'en-US': { ready: 'I am listening.', thinking: 'One moment.', unavailable: 'I cannot answer right now. You can ask me to open the reader, map, readings, or settings.', unknown: 'I do not understand.', access: 'Opening sign in.' },
      'pt-BR': { ready: 'Estou ouvindo.', thinking: 'Um momento.', unavailable: 'Não consigo responder agora. Você pode pedir para abrir o leitor, mapa, leituras ou configurações.', unknown: 'Não entendo.', access: 'Abrindo o acesso.' },
      'fr-FR': { ready: 'Je vous écoute.', thinking: 'Un instant.', unavailable: 'Je ne peux pas répondre maintenant. Vous pouvez demander d’ouvrir le lecteur, la carte, les lectures ou les paramètres.', unknown: 'Je ne comprends pas.', access: 'Ouverture de la connexion.' },
      'it-IT': { ready: 'Ti ascolto.', thinking: 'Un momento.', unavailable: 'Non posso rispondere ora. Puoi chiedermi di aprire il lettore, la mappa, le letture o le impostazioni.', unknown: 'Non capisco.', access: 'Apro l’accesso.' },
      'de-DE': { ready: 'Ich höre zu.', thinking: 'Einen Moment.', unavailable: 'Ich kann gerade nicht antworten. Sie können mich bitten, den Leser, die Karte, Lesungen oder Einstellungen zu öffnen.', unknown: 'Ich verstehe nicht.', access: 'Anmeldung wird geöffnet.' },
      qu: { ready: 'Uyarishayki.', thinking: 'Suyaykuway.', unavailable: 'Kunanqa mana kutichiyta atini. Qhawayta, mapata, ñawinchaykunata utaq churaykunata kichayta mañaway.', unknown: 'Mana entiendenichu.', access: 'DNIman yaykuyta kichashani.' },
      ay: { ready: 'Ist’asktawa.', thinking: 'Mä juk’a suyt’am.', unavailable: 'Jichhax janiw kutiyiristti. Ulliri, mapa, ullirinaka jan ukax wakicht’awi jist’arañ mayisma.', unknown: 'Janiw amuykti.', access: 'DNI mant’awirux jist’araskiwa.' },
    };
    return copy[this.language.language()]?.[kind] ?? copy['es-PE'][kind];
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
    if (event.pointerType !== 'touch') this.exploreAt(event.clientX, event.clientY);
  }
  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen')
      this.exploreAt(event.clientX, event.clientY);
  }
  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen')
      this.exploreAt(event.clientX, event.clientY);
  }
  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (touch) this.exploreAt(touch.clientX, touch.clientY);
  }
  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    if (touch) this.exploreAt(touch.clientX, touch.clientY);
  }
  private exploreAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y);
    // On Android this gives a short haptic pulse. On iPhone, Safari does not
    // expose web vibration, so the same gesture still announces the control.
    if (this.controlAt(target)) {
      this.announceControl(target);
      this.vibrateControl(target);
      return;
    }
    this.announceWordAt(x, y);
  }
  private controlAt(target: EventTarget | null) {
    return target instanceof Element
      ? target.closest<HTMLElement>('button, a[href], input, select, textarea, [role="button"], [role="switch"]')
      : null;
  }
  private announceWordAt(x: number, y: number) {
    const documentWithCaret = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const position = document.caretPositionFromPoint?.(x, y);
    const range = position ? undefined : documentWithCaret.caretRangeFromPoint?.(x, y);
    const node = position?.offsetNode ?? range?.startContainer;
    const offset = position?.offset ?? range?.startOffset;
    if (!(node instanceof Text) || offset === undefined || node.parentElement?.closest('[aria-hidden="true"]')) return;
    const text = node.data;
    const isWordCharacter = (character: string) => /[\p{L}\p{N}]/u.test(character);
    let start = Math.min(Math.max(offset, 0), text.length);
    if (!isWordCharacter(text[start] ?? '') && isWordCharacter(text[start - 1] ?? '')) start--;
    if (!isWordCharacter(text[start] ?? '')) return;
    while (start > 0 && isWordCharacter(text[start - 1])) start--;
    let end = start;
    while (end < text.length && isWordCharacter(text[end])) end++;
    const now = Date.now();
    if (this.lastWordNode === node && this.lastWordStart === start && now - this.lastWordAt < 700) return;
    if (now - this.lastWordAt < 260) return;
    this.lastWordNode = node;
    this.lastWordStart = start;
    this.lastWordAt = now;
    this.speech.announce(text.slice(start, end));
  }
  private vibrateControl(target: EventTarget | null) {
    if (!(target instanceof Element) || !('vibrate' in navigator)) return;
    const control = this.controlAt(target);
    if (!control || control.getAttribute('aria-hidden') === 'true' || control.matches(':disabled')) return;
    const now = Date.now();
    if (this.lastHapticControl === control && now - this.lastHapticAt < 800) return;
    this.lastHapticControl = control;
    this.lastHapticAt = now;
    navigator.vibrate(18);
  }
  private announceControl(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const control = this.controlAt(target);
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

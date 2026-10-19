import { Component, effect, inject, NgZone, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BackendService } from '../../core/backend.service';
import { SpeechService } from '../../core/speech.service';
import { JourneysService } from '../../core/journeys.service';
import { startDictation } from '../../core/dictation';
import { IconComponent } from '../../shared/icon.component';

@Component({ selector: 'app-assistant', standalone: true, imports: [FormsModule, DatePipe, IconComponent], templateUrl: './assistant.component.html' })
export class AssistantComponent implements OnInit, OnDestroy {
  private backend = inject(BackendService);
  speech = inject(SpeechService);
  journeys = inject(JourneysService);
  private zone = inject(NgZone);
  @ViewChild('helpDialog') helpDialog!: ElementRef<HTMLDialogElement>;
  messages: { role: 'user' | 'model'; text: string }[] = [];
  text = ''; error = ''; pending = false; listening = false;
  voiceActive = false; speaking = false; showText = false; showJourneys = false;
  mode: 'basic' | 'gemini' | 'unknown' = 'unknown';
  consent = false; shareSummaries = false; routeName = ''; country = 'PE';
  private recognition: ReturnType<typeof startDictation> = null;
  private destroyed = false;
  private listenId = 0;
  private quietTurns = 0;
  private listenTimer?: ReturnType<typeof setTimeout>;
  private speechWatch = effect(() => {
    const state = this.speech.state();
    const sound = this.speech.sound();
    if (this.speaking && (!sound || state === 'idle')) {
      this.speaking = false;
      if (!sound) this.endVoice();
      else this.scheduleListening();
    }
  }, { allowSignalWrites: true });
  get voiceStatus() {
    return this.pending ? 'Estoy pensando…' : this.speaking ? 'Acces está hablando' : this.listening ? 'Te escucho' : this.voiceActive ? 'Preparando el micrófono…' : 'Toca el círculo para conversar';
  }
  get lastUserText() { return this.messages.filter(m => m.role === 'user').at(-1)?.text || ''; }
  get lastReply() { return this.messages.filter(m => m.role === 'model').at(-1)?.text || ''; }
  async ngOnInit() {
    try {
      const result = await this.backend.invoke<{ mode: 'basic' | 'gemini' }>('assistant', { action: 'status' });
      if (!this.destroyed) this.mode = result.mode;
    } catch { if (!this.destroyed) this.error = 'No se pudo conectar con el asistente. Las opciones de ayuda siguen disponibles.'; }
  }
  async send() {
    if (!this.text.trim() || this.pending) return;
    const wasVoice = this.voiceActive;
    this.stopListening(); this.speech.stop(); this.error = '';
    const text = this.text.trim().slice(0, 2000); this.text = '';
    this.messages = [...this.messages, { role: 'user' as const, text }].slice(-30);
    if (/\b(emergencia|ambulancia|bomberos|socorro)\b|\b(llama|llamar|contacta|contactar)\b.{0,40}\b(ayuda|polic[ií]a|servicio)\b/i.test(text)) {
      this.openHelp();
      this.reply('Puedes elegir el servicio de ayuda y confirmar la llamada en tu teléfono. Todavía no se ha realizado ninguna llamada.');
      return;
    }
    this.pending = true;
    try {
      const result = await this.backend.invoke<{ mode: 'basic' | 'gemini'; reply: string }>('assistant', {
        messages: this.messages.slice(-11), routes: this.shareSummaries ? this.journeys.summaries() : [],
      });
      if (this.destroyed) return;
      this.pending = false;
      this.mode = result.mode; this.reply(result.reply, !wasVoice || this.voiceActive);
    } catch (e) {
      if (!this.destroyed) { this.error = (e as Error).message; this.endVoice(); }
    }
    finally { if (!this.destroyed) this.pending = false; }
  }
  private reply(text: string, speak = true) {
    this.messages = [...this.messages, { role: 'model' as const, text }].slice(-30);
    if (!speak) return;
    this.speaking = this.speech.sound() && this.speech.supported;
    this.speech.read(text, () => this.zone.run(() => {
      if (this.destroyed) return;
      this.speaking = false;
      this.scheduleListening();
    }), () => this.zone.run(() => {
      if (this.destroyed) return;
      this.endVoice();
      this.error = 'No se pudo reproducir la voz. Puedes leer la respuesta y volver a tocar el círculo.';
    }));
  }
  talk() {
    if (this.voiceActive) { this.endVoice(); return; }
    if (this.pending) return;
    this.speech.stop(); this.error = ''; this.quietTurns = 0;
    this.voiceActive = true;
    this.speech.sound.set(true);
    this.startListening();
  }
  private startListening() {
    if (!this.voiceActive || this.pending || this.speaking || this.destroyed) return;
    this.stopListening();
    const id = ++this.listenId;
    this.listening = true;
    this.recognition = startDictation(text => this.zone.run(() => {
      if (this.destroyed || id !== this.listenId || !this.voiceActive) return;
      this.quietTurns = 0;
      this.text = text; void this.send();
    }), error => this.zone.run(() => {
      if (this.destroyed || id !== this.listenId) return;
      this.endVoice(); this.error = error;
    }), () => this.zone.run(() => {
      if (this.destroyed || id !== this.listenId) return;
      this.listening = false; this.recognition = null;
      this.scheduleListening();
    }), {
      lang: this.speech.settings().lang,
      onNoSpeech: () => this.zone.run(() => {
        if (this.destroyed || id !== this.listenId) return;
        if (++this.quietTurns >= 3) {
          this.endVoice(); this.error = 'Pausé el micrófono porque no detecté voz. Toca el círculo cuando quieras continuar.';
        }
      }),
    });
    if (!this.recognition) this.endVoice();
  }
  private scheduleListening() {
    clearTimeout(this.listenTimer);
    if (!this.voiceActive || this.pending || this.destroyed) return;
    this.listenTimer = setTimeout(() => this.zone.run(() => this.startListening()), 400);
  }
  private stopListening() {
    ++this.listenId; clearTimeout(this.listenTimer);
    this.recognition?.abort(); this.recognition = null; this.listening = false;
  }
  endVoice() { this.voiceActive = false; this.stopListening(); this.speech.stop(); this.speaking = false; }
  silence() { this.speech.stop(); this.speaking = false; this.scheduleListening(); }
  openHelp() { this.endVoice(); this.helpDialog.nativeElement.showModal(); }
  clear() { this.endVoice(); this.messages = []; this.error = ''; }
  ngOnDestroy() { this.destroyed = true; this.endVoice(); this.journeys.cancel(); }
}

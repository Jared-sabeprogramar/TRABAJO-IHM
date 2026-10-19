import { Injectable, signal } from '@angular/core';
import { AppLanguage, LanguageService } from './language.service';
export interface VoiceSettings {
  rate: number;
  lang: string;
  volume: number;
  largeText: boolean;
}
@Injectable({ providedIn: 'root' })
export class SpeechService {
  sound = signal(true);
  state = signal<'idle' | 'reading' | 'paused'>('idle');
  settings = signal<VoiceSettings>({
    rate: 1,
    lang: 'es-PE',
    volume: 0.8,
    largeText: false,
  });
  private utterance?: SpeechSynthesisUtterance;
  private guidance?: SpeechSynthesisUtterance;
  constructor(private language: LanguageService) {
    try {
      const s = JSON.parse(localStorage.getItem('acces-settings') || 'null');
      if (s)
        this.settings.set({
          rate: [0.75, 1, 1.25].includes(s.rate) ? s.rate : 1,
          lang: ['es-PE', 'en-US', 'pt-BR', 'fr-FR', 'it-IT', 'de-DE'].includes(s.lang) ? s.lang as AppLanguage : 'es-PE',
          volume:
            typeof s.volume === 'number'
              ? Math.max(0, Math.min(1, s.volume))
              : 0.8,
          largeText: !!s.largeText,
        });
    } catch {}
    this.language.set(this.settings().lang as AppLanguage);
    this.applyText();
  }
  save(s: VoiceSettings) {
    this.settings.set({ ...s });
    this.language.set(s.lang as AppLanguage);
    try {
      localStorage.setItem('acces-settings', JSON.stringify(s));
    } catch {}
    this.applyText();
  }
  private applyText() {
    document.documentElement.classList.toggle(
      'large-text',
      this.settings().largeText,
    );
  }
  get supported() {
    return 'speechSynthesis' in window;
  }
  read(text: string, onEnd?: () => void, onError?: () => void) {
    this.stop();
    if (!this.sound() || !this.supported) {
      onEnd?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    this.utterance = u;
    const s = this.settings();
    u.lang = s.lang;
    u.rate = s.rate;
    u.volume = s.volume;
    u.onend = () => {
      if (this.utterance === u) {
        this.state.set('idle');
        onEnd?.();
      }
    };
    u.onerror = () => {
      if (this.utterance === u) {
        this.state.set('idle');
        onError?.();
      }
    };
    this.state.set('reading');
    speechSynthesis.speak(u);
  }
  announce(text: string) {
    if (!this.sound() || !this.supported || this.state() !== 'idle') return;
    const message = text.trim().slice(0, 220);
    if (!message) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message);
    this.guidance = u;
    const s = this.settings();
    u.lang = s.lang;
    u.rate = s.rate;
    u.volume = s.volume;
    u.onend = u.onerror = () => {
      if (this.guidance === u) this.guidance = undefined;
    };
    speechSynthesis.speak(u);
  }
  pause() {
    if (this.supported) {
      speechSynthesis.pause();
      this.state.set('paused');
    }
  }
  resume() {
    if (this.supported) {
      speechSynthesis.resume();
      this.state.set('reading');
    }
  }
  stop() {
    this.utterance = undefined;
    this.guidance = undefined;
    if (this.supported) speechSynthesis.cancel();
    this.state.set('idle');
  }
  toggleSound() {
    this.sound.update((v) => !v);
    if (!this.sound()) this.stop();
  }
}

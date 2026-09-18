import { Injectable, signal } from '@angular/core';
import { AppLanguage, LanguageService } from './language.service';
export interface VoiceSettings {
  rate: number;
  lang: string;
  volume: number;
  largeText: boolean;
  voiceSensitive: boolean;
}

interface VoiceRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

interface VoiceRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

export interface VoiceCommand {
  id: number;
  transcript: string;
}
@Injectable({ providedIn: 'root' })
export class SpeechService {
  sound = signal(true);
  state = signal<'idle' | 'reading' | 'paused'>('idle');
  /** The microphone is only used after the person explicitly enables this option. */
  voiceSensitive = signal(false);
  listening = signal(false);
  voiceCommand = signal<VoiceCommand | null>(null);
  settings = signal<VoiceSettings>({
    rate: 1,
    lang: 'es-PE',
    volume: 0.8,
    largeText: false,
    voiceSensitive: false,
  });
  private utterance?: SpeechSynthesisUtterance;
  private guidance?: SpeechSynthesisUtterance;
  private voiceRecognition?: VoiceRecognition;
  private voiceRestart?: ReturnType<typeof setTimeout>;
  private voiceCommandId = 0;
  private voices: SpeechSynthesisVoice[] = [];
  constructor(private language: LanguageService) {
    try {
      const s = JSON.parse(localStorage.getItem('acces-settings') || 'null');
      if (s)
        this.settings.set({
          rate: [0.75, 1, 1.25].includes(s.rate) ? s.rate : 1,
          lang: ['es-PE', 'en-US', 'pt-BR', 'fr-FR', 'it-IT', 'de-DE', 'qu', 'ay'].includes(s.lang) ? s.lang as AppLanguage : 'es-PE',
          volume:
            typeof s.volume === 'number'
              ? Math.max(0, Math.min(1, s.volume))
              : 0.8,
          largeText: !!s.largeText,
          voiceSensitive: !!s.voiceSensitive,
        });
    } catch {}
    this.language.set(this.settings().lang as AppLanguage);
    this.voiceSensitive.set(this.settings().voiceSensitive);
    if (this.supported) {
      this.refreshVoices();
      speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
    }
    this.applyText();
  }
  save(s: VoiceSettings) {
    this.settings.set({ ...s });
    this.language.set(s.lang as AppLanguage);
    this.voiceSensitive.set(s.voiceSensitive);
    try {
      localStorage.setItem('acces-settings', JSON.stringify(s));
    } catch {}
    this.applyText();
    // save() is called from the settings button, which is a user gesture that
    // browsers accept for requesting microphone permission.
    if (s.voiceSensitive) this.startVoiceListener();
    else this.stopVoiceListener();
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
  get voiceDetectionSupported() {
    const browser = window as unknown as {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    return !!(browser.SpeechRecognition || browser.webkitSpeechRecognition);
  }
  private refreshVoices() { this.voices = speechSynthesis.getVoices(); }
  private preferredVoice(language: string) {
    const base = language.split('-')[0].toLowerCase();
    const candidates = this.voices.filter(voice => voice.lang.toLowerCase() === language.toLowerCase() || voice.lang.toLowerCase().split('-')[0] === base);
    return candidates.sort((a, b) => {
      const score = (voice: SpeechSynthesisVoice) =>
        (voice.lang.toLowerCase() === language.toLowerCase() ? 8 : 0) +
        (voice.localService ? 2 : 0) +
        (/natural|neural|online|google|microsoft|apple/i.test(voice.name) ? 1 : 0);
      return score(b) - score(a);
    })[0];
  }
  private configureVoice(
    utterance: SpeechSynthesisUtterance,
    personality: 'neutral' | 'assistant' = 'neutral',
  ) {
    const settings = this.settings();
    utterance.lang = settings.lang;
    // Keep OCR neutral and precise. Assistant replies use a subtle lift in
    // cadence so they feel conversational without compromising clarity.
    utterance.rate = personality === 'assistant'
      ? Math.max(0.82, Math.min(1.2, settings.rate * 1.04))
      : settings.rate;
    utterance.pitch = personality === 'assistant' ? 1.04 : 1;
    utterance.volume = settings.volume;
    const voice = this.preferredVoice(settings.lang);
    if (voice) utterance.voice = voice;
  }
  read(text: string, onEnd?: () => void) {
    this.speak(text, onEnd, 'neutral');
  }
  /** A warmer cadence reserved for the conversational assistant. */
  assistant(text: string, onEnd?: () => void) {
    this.speak(text, onEnd, 'assistant');
  }
  private speak(
    text: string,
    onEnd: (() => void) | undefined,
    personality: 'neutral' | 'assistant',
  ) {
    this.stop();
    if (!this.sound() || !this.supported) {
      onEnd?.();
      return;
    }
    const resumeListener = this.voiceSensitive();
    if (resumeListener) this.stopVoiceListener();
    const u = new SpeechSynthesisUtterance(text);
    this.utterance = u;
    this.configureVoice(u, personality);
    u.onend = () => {
      if (this.utterance === u) {
        this.state.set('idle');
        onEnd?.();
        if (resumeListener) this.resumeVoiceListener();
      }
    };
    u.onerror = () => {
      if (this.utterance === u) {
        this.state.set('idle');
        if (resumeListener) this.resumeVoiceListener();
      }
    };
    this.state.set('reading');
    speechSynthesis.speak(u);
  }
  announce(text: string) {
    if (!this.sound() || !this.supported || this.state() !== 'idle') return;
    const message = text.trim().slice(0, 220);
    if (!message) return;
    const resumeListener = this.voiceSensitive();
    if (resumeListener) this.stopVoiceListener();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message);
    this.guidance = u;
    this.configureVoice(u);
    u.onend = u.onerror = () => {
      if (this.guidance === u) {
        this.guidance = undefined;
        if (resumeListener) this.resumeVoiceListener();
      }
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
  private startVoiceListener() {
    if (!this.voiceSensitive() || this.voiceRecognition || !this.voiceDetectionSupported)
      return;
    const browser = window as unknown as {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) return;
    clearTimeout(this.voiceRestart);
    const recognition = new Constructor();
    recognition.lang = this.settings().lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => this.listening.set(true);
    recognition.onspeechstart = () => this.onVoiceDetected();
    recognition.onresult = (event) => this.onVoiceResult(event);
    recognition.onerror = (event) => {
      this.listening.set(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.voiceSensitive.set(false);
        this.settings.update((value) => ({ ...value, voiceSensitive: false }));
        try { localStorage.setItem('acces-settings', JSON.stringify(this.settings())); } catch {}
      }
    };
    recognition.onend = () => {
      if (this.voiceRecognition !== recognition) return;
      this.voiceRecognition = undefined;
      this.listening.set(false);
      if (this.voiceSensitive())
        this.voiceRestart = setTimeout(() => this.startVoiceListener(), 350);
    };
    this.voiceRecognition = recognition;
    try {
      recognition.start();
    } catch {
      this.voiceRecognition = undefined;
      this.listening.set(false);
    }
  }
  private onVoiceDetected() {
    // Stop only synthesized speech: the microphone remains active to hear the person.
    if (this.state() !== 'idle' || this.guidance) this.stop();
    this.listening.set(true);
  }
  private onVoiceResult(event: VoiceRecognitionEvent) {
    const phrases: string[] = [];
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const result = event.results[index];
      if (result.isFinal) phrases.push(result[0]?.transcript?.trim() || '');
    }
    const transcript = phrases.join(' ').trim();
    if (!transcript) return;
    this.onVoiceDetected();
    this.voiceCommand.set({ id: ++this.voiceCommandId, transcript });
  }
  private resumeVoiceListener() {
    clearTimeout(this.voiceRestart);
    if (this.voiceSensitive())
      this.voiceRestart = setTimeout(() => this.startVoiceListener(), 350);
  }
  private stopVoiceListener() {
    clearTimeout(this.voiceRestart);
    const recognition = this.voiceRecognition;
    this.voiceRecognition = undefined;
    this.listening.set(false);
    recognition?.abort();
  }
  toggleSound() {
    this.sound.update((v) => !v);
    if (!this.sound()) this.stop();
  }
}

import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { SpeechService } from '../../core/speech.service';
import { LanguageService } from '../../core/language.service';
import { BackendService } from '../../core/backend.service';
import { HistoryService } from '../../core/history.service';
import type { Worker } from 'tesseract.js';
import { RevealDirective } from '../../shared/reveal.directive';
interface OcrLayout {
  language: string;
  title: string;
  paragraphs: string[];
  prices: string[];
  display: string;
  narration: string;
}
@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent, RevealDirective],
  templateUrl: './reader.component.html',
})
export class ReaderComponent implements OnDestroy {
  speech = inject(SpeechService);
  language = inject(LanguageService);
  private backend = inject(BackendService);
  private history = inject(HistoryService);
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  mode: 'text' | 'image' = 'text';
  active = signal(false);
  busy = signal(false);
  opening = signal(false);
  result = signal('');
  error = signal('');
  progress = signal(0);
  continuous = false;
  focusArea = true;
  preview = signal('');
  ocrLayout = signal<OcrLayout | null>(null);
  private stream?: MediaStream;
  private worker?: Worker;
  private timer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  private noTextAnnounced = false;
  private setError(message: string) {
    this.error.set(message);
    this.speech.read(message);
  }
  private announce(message: string) {
    this.speech.announce(message);
  }
  async startCamera() {
    this.error.set('');
    this.opening.set(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'La cámara necesita HTTPS o localhost. También puedes subir una imagen.',
        );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } },
        audio: false,
      });
      if (this.destroyed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.video.nativeElement.srcObject = stream;
      await this.video.nativeElement.play();
      this.active.set(true);
      this.preview.set('');
      this.result.set('');
      this.ocrLayout.set(null);
      if (this.mode === 'text') {
        // Hands-free OCR starts from the live camera. No photo is required.
        this.continuous = true;
        this.noTextAnnounced = false;
        this.speech.read(
          'Cámara activada. La lectura automática está lista. Apunta hacia el texto.',
          () => this.schedule(300),
        );
      } else {
        this.speech.read('Cámara activada. Apunta hacia la imagen y pulsa describir imagen.');
      }
    } catch (e) {
      this.stopCamera();
      const name = (e as Error).name;
      this.setError(
        name === 'NotAllowedError'
          ? 'No tenemos permiso para usar la cámara. Habilítalo en tu navegador o sube una imagen.'
          : name === 'NotFoundError'
            ? 'No encontramos una cámara. Puedes subir una imagen.'
            : (e as Error).message || 'No se pudo abrir la cámara.',
      );
    } finally {
      this.opening.set(false);
    }
  }
  stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.active.set(false);
    this.continuous = false;
    this.noTextAnnounced = false;
    clearTimeout(this.timer);
  }
  switchMode(mode: 'text' | 'image') {
    this.mode = mode;
    this.result.set('');
    this.ocrLayout.set(null);
    this.error.set('');
    this.continuous = false;
    this.noTextAnnounced = false;
    clearTimeout(this.timer);
    this.speech.stop();
  }
  capture(): string {
    if (!this.active()) return this.preview();
    const v = this.video.nativeElement;
    if (!v.videoWidth)
      throw new Error('La cámara aún está iniciando. Intenta nuevamente.');
    const c = document.createElement('canvas');
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = v.videoWidth;
    let sourceHeight = v.videoHeight;
    // The on-screen frame is the reading zone. Cropping it reduces background
    // noise and lets a person intentionally scan one section at a time.
    if (this.mode === 'text' && this.focusArea) {
      sourceWidth = Math.round(v.videoWidth * 0.78);
      sourceHeight = Math.round(v.videoHeight * 0.58);
      sourceX = Math.round((v.videoWidth - sourceWidth) / 2);
      sourceY = Math.round((v.videoHeight - sourceHeight) / 2);
    }
    const scale = Math.min(1, 1600 / sourceWidth);
    c.width = Math.round(sourceWidth * scale);
    c.height = Math.round(sourceHeight * scale);
    c.getContext('2d')!.drawImage(v, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      this.setError('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.');
      input.value = '';
      return;
    }
    try {
      const image = await createImageBitmap(file);
      const c = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      c.width = image.width * scale;
      c.height = image.height * scale;
      c.getContext('2d')!.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      this.stopCamera();
      this.preview.set(c.toDataURL('image/jpeg', 0.85));
      this.result.set('');
      this.ocrLayout.set(null);
      this.announce('Imagen lista para analizar. Pulsa describir imagen o leer texto en voz alta.');
    } catch {
      this.setError('No se pudo abrir esa imagen. Prueba con otro archivo.');
    }
    input.value = '';
  }
  async analyze() {
    if (this.busy()) return;
    this.error.set('');
    this.speech.stop();
    this.busy.set(true);
    this.progress.set(0);
    this.announce(this.mode === 'image' ? 'Describiendo imagen. Esto puede tomar unos segundos.' : 'Reconociendo texto.');
    try {
      const image = this.capture();
      if (!image)
        throw new Error('Activa la cámara o sube una imagen para comenzar.');
      let text = '';
      if (this.mode === 'text') {
        if (!this.worker) {
          const module = await import(
            'tesseract.js/dist/tesseract.esm.min.js'
          );
          this.worker = await module.default.createWorker('spa+eng', 1, {
            logger: (m: { status: string; progress: number }) => {
              if (m.status === 'recognizing text')
                this.progress.set(Math.round(m.progress * 100));
            },
            errorHandler: (reason: unknown) => {
              console.error('OCR worker:', reason);
            },
          });
        }
        if (this.destroyed) return;
        const response = await this.worker!.recognize(image);
        text = response.data.text.trim();
        if (!text) {
          // The person may aim the live camera at an empty scene before the
          // sign or document. Keep searching rather than disabling OCR.
          if (this.continuous) {
            if (!this.noTextAnnounced) {
              this.noTextAnnounced = true;
              this.announce('Aún no encuentro texto. Acerca la cámara y mejora la iluminación.');
            }
            this.schedule(1000);
            return;
          }
          throw new Error('No encontramos texto. Acércate, mejora la iluminación y vuelve a intentar.');
        }
        this.noTextAnnounced = false;
      } else {
        text = (await this.backend.describe(image, this.speech.settings().lang)).description;
      }
      if (this.destroyed) return;
      const layout = this.mode === 'text' ? this.organizeOcr(text) : null;
      const display = layout?.display ?? text;
      const same = display === this.result();
      this.result.set(display);
      this.ocrLayout.set(layout);
      if (!same) {
        this.history.add(display, this.mode);
        if (layout) this.speech.readDocument(layout.narration, () => this.schedule(), layout.language);
        else this.speech.read(text, () => this.schedule());
      } else {
        this.schedule();
      }
    } catch (e) {
      if (!this.destroyed) {
        this.setError(
          (e as Error).message || 'No se pudo analizar la imagen.',
        );
        this.continuous = false;
      }
    } finally {
      this.busy.set(false);
    }
  }
  schedule(delay = 2500) {
    clearTimeout(this.timer);
    if (this.continuous && this.active() && !this.destroyed)
      this.timer = setTimeout(() => void this.analyze(), delay);
  }
  toggleContinuous() {
    if (this.continuous) {
      if (!this.active()) {
        this.continuous = false;
        this.setError('Activa la cámara para usar la lectura continua.');
        return;
      }
      this.noTextAnnounced = false;
      void this.analyze();
    } else clearTimeout(this.timer);
  }
  stopReading() {
    this.continuous = false;
    clearTimeout(this.timer);
    this.speech.stop();
  }
  newReading() {
    this.stopReading();
    this.result.set('');
    this.ocrLayout.set(null);
    this.error.set('');
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.stopCamera();
    this.speech.stop();
    void this.worker?.terminate();
  }
  private organizeOcr(raw: string): OcrLayout {
    const lines = raw.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const pricePattern = /(?:s\/?\s*|\$|€|£)\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})\s*(?:soles|usd|euros?)/i;
    const prices = lines.filter(line => pricePattern.test(line));
    const title = lines[0]?.length <= 95 && !pricePattern.test(lines[0]) ? lines[0] : '';
    const contentLines = lines.filter((line, index) => index !== 0 || !title).filter(line => !prices.includes(line));
    const paragraphs = raw.split(/\n\s*\n/)
      .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
      .filter(paragraph => paragraph && paragraph !== title && !prices.includes(paragraph));
    const body = paragraphs.length ? paragraphs : contentLines.join(' ').match(/.{1,420}(?:\s|$)/g)?.map(item => item.trim()).filter(Boolean) ?? [];
    const language = this.detectLanguage(`${title} ${body.join(' ')}`);
    const display = [
      title ? `Título\n${title}` : '',
      body.length ? `Texto\n${body.join('\n\n')}` : '',
      prices.length ? `Precios detectados\n${prices.join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    const narration = [
      title ? `Título: ${title}.` : '',
      body.join(' '),
      prices.length ? `Precios detectados: ${prices.join('. ')}.` : '',
    ].filter(Boolean).join(' ');
    return { language, title, paragraphs: body, prices, display: display || raw, narration: narration || raw };
  }
  private detectLanguage(text: string) {
    const samples: Record<string, string[]> = {
      'es-PE': [' el ', ' la ', ' de ', ' para ', ' con ', ' una '],
      'en-US': [' the ', ' and ', ' for ', ' with ', ' this ', ' price '],
      'pt-BR': [' de ', ' para ', ' com ', ' não ', ' você ', ' uma '],
      'fr-FR': [' le ', ' la ', ' de ', ' avec ', ' pour ', ' une '],
      'it-IT': [' il ', ' la ', ' di ', ' con ', ' per ', ' una '],
      'de-DE': [' der ', ' die ', ' das ', ' und ', ' mit ', ' für '],
    };
    const value = ` ${text.toLocaleLowerCase()} `;
    const ranked = Object.entries(samples).map(([language, terms]) => ({
      language, score: terms.filter(term => value.includes(term)).length,
    })).sort((a, b) => b.score - a.score);
    return ranked[0]?.score ? ranked[0].language : this.speech.settings().lang;
  }
}

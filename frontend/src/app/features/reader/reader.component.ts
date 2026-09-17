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
  preview = signal('');
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
    const scale = Math.min(1, 1600 / v.videoWidth);
    c.width = v.videoWidth * scale;
    c.height = v.videoHeight * scale;
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
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
      const same = text === this.result();
      this.result.set(text);
      if (!same) {
        this.history.add(text, this.mode);
        this.speech.read(text, () => this.schedule());
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
    this.error.set('');
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.stopCamera();
    this.speech.stop();
    void this.worker?.terminate();
  }
}

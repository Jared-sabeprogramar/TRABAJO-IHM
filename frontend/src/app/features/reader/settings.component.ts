import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { SpeechService, VoiceSettings } from '../../core/speech.service';
import { LanguageService } from '../../core/language.service';
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: ` <dialog
    #dialog
    aria-labelledby="settings-title"
    (close)="speech.stop()"
  >
    <div class="dialog-heading">
      <h2 id="settings-title"><app-icon name="settings" /> {{ language.t('settings') }}</h2>
      <button
        class="icon-button"
        (click)="dialog.close()"
        [attr.aria-label]="language.t('closeSettings')"
      >
        <app-icon name="close" />
      </button>
    </div>
    <fieldset>
      <legend>{{ language.t('voiceSpeed') }}</legend>
      <div class="segmented">
        <button
          [class.selected]="draft.rate === 0.75"
          [attr.aria-pressed]="draft.rate === 0.75"
          (click)="draft.rate = 0.75"
        >
          {{ language.t('slow') }}</button
        ><button
          [class.selected]="draft.rate === 1"
          [attr.aria-pressed]="draft.rate === 1"
          (click)="draft.rate = 1"
        >
          {{ language.t('normal') }}</button
        ><button
          [class.selected]="draft.rate === 1.25"
          [attr.aria-pressed]="draft.rate === 1.25"
          (click)="draft.rate = 1.25"
        >
          {{ language.t('fast') }}
        </button>
      </div>
    </fieldset>
    <label for="language">{{ language.t('language') }}</label
    ><select id="language" [(ngModel)]="draft.lang" (ngModelChange)="previewLanguage()">
      <option value="es-PE">Español</option>
      <option value="en-US">English</option>
      <option value="pt-BR">Português</option>
      <option value="fr-FR">Français</option>
      <option value="it-IT">Italiano</option>
      <option value="de-DE">Deutsch</option>
      <option value="qu">Quechua</option>
      <option value="ay">Aymara</option></select
    ><label for="volume"
      >{{ language.t('volume') }}
      <span class="float-right"
        >{{ (draft.volume * 100).toFixed(0) }}%</span
      ></label
    ><input
      id="volume"
      type="range"
      min="0"
      max="1"
      step="0.1"
      [(ngModel)]="draft.volume"
    />
    <label class="check-row"
      ><input type="checkbox" [(ngModel)]="draft.largeText" /> {{ language.t('largerText') }}</label>
    <label class="check-row voice-sensitive-row"
      ><input
        type="checkbox"
        [(ngModel)]="draft.voiceSensitive"
        [disabled]="!speech.voiceDetectionSupported"
      />
      <span>
        {{ language.t('voiceSensitive') }}
        <small>{{ language.t('voiceSensitiveHelp') }}</small>
      </span>
    </label>
    @if (!speech.voiceDetectionSupported) {
      <p class="settings-help" role="status">{{ language.t('voiceDetectionUnavailable') }}</p>
    }
    <button class="button full" (click)="test()">
      <app-icon name="volume" /> {{ language.t('testVoice') }}
    </button>
    <div class="dialog-footer">
      <button class="button primary full" (click)="save()">
        <app-icon name="check" /> {{ language.t('save') }}</button
      ><button class="button full" (click)="cancel()">
        {{ language.t('close') }}
      </button>
    </div>
  </dialog>`,
})
export class SettingsComponent {
  speech = inject(SpeechService);
  language = inject(LanguageService);
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  draft: VoiceSettings = { ...this.speech.settings() };
  open() {
    this.draft = { ...this.speech.settings() };
    this.dialog.nativeElement.showModal();
  }
  previewLanguage() { this.language.set(this.draft.lang as any); }
  save() {
    this.speech.save(this.draft);
    this.dialog.nativeElement.close();
  }
  cancel() {
    this.language.set(this.speech.settings().lang as any);
    this.dialog.nativeElement.close();
  }
  test() {
    const old = this.speech.settings();
    this.speech.settings.set({ ...this.draft });
    this.speech.read(this.language.voiceTest(this.draft.lang as any));
    this.speech.settings.set(old);
  }
}

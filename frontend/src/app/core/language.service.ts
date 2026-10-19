import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'es-PE' | 'en-US' | 'pt-BR' | 'fr-FR' | 'it-IT' | 'de-DE';

const labels: Record<AppLanguage, Record<string, string>> = {
  'es-PE': { settings: 'Configuración', language: 'Idioma de la aplicación y la voz', slow: 'Lenta', normal: 'Normal', fast: 'Rápida', voiceSpeed: 'Velocidad de voz', volume: 'Volumen', largerText: 'Texto más grande', testVoice: 'Probar voz', save: 'Guardar cambios', close: 'Cerrar sin guardar', closeSettings: 'Cerrar configuración', reader: 'Lector visual', map: 'Mapa accesible', readings: 'Mis lecturas', access: 'Acceder', mute: 'Desactivar voz', unmute: 'Activar voz' },
  'en-US': { settings: 'Settings', language: 'App and voice language', slow: 'Slow', normal: 'Normal', fast: 'Fast', voiceSpeed: 'Speech speed', volume: 'Volume', largerText: 'Larger text', testVoice: 'Test voice', save: 'Save changes', close: 'Close without saving', closeSettings: 'Close settings', reader: 'Visual reader', map: 'Accessible map', readings: 'My readings', access: 'Sign in', mute: 'Turn voice off', unmute: 'Turn voice on' },
  'pt-BR': { settings: 'Configurações', language: 'Idioma do aplicativo e da voz', slow: 'Lenta', normal: 'Normal', fast: 'Rápida', voiceSpeed: 'Velocidade da voz', volume: 'Volume', largerText: 'Texto maior', testVoice: 'Testar voz', save: 'Salvar alterações', close: 'Fechar sem salvar', closeSettings: 'Fechar configurações', reader: 'Leitor visual', map: 'Mapa acessível', readings: 'Minhas leituras', access: 'Entrar', mute: 'Desativar voz', unmute: 'Ativar voz' },
  'fr-FR': { settings: 'Paramètres', language: 'Langue de l’application et de la voix', slow: 'Lente', normal: 'Normale', fast: 'Rapide', voiceSpeed: 'Vitesse de lecture', volume: 'Volume', largerText: 'Texte plus grand', testVoice: 'Tester la voix', save: 'Enregistrer les modifications', close: 'Fermer sans enregistrer', closeSettings: 'Fermer les paramètres', reader: 'Lecteur visuel', map: 'Carte accessible', readings: 'Mes lectures', access: 'Se connecter', mute: 'Désactiver la voix', unmute: 'Activer la voix' },
  'it-IT': { settings: 'Impostazioni', language: 'Lingua dell’app e della voce', slow: 'Lenta', normal: 'Normale', fast: 'Veloce', voiceSpeed: 'Velocità della voce', volume: 'Volume', largerText: 'Testo più grande', testVoice: 'Prova la voce', save: 'Salva modifiche', close: 'Chiudi senza salvare', closeSettings: 'Chiudi impostazioni', reader: 'Lettore visivo', map: 'Mappa accessibile', readings: 'Le mie letture', access: 'Accedi', mute: 'Disattiva voce', unmute: 'Attiva voce' },
  'de-DE': { settings: 'Einstellungen', language: 'App- und Sprachsprache', slow: 'Langsam', normal: 'Normal', fast: 'Schnell', voiceSpeed: 'Sprechgeschwindigkeit', volume: 'Lautstärke', largerText: 'Größerer Text', testVoice: 'Stimme testen', save: 'Änderungen speichern', close: 'Ohne Speichern schließen', closeSettings: 'Einstellungen schließen', reader: 'Visueller Leser', map: 'Barrierefreie Karte', readings: 'Meine Lesungen', access: 'Anmelden', mute: 'Stimme ausschalten', unmute: 'Stimme einschalten' },
};

const voiceTests: Record<AppLanguage, string> = {
  'es-PE': 'Hola, soy la voz de Acces. Estoy aquí para ayudarte.',
  'en-US': 'Hello, this is the Acces voice. I am here to help you.',
  'pt-BR': 'Olá, esta é a voz do Acces. Estou aqui para ajudar você.',
  'fr-FR': 'Bonjour, voici la voix d’Acces. Je suis là pour vous aider.',
  'it-IT': 'Ciao, questa è la voce di Acces. Sono qui per aiutarti.',
  'de-DE': 'Hallo, dies ist die Stimme von Acces. Ich bin hier, um Ihnen zu helfen.',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal<AppLanguage>('es-PE');
  set(language: AppLanguage) {
    this.language.set(language);
    document.documentElement.lang = language;
  }
  t(key: string) { return labels[this.language()][key] ?? labels['es-PE'][key] ?? key; }
  voiceTest(language = this.language()) { return voiceTests[language]; }
}

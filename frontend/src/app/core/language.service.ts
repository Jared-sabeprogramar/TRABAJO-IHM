import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'es-PE' | 'en-US' | 'pt-BR' | 'fr-FR' | 'it-IT' | 'de-DE' | 'qu' | 'ay';

const labels: Record<AppLanguage, Record<string, string>> = {
  'es-PE': { settings: 'Configuración', language: 'Idioma de la aplicación y la voz', slow: 'Lenta', normal: 'Normal', fast: 'Rápida', voiceSpeed: 'Velocidad de voz', volume: 'Volumen', largerText: 'Texto más grande', testVoice: 'Probar voz', save: 'Guardar cambios', close: 'Cerrar sin guardar', closeSettings: 'Cerrar configuración', reader: 'Lector visual', map: 'Mapa accesible', readings: 'Mis lecturas', access: 'Acceder', mute: 'Desactivar voz', unmute: 'Activar voz' },
  'en-US': { settings: 'Settings', language: 'App and voice language', slow: 'Slow', normal: 'Normal', fast: 'Fast', voiceSpeed: 'Speech speed', volume: 'Volume', largerText: 'Larger text', testVoice: 'Test voice', save: 'Save changes', close: 'Close without saving', closeSettings: 'Close settings', reader: 'Visual reader', map: 'Accessible map', readings: 'My readings', access: 'Sign in', mute: 'Turn voice off', unmute: 'Turn voice on' },
  'pt-BR': { settings: 'Configurações', language: 'Idioma do aplicativo e da voz', slow: 'Lenta', normal: 'Normal', fast: 'Rápida', voiceSpeed: 'Velocidade da voz', volume: 'Volume', largerText: 'Texto maior', testVoice: 'Testar voz', save: 'Salvar alterações', close: 'Fechar sem salvar', closeSettings: 'Fechar configurações', reader: 'Leitor visual', map: 'Mapa acessível', readings: 'Minhas leituras', access: 'Entrar', mute: 'Desativar voz', unmute: 'Ativar voz' },
  'fr-FR': { settings: 'Paramètres', language: 'Langue de l’application et de la voix', slow: 'Lente', normal: 'Normale', fast: 'Rapide', voiceSpeed: 'Vitesse de lecture', volume: 'Volume', largerText: 'Texte plus grand', testVoice: 'Tester la voix', save: 'Enregistrer les modifications', close: 'Fermer sans enregistrer', closeSettings: 'Fermer les paramètres', reader: 'Lecteur visuel', map: 'Carte accessible', readings: 'Mes lectures', access: 'Se connecter', mute: 'Désactiver la voix', unmute: 'Activer la voix' },
  'it-IT': { settings: 'Impostazioni', language: 'Lingua dell’app e della voce', slow: 'Lenta', normal: 'Normale', fast: 'Veloce', voiceSpeed: 'Velocità della voce', volume: 'Volume', largerText: 'Testo più grande', testVoice: 'Prova la voce', save: 'Salva modifiche', close: 'Chiudi senza salvare', closeSettings: 'Chiudi impostazioni', reader: 'Lettore visivo', map: 'Mappa accessibile', readings: 'Le mie letture', access: 'Accedi', mute: 'Disattiva voce', unmute: 'Attiva voce' },
  'de-DE': { settings: 'Einstellungen', language: 'App- und Sprachsprache', slow: 'Langsam', normal: 'Normal', fast: 'Schnell', voiceSpeed: 'Sprechgeschwindigkeit', volume: 'Lautstärke', largerText: 'Größerer Text', testVoice: 'Stimme testen', save: 'Änderungen speichern', close: 'Ohne Speichern schließen', closeSettings: 'Einstellungen schließen', reader: 'Visueller Leser', map: 'Barrierefreie Karte', readings: 'Meine Lesungen', access: 'Anmelden', mute: 'Stimme ausschalten', unmute: 'Stimme einschalten' },
  'qu': { settings: 'Churaykuna', language: 'Aplikasiyunpa hinaspa rimaypa simin', slow: 'Pisi pisi', normal: 'Chawpi', fast: 'Utqaylla', voiceSpeed: 'Rimaypa utqaynin', volume: 'Uyarinapa kallpan', largerText: 'Hatun qillqa', testVoice: 'Rimayta pruebay', save: 'Tikraykunata waqaychay', close: 'Mana waqaychaspa wichqay', closeSettings: 'Churaykunata wichqay', reader: 'Qhaway ñiqi', map: 'Yaykuy mapa', readings: 'Ñawinchaykuna', access: 'Yaykuy', mute: 'Rimayta chinkachiy', unmute: 'Rimayta kichay' },
  'ay': { settings: 'Wakicht’awi', language: 'Aplicación ukat arun aru', slow: 'K’achata', normal: 'Taypita', fast: 'Jank’aki', voiceSpeed: 'Aru jank’aki', volume: 'Ist’aña ch’ama', largerText: 'Jach’a qillqata', testVoice: 'Aru yant’aña', save: 'Mayjt’awinaka imaña', close: 'Jani imasina jist’antaña', closeSettings: 'Wakicht’awi jist’antaña', reader: 'Uñjaña ulliri', map: 'Jikxataña mapa', readings: 'Ullirinaka', access: 'Mant’aña', mute: 'Aru jani ist’ayaña', unmute: 'Aru ist’ayaña' },
};

const voiceTests: Record<AppLanguage, string> = {
  'es-PE': 'Hola, soy la voz de Acces. Estoy aquí para ayudarte.',
  'en-US': 'Hello, this is the Acces voice. I am here to help you.',
  'pt-BR': 'Olá, esta é a voz do Acces. Estou aqui para ajudar você.',
  'fr-FR': 'Bonjour, voici la voix d’Acces. Je suis là pour vous aider.',
  'it-IT': 'Ciao, questa è la voce di Acces. Sono qui per aiutarti.',
  'de-DE': 'Hallo, dies ist die Stimme von Acces. Ich bin hier, um Ihnen zu helfen.',
  'qu': 'Allin p’unchay. Accespa rimayninmi kani. Yanapaykipaq kaypi kachkani.',
  'ay': 'Kamisaraki. Acces arupawa. Yanapt’añataki akankta.',
};

const accessibilityLabels: Record<string, Partial<Record<AppLanguage, string>>> = {
  voiceSensitive: {
    'es-PE': 'Silenciar al detectar mi voz',
    'en-US': 'Mute when my voice is detected',
    'pt-BR': 'Silenciar ao detectar minha voz',
    'fr-FR': 'Couper le son quand ma voix est détectée',
    'it-IT': 'Disattiva l’audio quando rileva la mia voce',
    'de-DE': 'Stummschalten, wenn meine Stimme erkannt wird',
  },
  voiceSensitiveHelp: {
    'es-PE': 'Usa el micrófono solo para detener la narración cuando hables. Acces no guarda el audio.',
    'en-US': 'Uses the microphone only to stop narration when you speak. Acces does not save audio.',
    'pt-BR': 'Usa o microfone apenas para parar a narração quando você falar. O Acces não salva o áudio.',
    'fr-FR': 'Utilise le microphone uniquement pour arrêter la narration lorsque vous parlez. Acces n’enregistre pas l’audio.',
    'it-IT': 'Usa il microfono solo per interrompere la narrazione quando parli. Acces non salva l’audio.',
    'de-DE': 'Verwendet das Mikrofon nur, um die Sprachausgabe zu stoppen, wenn Sie sprechen. Acces speichert kein Audio.',
  },
  voiceListening: {
    'es-PE': 'Escuchando: la narración se detendrá si hablas.',
    'en-US': 'Listening: narration will stop if you speak.',
    'pt-BR': 'Ouvindo: a narração será interrompida se você falar.',
    'fr-FR': 'Écoute en cours : la narration s’arrêtera si vous parlez.',
    'it-IT': 'In ascolto: la narrazione si interromperà se parli.',
    'de-DE': 'Zuhören: Die Sprachausgabe stoppt, wenn Sie sprechen.',
  },
  voiceDetectionUnavailable: {
    'es-PE': 'Tu navegador no admite la detección de voz.',
    'en-US': 'Your browser does not support voice detection.',
    'pt-BR': 'Seu navegador não oferece detecção de voz.',
    'fr-FR': 'Votre navigateur ne prend pas en charge la détection vocale.',
    'it-IT': 'Il tuo browser non supporta il rilevamento vocale.',
    'de-DE': 'Ihr Browser unterstützt keine Spracherkennung.',
  },
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal<AppLanguage>('es-PE');
  set(language: AppLanguage) {
    this.language.set(language);
    document.documentElement.lang = language;
  }
  t(key: string) {
    return labels[this.language()][key]
      ?? accessibilityLabels[key]?.[this.language()]
      ?? labels['es-PE'][key]
      ?? accessibilityLabels[key]?.['es-PE']
      ?? key;
  }
  voiceTest(language = this.language()) { return voiceTests[language]; }
}

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

const voiceCommandLabels: Record<AppLanguage, Record<string, string>> = {
  'es-PE': {
    voiceCommands: 'Escuchar y responder cuando hablo',
    voiceCommandsHelp: 'Di “Acces responde” seguido de lector, mapa, lecturas, configuración o ayuda. La narración se detiene al hablar y el audio no se guarda.',
    voiceOpenReader: 'Abriendo el lector visual.', voiceOpenMap: 'Abriendo el mapa accesible.', voiceOpenReadings: 'Abriendo tus lecturas.', voiceOpenSettings: 'Abriendo configuración.', voiceSoundOn: 'Voz activada.',
    voiceCommandHelp: 'Puedes decir: lector, mapa, lecturas, configuración, activar voz, silenciar o ayuda.', voiceCommandUnknown: 'No reconocí ese pedido. Di Acces responde ayuda.', voiceWakeHelp: 'Puedo abrir el lector visual para leer o describir imágenes, el mapa accesible para consultar o reportar barreras, tus lecturas y configuración. Di Acces responde seguido de lector, mapa, lecturas o configuración.',
  },
  'en-US': {
    voiceCommands: 'Listen and respond when I speak',
    voiceCommandsHelp: 'Say “Acces responde” followed by reader, map, readings, settings or help. Speech stops while you speak and audio is not stored.',
    voiceOpenReader: 'Opening the visual reader.', voiceOpenMap: 'Opening the accessible map.', voiceOpenReadings: 'Opening your readings.', voiceOpenSettings: 'Opening settings.', voiceSoundOn: 'Voice enabled.',
    voiceCommandHelp: 'You can say: reader, map, readings, settings, turn voice on, mute, or help.', voiceCommandUnknown: 'I did not recognize that request. Say Acces responde help.', voiceWakeHelp: 'I can open the visual reader to read or describe images, the accessible map to view or report barriers, your readings, and settings. Say Acces responde followed by reader, map, readings, or settings.',
  },
  'pt-BR': {
    voiceCommands: 'Ouvir e responder quando eu falar',
    voiceCommandsHelp: 'Diga “Acces responde” seguido de leitor, mapa, leituras, configurações ou ajuda. A narração para quando você fala e o áudio não é salvo.',
    voiceOpenReader: 'Abrindo o leitor visual.', voiceOpenMap: 'Abrindo o mapa acessível.', voiceOpenReadings: 'Abrindo suas leituras.', voiceOpenSettings: 'Abrindo configurações.', voiceSoundOn: 'Voz ativada.',
    voiceCommandHelp: 'Você pode dizer: leitor, mapa, leituras, configurações, ativar voz, silenciar ou ajuda.', voiceCommandUnknown: 'Não reconheci esse pedido. Diga Acces responde ajuda.', voiceWakeHelp: 'Posso abrir o leitor visual para ler ou descrever imagens, o mapa acessível para consultar ou reportar barreiras, suas leituras e configurações. Diga Acces responde seguido de leitor, mapa, leituras ou configurações.',
  },
  'fr-FR': {
    voiceCommands: 'Écouter et répondre lorsque je parle',
    voiceCommandsHelp: 'Dites « Acces responde » suivi de lecteur, carte, lectures, paramètres ou aide. La narration s’arrête pendant que vous parlez et l’audio n’est pas enregistré.',
    voiceOpenReader: 'Ouverture du lecteur visuel.', voiceOpenMap: 'Ouverture de la carte accessible.', voiceOpenReadings: 'Ouverture de vos lectures.', voiceOpenSettings: 'Ouverture des paramètres.', voiceSoundOn: 'Voix activée.',
    voiceCommandHelp: 'Vous pouvez dire : lecteur, carte, lectures, paramètres, activer la voix, couper le son ou aide.', voiceCommandUnknown: 'Je n’ai pas reconnu cette demande. Dites Acces responde aide.', voiceWakeHelp: 'Je peux ouvrir le lecteur visuel pour lire ou décrire des images, la carte accessible pour consulter ou signaler des obstacles, vos lectures et les paramètres. Dites Acces responde suivi de lecteur, carte, lectures ou paramètres.',
  },
  'it-IT': {
    voiceCommands: 'Ascolta e rispondi quando parlo',
    voiceCommandsHelp: 'Di “Acces responde” seguito da lettore, mappa, letture, impostazioni o aiuto. La voce si ferma quando parli e l’audio non viene salvato.',
    voiceOpenReader: 'Apro il lettore visivo.', voiceOpenMap: 'Apro la mappa accessibile.', voiceOpenReadings: 'Apro le tue letture.', voiceOpenSettings: 'Apro le impostazioni.', voiceSoundOn: 'Voce attivata.',
    voiceCommandHelp: 'Puoi dire: lettore, mappa, letture, impostazioni, attiva voce, silenzia o aiuto.', voiceCommandUnknown: 'Non ho riconosciuto quella richiesta. Di Acces responde aiuto.', voiceWakeHelp: 'Posso aprire il lettore visivo per leggere o descrivere immagini, la mappa accessibile per consultare o segnalare barriere, le tue letture e le impostazioni. Di Acces responde seguito da lettore, mappa, letture o impostazioni.',
  },
  'de-DE': {
    voiceCommands: 'Zuhören und antworten, wenn ich spreche',
    voiceCommandsHelp: 'Sagen Sie „Acces responde“ gefolgt von Leser, Karte, Lesungen, Einstellungen oder Hilfe. Die Stimme stoppt beim Sprechen und Audio wird nicht gespeichert.',
    voiceOpenReader: 'Der visuelle Leser wird geöffnet.', voiceOpenMap: 'Die barrierefreie Karte wird geöffnet.', voiceOpenReadings: 'Ihre Lesungen werden geöffnet.', voiceOpenSettings: 'Einstellungen werden geöffnet.', voiceSoundOn: 'Stimme aktiviert.',
    voiceCommandHelp: 'Sie können sagen: Leser, Karte, Lesungen, Einstellungen, Stimme an, stumm oder Hilfe.', voiceCommandUnknown: 'Diese Anfrage habe ich nicht erkannt. Sagen Sie Acces responde Hilfe.', voiceWakeHelp: 'Ich kann den visuellen Leser zum Lesen oder Beschreiben von Bildern, die barrierefreie Karte zum Ansehen oder Melden von Barrieren, Ihre Lesungen und Einstellungen öffnen. Sagen Sie Acces responde gefolgt von Leser, Karte, Lesungen oder Einstellungen.',
  },
  qu: {
    voiceCommands: 'Rimasqayta uyarispa kutichiy',
    voiceCommandsHelp: '“Acces responde” nispa qhaway, mapa, ñawinchaykuna, churaykuna utaq yanapa niy. Rimaptikiqa rimay sayan, mana waqaychasqachu.',
    voiceOpenReader: 'Qhaway ñiqita kichashani.', voiceOpenMap: 'Yaykuy mapata kichashani.', voiceOpenReadings: 'Ñawinchaykuykita kichashani.', voiceOpenSettings: 'Churaykunata kichashani.', voiceSoundOn: 'Rimay kichasqa.',
    voiceCommandHelp: 'Niy atinki: qhaway, mapa, ñawinchaykuna, churaykuna, rimayta kichay, chinkachiy utaq yanapa.', voiceCommandUnknown: 'Chay mañakuyta mana riqsirqanichu. Acces responde yanapata niy.', voiceWakeHelp: 'Qhaway ñiqiwan qillqata ñawinchayta utaq rikchayta willayta atini. Yaykuy mapawan harkakuykunata qhawayta utaq willayta atini. Ñawinchaykuna hinaspa churaykunapas kachkan. Acces responde nispa qhaway, mapa, ñawinchaykuna utaq churaykunata niy.',
  },
  ay: {
    voiceCommands: 'Aruskta ist’asina kutiy',
    voiceCommandsHelp: '“Acces responde” sasin ulliri, mapa, ullirinaka, wakicht’awi jan ukax yanapa sasma. Aruskipana arux sayt’i, janiw imatäkiti.',
    voiceOpenReader: 'Uñjaña ulliri jist’araskiwa.', voiceOpenMap: 'Jikxataña mapa jist’araskiwa.', voiceOpenReadings: 'Ullirinakma jist’araskiwa.', voiceOpenSettings: 'Wakicht’awi jist’araskiwa.', voiceSoundOn: 'Aru jist’aratawa.',
    voiceCommandHelp: 'Sasma: ulliri, mapa, ullirinaka, wakicht’awi, aru jist’ayaña, amukt’ayaña jan ukax yanapa.', voiceCommandUnknown: 'Uka mayiwix janiw uñt’kti. Acces responde yanapa sasma.', voiceWakeHelp: 'Uñjaña ullirimpix qillqatanaka ullt’asmawa jan ukax jamuq uñacht’ayasmawa. Jikxataña mapampix jark’anaka uñch’ukisma jan ukax yatiyasmawa. Ullirinakama ukat wakicht’awipasa utjarakiwa. Acces responde sasin ulliri, mapa, ullirinaka jan ukax wakicht’awi sasma.',
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
      ?? voiceCommandLabels[this.language()][key]
      ?? labels['es-PE'][key]
      ?? accessibilityLabels[key]?.['es-PE']
      ?? voiceCommandLabels['es-PE'][key]
      ?? key;
  }
  voiceTest(language = this.language()) { return voiceTests[language]; }
}

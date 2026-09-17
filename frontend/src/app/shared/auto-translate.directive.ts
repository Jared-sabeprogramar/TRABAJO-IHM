import { AfterViewInit, Directive, ElementRef, OnDestroy, effect, inject } from '@angular/core';
import { LanguageService } from '../core/language.service';
import { BackendService } from '../core/backend.service';

type Dictionary = Record<string, [string, string, string, string, string]>;

// UI copy is kept here rather than being translated by an external service: no user
// content (DNI, photos, recognised text or reports) ever leaves the device.
const dictionary: Dictionary = {
  'Activa la cámara para usar la lectura continua.': ['Turn on the camera to use continuous reading.', 'Ative a câmera para usar a leitura contínua.', 'Activez la caméra pour utiliser la lecture continue.', 'Attiva la fotocamera per usare la lettura continua.', 'Aktivieren Sie die Kamera, um das fortlaufende Lesen zu verwenden.'],
  'Reportes de la comunidad, no una certificación.': ['Community reports, not a certification.', 'Relatos da comunidade, não uma certificação.', 'Signalements de la communauté, pas une certification.', 'Segnalazioni della comunità, non una certificazione.', 'Meldungen der Gemeinschaft, keine Zertifizierung.'],
  'Se cuentan reportes activos de los últimos 90 días, uno por DNI declarado y lugar. Tres o más indican una barrera recurrente. Sin reportes no significa accesible. Las quejas se guardan en Acces y no se publican como reseñas de Google.': ['Active reports from the last 90 days are counted, one per declared ID and place. Three or more indicate a recurring barrier. No reports does not mean accessible. Complaints are kept in Acces and are not published as Google reviews.', 'São contados relatos ativos dos últimos 90 dias, um por documento declarado e local. Três ou mais indicam uma barreira recorrente. Sem relatos não significa acessível. As reclamações são guardadas no Acces e não são publicadas como avaliações do Google.', 'Les signalements actifs des 90 derniers jours sont comptés, un par pièce d’identité déclarée et lieu. Trois ou plus indiquent une barrière récurrente. L’absence de signalement ne signifie pas accessible. Les plaintes sont conservées dans Acces et ne sont pas publiées comme avis Google.', 'Vengono conteggiate le segnalazioni attive degli ultimi 90 giorni, una per documento dichiarato e luogo. Tre o più indicano una barriera ricorrente. Nessuna segnalazione non significa accessibile. I reclami sono conservati in Acces e non pubblicati come recensioni Google.', 'Aktive Meldungen der letzten 90 Tage werden gezählt, eine pro angegebener ID und Ort. Drei oder mehr weisen auf eine wiederkehrende Barriere hin. Keine Meldungen bedeuten nicht barrierefrei. Beschwerden werden in Acces gespeichert und nicht als Google-Bewertungen veröffentlicht.'],
  'Activar cámara': ['Turn on camera', 'Ativar câmera', 'Activer la caméra', 'Attiva fotocamera', 'Kamera aktivieren'],
  'Te pediremos permiso antes de acceder': ['We will ask for permission before accessing it', 'Pediremos sua permissão antes de acessar', 'Nous vous demanderons l’autorisation avant d’y accéder', 'Ti chiederemo il permesso prima di accedere', 'Wir werden vor dem Zugriff um Erlaubnis bitten'],
  'Tu cámara está desactivada': ['Your camera is off', 'Sua câmera está desativada', 'Votre caméra est désactivée', 'La tua fotocamera è disattivata', 'Ihre Kamera ist ausgeschaltet'],
  'Leer texto en voz alta': ['Read text aloud', 'Ler texto em voz alta', 'Lire le texte à voix haute', 'Leggi il testo ad alta voce', 'Text laut vorlesen'],
  'Subir imagen': ['Upload image', 'Enviar imagem', 'Téléverser une image', 'Carica immagine', 'Bild hochladen'],
  'Lectura continua': ['Continuous reading', 'Leitura contínua', 'Lecture continue', 'Lettura continua', 'Fortlaufendes Lesen'],
  'Detecta nuevos textos automáticamente': ['Detect new text automatically', 'Detecta novos textos automaticamente', 'Détecte automatiquement les nouveaux textes', 'Rileva automaticamente nuovi testi', 'Erkennt neue Texte automatisch'],
  'El texto se reconoce en tu dispositivo. Tus imágenes no se guardan.': ['Text is recognised on your device. Your images are not saved.', 'O texto é reconhecido no seu dispositivo. Suas imagens não são salvas.', 'Le texte est reconnu sur votre appareil. Vos images ne sont pas enregistrées.', 'Il testo viene riconosciuto sul tuo dispositivo. Le tue immagini non vengono salvate.', 'Text wird auf Ihrem Gerät erkannt. Ihre Bilder werden nicht gespeichert.'],
  'Escuchar instrucciones': ['Listen to instructions', 'Ouvir instruções', 'Écouter les instructions', 'Ascolta istruzioni', 'Anweisungen anhören'],
  'UNA CIUDAD PARA TODOS': ['A CITY FOR EVERYONE', 'UMA CIDADE PARA TODOS', 'UNE VILLE POUR TOUS', 'UNA CITTÀ PER TUTTI', 'EINE STADT FÜR ALLE'],
  'Menos barreras.': ['Fewer barriers.', 'Menos barreiras.', 'Moins de barrières.', 'Meno barriere.', 'Weniger Barrieren.'],
  'Más caminos.': ['More paths.', 'Mais caminhos.', 'Plus de chemins.', 'Più percorsi.', 'Mehr Wege.'],
  'Consulta y reporta lugares con dificultades de acceso para sillas de ruedas.': ['View and report places with wheelchair-access difficulties.', 'Consulte e reporte locais com dificuldades de acesso para cadeiras de rodas.', 'Consultez et signalez les lieux présentant des difficultés d’accès en fauteuil roulant.', 'Consulta e segnala luoghi con difficoltà di accesso per sedie a rotelle.', 'Sehen und melden Sie Orte mit Zugangsproblemen für Rollstühle.'],
  'Explorar mapa accesible': ['Explore accessible map', 'Explorar mapa acessível', 'Explorer la carte accessible', 'Esplora mappa accessibile', 'Barrierefreie Karte erkunden'],
  'Alto contraste, controles grandes y señales que no dependen del color.': ['High contrast, large controls and signals that do not rely on colour.', 'Alto contraste, controles grandes e sinais que não dependem de cor.', 'Contraste élevé, grands contrôles et signaux qui ne dépendent pas de la couleur.', 'Alto contrasto, controlli grandi e segnali che non dipendono dal colore.', 'Hoher Kontrast, große Bedienelemente und farbunabhängige Signale.'],
  'A TU RITMO': ['AT YOUR OWN PACE', 'NO SEU RITMO', 'À VOTRE RYTHME', 'AL TUO RITMO', 'IN IHREM TEMPO'],
  'Vuelve a escuchar lo que acabas de descubrir.': ['Listen again to what you have just discovered.', 'Ouça novamente o que você acabou de descobrir.', 'Réécoutez ce que vous venez de découvrir.', 'Ascolta di nuovo ciò che hai appena scoperto.', 'Hören Sie sich noch einmal an, was Sie gerade entdeckt haben.'],
  'Solo se conservan durante esta sesión. No guardamos imágenes ni subimos tus lecturas.': ['They are kept only during this session. We do not save images or upload your readings.', 'Elas são mantidas apenas durante esta sessão. Não salvamos imagens nem enviamos suas leituras.', 'Ils ne sont conservés que pendant cette session. Nous n’enregistrons pas les images et ne téléversons pas vos lectures.', 'Sono conservate solo durante questa sessione. Non salviamo immagini né carichiamo le tue letture.', 'Sie werden nur während dieser Sitzung gespeichert. Wir speichern keine Bilder und laden Ihre Lesungen nicht hoch.'],
  'Tu próxima lectura empieza aquí': ['Your next reading starts here', 'Sua próxima leitura começa aqui', 'Votre prochaine lecture commence ici', 'La tua prossima lettura inizia qui', 'Ihre nächste Lesung beginnt hier'],
  'Los textos que reconozcas aparecerán en este espacio.': ['The text you recognise will appear in this space.', 'Os textos que você reconhecer aparecerão neste espaço.', 'Les textes que vous reconnaissez apparaîtront dans cet espace.', 'I testi che riconosci appariranno in questo spazio.', 'Die von Ihnen erkannten Texte werden in diesem Bereich angezeigt.'],
  'Ir al lector': ['Go to reader', 'Ir ao leitor', 'Aller au lecteur', 'Vai al lettore', 'Zum Leser'],
  'Borrar lecturas': ['Clear readings', 'Apagar leituras', 'Effacer les lectures', 'Cancella letture', 'Lesungen löschen'],
  'Volver a escuchar': ['Listen again', 'Ouvir novamente', 'Réécouter', 'Ascolta di nuovo', 'Erneut anhören'],
  'Texto reconocido': ['Recognised text', 'Texto reconhecido', 'Texte reconnu', 'Testo riconosciuto', 'Erkannter Text'],
  'Descripción de imagen': ['Image description', 'Descrição de imagem', 'Description de l’image', 'Descrizione dell’immagine', 'Bildbeschreibung'],
  'ACCESIBILIDAD QUE CONSTRUIMOS JUNTOS': ['ACCESSIBILITY WE BUILD TOGETHER', 'ACESSIBILIDADE QUE CONSTRUÍMOS JUNTOS', 'L’ACCESSIBILITÉ QUE NOUS CONSTRUISONS ENSEMBLE', 'L’ACCESSIBILITÀ CHE COSTRUIAMO INSIEME', 'BARRIEREFREIHEIT, DIE WIR GEMEINSAM GESTALTEN'],
  'Cada reporte': ['Every report', 'Cada relato', 'Chaque signalement', 'Ogni segnalazione', 'Jede Meldung'],
  'abre un camino.': ['opens a path.', 'abre um caminho.', 'ouvre un chemin.', 'apre un percorso.', 'öffnet einen Weg.'],
  'Identifica barreras y ayuda a otras personas a moverse con más información.': ['Identify barriers and help other people move with more information.', 'Identifique barreiras e ajude outras pessoas a se mover com mais informação.', 'Identifiez les barrières et aidez les autres à se déplacer avec plus d’informations.', 'Identifica le barriere e aiuta altre persone a muoversi con più informazioni.', 'Erkennen Sie Barrieren und helfen Sie anderen, sich mit mehr Informationen zu bewegen.'],
  'Actualizar reportes': ['Refresh reports', 'Atualizar relatos', 'Actualiser les signalements', 'Aggiorna segnalazioni', 'Meldungen aktualisieren'],
  'Buscar un lugar': ['Search for a place', 'Buscar um local', 'Rechercher un lieu', 'Cerca un luogo', 'Ort suchen'],
  'Mostrar': ['Show', 'Mostrar', 'Afficher', 'Mostra', 'Anzeigen'],
  'Todos los reportes': ['All reports', 'Todos os relatos', 'Tous les signalements', 'Tutte le segnalazioni', 'Alle Meldungen'],
  'reporte activo': ['active report', 'relato ativo', 'signalement actif', 'segnalazione attiva', 'aktive Meldung'],
  'reportes activos': ['active reports', 'relatos ativos', 'signalements actifs', 'segnalazioni attive', 'aktive Meldungen'],
  'Último reporte:': ['Last report:', 'Último relato:', 'Dernier signalement :', 'Ultima segnalazione:', 'Letzte Meldung:'],
  'Reportar aquí': ['Report here', 'Reportar aqui', 'Signaler ici', 'Segnala qui', 'Hier melden'],
  'Ver en Google Maps ↗': ['View in Google Maps ↗', 'Ver no Google Maps ↗', 'Voir dans Google Maps ↗', 'Vedi in Google Maps ↗', 'In Google Maps ansehen ↗'],
  'Toca el mapa para seleccionar dónde reportar': ['Tap the map to choose where to report', 'Toque no mapa para escolher onde reportar', 'Touchez la carte pour choisir où signaler', 'Tocca la mappa per scegliere dove segnalare', 'Tippen Sie auf die Karte, um den Meldeort zu wählen'],
  'Sin información': ['No information', 'Sem informação', 'Aucune information', 'Nessuna informazione', 'Keine Informationen'],
  '1–2 reportes': ['1–2 reports', '1–2 relatos', '1–2 signalements', '1–2 segnalazioni', '1–2 Meldungen'],
  '3+ reportes': ['3+ reports', '3+ relatos', '3+ signalements', '3+ segnalazioni', '3+ Meldungen'],
  'TU ASISTENTE DE ACCESIBILIDAD': ['YOUR ACCESSIBILITY ASSISTANT', 'SEU ASSISTENTE DE ACESSIBILIDADE', 'VOTRE ASSISTANT D’ACCESSIBILITÉ', 'IL TUO ASSISTENTE PER L’ACCESSIBILITÀ', 'IHR BARRIEREFREIHEITSASSISTENT'],
  'El mundo,': ['The world,', 'O mundo,', 'Le monde,', 'Il mondo,', 'Die Welt,'],
  'a tu alcance.': ['within your reach.', 'ao seu alcance.', 'à votre portée.', 'alla tua portata.', 'in Ihrer Reichweite.'],
  'Escucha lo que te rodea. Muévete con más información.': ['Listen to what is around you. Move with more information.', 'Ouça o que está ao seu redor. Mova-se com mais informação.', 'Écoutez ce qui vous entoure. Déplacez-vous avec plus d’informations.', 'Ascolta ciò che ti circonda. Muoviti con più informazioni.', 'Hören Sie, was Sie umgibt. Bewegen Sie sich mit mehr Informationen.'],
  'Sin cuenta para leer': ['No account needed to read', 'Sem conta para ler', 'Aucun compte nécessaire pour lire', 'Nessun account necessario per leggere', 'Kein Konto zum Lesen erforderlich'],
  'Una nueva forma de ver lo cotidiano': ['A new way to see everyday life', 'Uma nova forma de ver o cotidiano', 'Une nouvelle façon de voir le quotidien', 'Un nuovo modo di vedere la quotidianità', 'Eine neue Art, den Alltag zu sehen'],
  '01 / EXPLORA': ['01 / EXPLORE', '01 / EXPLORAR', '01 / EXPLORER', '01 / ESPLORA', '01 / ENTDECKEN'],
  'Leer texto': ['Read text', 'Ler texto', 'Lire le texte', 'Leggi testo', 'Text lesen'],
  'Describir imagen': ['Describe image', 'Descrever imagem', 'Décrire l’image', 'Descrivi immagine', 'Bild beschreiben'],
  'Dale voz a lo que ves': ['Give a voice to what you see', 'Dê voz ao que você vê', 'Donnez une voix à ce que vous voyez', 'Dai voce a ciò che vedi', 'Geben Sie dem, was Sie sehen, eine Stimme'],
  'Apunta a un cartel, un documento o un letrero. Nosotros lo leemos para ti.': ['Point at a sign, document or notice. We read it for you.', 'Aponte para uma placa, documento ou aviso. Nós lemos para você.', 'Pointez un panneau, un document ou une affiche. Nous le lisons pour vous.', 'Inquadra un cartello, un documento o un avviso. Lo leggiamo per te.', 'Richten Sie die Kamera auf ein Schild, Dokument oder einen Hinweis. Wir lesen es für Sie.'],
  'EMPEZAR ES SENCILLO': ['GETTING STARTED IS EASY', 'COMEÇAR É SIMPLES', 'COMMENCER EST SIMPLE', 'INIZIARE È SEMPLICE', 'DER START IST EINFACH'],
  'Tu entorno tiene mucho que decirte.': ['Your surroundings have a lot to tell you.', 'Seu ambiente tem muito a dizer a você.', 'Votre environnement a beaucoup à vous dire.', 'Il tuo ambiente ha molto da dirti.', 'Ihre Umgebung hat Ihnen viel zu sagen.'],
  'Activa tu cámara': ['Turn on your camera', 'Ative sua câmera', 'Activez votre caméra', 'Attiva la fotocamera', 'Aktivieren Sie Ihre Kamera'],
  'O selecciona una imagen de tu dispositivo.': ['Or select an image from your device.', 'Ou selecione uma imagem do seu dispositivo.', 'Ou sélectionnez une image sur votre appareil.', 'Oppure seleziona un’immagine dal tuo dispositivo.', 'Oder wählen Sie ein Bild von Ihrem Gerät aus.'],
  'Apunta y encuadra': ['Point and frame', 'Aponte e enquadre', 'Pointez et cadrez', 'Inquadra', 'Ausrichten und einrahmen'],
  'Busca buena luz y mantén el celular estable.': ['Find good lighting and keep your phone steady.', 'Procure boa luz e mantenha o celular firme.', 'Cherchez une bonne lumière et gardez le téléphone stable.', 'Cerca una buona luce e tieni fermo il telefono.', 'Sorgen Sie für gutes Licht und halten Sie das Telefon ruhig.'],
  'Escucha a tu ritmo': ['Listen at your own pace', 'Ouça no seu ritmo', 'Écoutez à votre rythme', 'Ascolta al tuo ritmo', 'Hören Sie in Ihrem Tempo'],
  'Pausa, repite o ajusta la velocidad de la voz.': ['Pause, repeat or adjust the speech speed.', 'Pause, repita ou ajuste a velocidade da voz.', 'Mettez en pause, répétez ou ajustez la vitesse de lecture.', 'Metti in pausa, ripeti o regola la velocità della voce.', 'Pausieren, wiederholen oder Sprechgeschwindigkeit anpassen.'],
  'Saltar al contenido': ['Skip to content', 'Ir para o conteúdo', 'Aller au contenu', 'Vai al contenuto', 'Zum Inhalt springen'],
  'Lector visual': ['Visual reader', 'Leitor visual', 'Lecteur visuel', 'Lettore visivo', 'Visueller Leser'],
  'Mapa accesible': ['Accessible map', 'Mapa acessível', 'Carte accessible', 'Mappa accessibile', 'Barrierefreie Karte'],
  'Mis lecturas': ['My readings', 'Minhas leituras', 'Mes lectures', 'Le mie letture', 'Meine Lesungen'],
  'Acceder': ['Sign in', 'Entrar', 'Se connecter', 'Accedi', 'Anmelden'],
  'Configuración de lectura': ['Reading settings', 'Configurações de leitura', 'Paramètres de lecture', 'Impostazioni di lettura', 'Leseeinstellungen'],
  'Más autonomía. Menos barreras.': ['More independence. Fewer barriers.', 'Mais autonomia. Menos barreiras.', 'Plus d’autonomie. Moins de barrières.', 'Più autonomia. Meno barriere.', 'Mehr Selbstständigkeit. Weniger Barrieren.'],
  'Diseñado para todas las personas': ['Designed for everyone', 'Projetado para todas as pessoas', 'Conçu pour toutes les personnes', 'Progettato per tutte le persone', 'Für alle Menschen entwickelt'],
  'Reportar una barrera': ['Report a barrier', 'Reportar uma barreira', 'Signaler une barrière', 'Segnala una barriera', 'Barriere melden'],
  'Ubicarme en el mapa': ['Locate me on the map', 'Localizar-me no mapa', 'Me localiser sur la carte', 'Individuami sulla mappa', 'Auf der Karte orten'],
  'Mi ubicación': ['My location', 'Minha localização', 'Ma position', 'La mia posizione', 'Mein Standort'],
  'Buscando ubicación…': ['Finding location…', 'Buscando localização…', 'Recherche de la position…', 'Ricerca della posizione…', 'Standort wird gesucht…'],
  'Centrando el mapa…': ['Centering the map…', 'Centralizando o mapa…', 'Centrage de la carte…', 'Centramento della mappa…', 'Karte wird zentriert…'],
  'Lugares reportados': ['Reported places', 'Locais reportados', 'Lieux signalés', 'Luoghi segnalati', 'Gemeldete Orte'],
  'Nombre del lugar': ['Place name', 'Nome do local', 'Nom du lieu', 'Nome del luogo', 'Name des Ortes'],
  'Confirmar y enviar reporte': ['Confirm and send report', 'Confirmar e enviar relato', 'Confirmer et envoyer le signalement', 'Conferma e invia segnalazione', 'Meldung bestätigen und senden'],
  'Usar mi ubicación actual': ['Use my current location', 'Usar minha localização atual', 'Utiliser ma position actuelle', 'Usa la mia posizione attuale', 'Meinen aktuellen Standort verwenden'],
  'Ajustar punto en el mapa': ['Adjust point on map', 'Ajustar ponto no mapa', 'Ajuster le point sur la carte', 'Regola il punto sulla mappa', 'Punkt auf der Karte anpassen'],
  'Latitud': ['Latitude', 'Latitude', 'Latitude', 'Latitudine', 'Breitengrad'],
  'Longitud': ['Longitude', 'Longitude', 'Longitude', 'Longitudine', 'Längengrad'],
  'Describe el problema': ['Describe the problem', 'Descreva o problema', 'Décrivez le problème', 'Descrivi il problema', 'Beschreiben Sie das Problem'],
  'Guardar cambios': ['Save changes', 'Salvar alterações', 'Enregistrer les modifications', 'Salva modifiche', 'Änderungen speichern'],
  'Cerrar sin guardar': ['Close without saving', 'Fechar sem salvar', 'Fermer sans enregistrer', 'Chiudi senza salvare', 'Ohne Speichern schließen'],
  'Probar voz': ['Test voice', 'Testar voz', 'Tester la voix', 'Prova la voce', 'Stimme testen'],
  'Volumen': ['Volume', 'Volume', 'Volume', 'Volume', 'Lautstärke'],
  'Texto más grande': ['Larger text', 'Texto maior', 'Texte plus grand', 'Testo più grande', 'Größerer Text'],
  'Velocidad de voz': ['Speech speed', 'Velocidade da voz', 'Vitesse de lecture', 'Velocità della voce', 'Sprechgeschwindigkeit'],
  'Cerrar': ['Close', 'Fechar', 'Fermer', 'Chiudi', 'Schließen'],
  'Continuar': ['Continue', 'Continuar', 'Continuer', 'Continua', 'Weiter'],
  'Ir al mapa': ['Go to map', 'Ir ao mapa', 'Aller à la carte', 'Vai alla mappa', 'Zur Karte'],
  'Volver al lector': ['Back to reader', 'Voltar ao leitor', 'Retour au lecteur', 'Torna al lettore', 'Zurück zum Leser'],
};

@Directive({ selector: '[appAutoTranslate]', standalone: true })
export class AutoTranslateDirective implements AfterViewInit, OnDestroy {
  private host: HTMLElement = inject(ElementRef).nativeElement;
  private language = inject(LanguageService);
  private backend = inject(BackendService);
  private observer?: MutationObserver;
  private originals = new WeakMap<Text, string>();
  private attributes = new WeakMap<Element, Map<string, string>>();
  private applying = false;
  private pending = new Set<string>();
  private translations = new Map<string, Map<string, string>>();
  private translationTimer?: ReturnType<typeof setTimeout>;
  private translating = false;
  private update = effect(() => { this.language.language(); queueMicrotask(() => this.translate()); });
  ngAfterViewInit() {
    this.observer = new MutationObserver(() => { if (!this.applying) this.translate(); });
    this.observer.observe(this.host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'placeholder', 'title'] });
    this.translate();
  }
  private canTranslate(element: Element) {
    return !element.closest('.recognized-text, .history-list, .place-list, [data-user-content]');
  }
  private languageTranslations(language = this.language.language()) {
    let stored = this.translations.get(language);
    if (!stored) {
      stored = new Map();
      try {
        const saved = JSON.parse(localStorage.getItem(`acces-ui-translations-${language}`) || '{}') as Record<string, string>;
        Object.entries(saved).forEach(([source, text]) => { if (typeof text === 'string') stored!.set(source, text); });
      } catch {}
      this.translations.set(language, stored);
    }
    return stored;
  }
  private value(value: string, element?: Element) {
    const language = this.language.language();
    const index = ['en-US', 'pt-BR', 'fr-FR', 'it-IT', 'de-DE'].indexOf(language);
    const leading = value.match(/^\s*/)?.[0] ?? '';
    const trailing = value.match(/\s*$/)?.[0] ?? '';
    const source = value.trim().replace(/\s+/g, ' ');
    if (language === 'es-PE' || !source || (element && !this.canTranslate(element))) return value;
    const cached = this.languageTranslations().get(source);
    if (cached) return leading + cached + trailing;
    const match = dictionary[source];
    if (match && index >= 0) return leading + match[index] + trailing;
    if (source.length <= 500 && /\p{L}/u.test(source)) {
      this.pending.add(source);
      this.scheduleTranslation();
    }
    return value;
  }
  private scheduleTranslation() {
    if (this.translating || this.translationTimer) return;
    this.translationTimer = setTimeout(() => {
      this.translationTimer = undefined;
      void this.translatePending();
    }, 0);
  }
  private async translatePending() {
    const language = this.language.language();
    if (language === 'es-PE' || this.translating || !this.pending.size) return;
    const phrases = [...this.pending].slice(0, 100);
    phrases.forEach(phrase => this.pending.delete(phrase));
    this.translating = true;
    try {
      const result = await this.backend.translateUi(language, phrases);
      const translations = this.languageTranslations();
      result.translations.forEach(({ source, text }) => {
        if (phrases.includes(source) && text.trim()) translations.set(source, text.trim());
      });
      try { localStorage.setItem(`acces-ui-translations-${language}`, JSON.stringify(Object.fromEntries(translations))); } catch {}
      if (this.language.language() === language) this.translate();
    } catch {
      // Existing vetted translations remain visible; unavailable translation never blocks the UI.
    } finally {
      this.translating = false;
      if (this.pending.size) this.scheduleTranslation();
    }
  }
  private translate() {
    if (!this.host.isConnected) return;
    this.applying = true;
    const walker = document.createTreeWalker(this.host, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const original = this.originals.get(node) ?? node.nodeValue ?? '';
      this.originals.set(node, original);
      const translated = this.value(original, node.parentElement ?? undefined);
      if (node.nodeValue !== translated) node.nodeValue = translated;
    }
    this.host.querySelectorAll<HTMLElement>('*').forEach(element => {
      for (const attribute of ['aria-label', 'placeholder', 'title']) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        let saved = this.attributes.get(element);
        if (!saved) this.attributes.set(element, saved = new Map());
        const original = saved.get(attribute) ?? current;
        saved.set(attribute, original);
        const translated = this.value(original, element);
        if (current !== translated) element.setAttribute(attribute, translated);
      }
    });
    this.applying = false;
  }
  ngOnDestroy() { this.update.destroy(); this.observer?.disconnect(); clearTimeout(this.translationTimer); }
}

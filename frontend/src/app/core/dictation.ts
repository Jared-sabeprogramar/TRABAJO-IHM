export function spokenDigits(text: string): string {
  const numbers: Record<string, string> = {
    cero: '0',
    uno: '1',
    un: '1',
    dos: '2',
    tres: '3',
    cuatro: '4',
    cinco: '5',
    seis: '6',
    siete: '7',
    ocho: '8',
    nueve: '9',
  };
  return text
    .toLowerCase()
    .replace(
      /\b(cero|uno|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g,
      (w) => numbers[w],
    )
    .replace(/[^0-9]/g, '');
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export function startDictation(
  onText: (s: string) => void,
  onError: (s: string) => void,
  onEnd: () => void,
): Recognition | null {
  const browser = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Constructor =
    browser.SpeechRecognition || browser.webkitSpeechRecognition;
  if (!Constructor) {
    onError(
      'Tu navegador no admite dictado. Usa el micrófono del teclado de tu celular o escribe.',
    );
    return null;
  }
  const r = new Constructor();
  r.lang = 'es-PE';
  r.continuous = false;
  r.interimResults = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = (e) =>
    onError(
      e.error === 'not-allowed'
        ? 'Permite el micrófono para dictar.'
        : 'No se pudo escuchar. Intenta de nuevo o escribe.',
    );
  r.onend = onEnd;
  try {
    r.start();
    return r;
  } catch {
    onError('No se pudo iniciar el micrófono.');
    return null;
  }
}

import { HttpError } from './http.ts';

export interface ChatMessage { role: 'user' | 'model'; text: string }
export interface RouteSummary { name: string; visits: number; distance: number }
export interface CommunityPlace { name: string; report_count: number; categories?: string[] }
export function chatInput(input: Record<string, unknown>) {
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 12)
    throw new HttpError(400, 'Envía entre uno y doce mensajes.');
  const messages: ChatMessage[] = input.messages.map((item) => {
    if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 2000)
      throw new HttpError(400, 'El mensaje no es válido o es demasiado largo.');
    return { role: item.role, text: item.text.trim() };
  });
  if (messages.at(-1)?.role !== 'user') throw new HttpError(400, 'Escribe tu consulta.');
  const routes: RouteSummary[] = [];
  if (input.routes !== undefined) {
    if (!Array.isArray(input.routes) || input.routes.length > 20) throw new HttpError(400, 'Historial de recorridos no válido.');
    for (const r of input.routes) {
      if (!r || typeof r.name !== 'string' || !r.name.trim() || r.name.length > 80 || !Number.isInteger(r.visits) || r.visits < 1 || r.visits > 1000 || !Number.isFinite(r.distance) || r.distance < 0 || r.distance > 100000)
        throw new HttpError(400, 'Resumen de recorrido no válido.');
      routes.push({ name: r.name.trim(), visits: r.visits, distance: Math.round(r.distance) });
    }
  }
  return { messages, routes };
}
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function basicReply(message: string, places: CommunityPlace[], routes: RouteSummary[]) {
  const query = normalize(message);
  if (/chiste|broma/.test(query)) return '¿Qué hace una abeja en el gimnasio? ¡Zum-ba! ¿Quieres consultar un lugar o tus recorridos?';
  if (/ruta|recorrido|camino/.test(query) && routes.length) {
    return 'En el historial que decidiste compartir, tus recorridos más frecuentes son: ' +
      [...routes].sort((a, b) => b.visits - a.visits).slice(0, 3).map(r => `${r.name}: ${r.visits} veces, aproximadamente ${r.distance} metros por recorrido`).join('; ') +
      '. Haber recorrido una ruta no confirma que sea accesible ahora. Puedes consultar las barreras en el mapa.';
  }
  const words = query.split(/\W+/).filter(w => w.length > 3 && !['lugar', 'lugares', 'quiero', 'puedes', 'sobre', 'donde', 'recomienda', 'reportes'].includes(w));
  const matches = places.filter(p => words.some(w => normalize(p.name).includes(w))).slice(0, 5);
  if (matches.length) return 'Según los reportes comunitarios: ' + matches.map(p => `${p.name}: ${p.report_count} reportes activos${p.categories?.length ? ' (' + p.categories.join(', ') + ')' : ''}`).join('; ') + '. Estos datos no certifican accesibilidad; revisa los detalles en el mapa.';
  if (/lugar|recom|mapa|barrera|rampa/.test(query)) return 'Indica el nombre del lugar que quieres consultar. Puedo revisar los lugares registrados en Acces, pero no certificar rutas accesibles ni buscar todos los comercios de la ciudad. Sin reportes no significa accesible.';
  return 'Estoy en modo básico: puedo consultar reportes por nombre, recordar los recorridos que compartas, contar un chiste y abrir las opciones de ayuda. La conversación libre con Gemini estará disponible cuando se configure su clave en el servidor. ¿Qué necesitas?';
}

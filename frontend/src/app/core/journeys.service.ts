import { Injectable, signal } from '@angular/core';

interface Point { lat: number; lng: number }
export interface Journey { id: string; name: string; distance: number; date: number; points: Point[] }
const storageKey = 'acces-journeys-v1';
export function distanceMeters(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const x = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, x)));
}
@Injectable({ providedIn: 'root' })
export class JourneysService {
  readonly saved = signal<Journey[]>([]);
  readonly recording = signal(false);
  readonly count = signal(0);
  readonly error = signal('');
  private watch?: number;
  private timer?: ReturnType<typeof setTimeout>;
  private points: Point[] = [];
  private name = '';
  constructor() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(parsed)) this.saved.set(parsed.filter(j => typeof j.name === 'string' && j.name.length <= 80 && typeof j.id === 'string' && Number.isFinite(j.distance) && j.distance >= 0 && j.date > Date.now() - 30 * 86400000 && Array.isArray(j.points)).slice(-20));
      this.persist();
    } catch { this.error.set('No se pudo leer el historial local.'); }
  }
  start(name: string) {
    if (this.recording()) return;
    this.error.set('');
    if (!name.trim()) { this.error.set('Da un nombre a tu recorrido.'); return; }
    if (!navigator.geolocation) { this.error.set('Tu navegador no ofrece ubicación.'); return; }
    this.name = name.trim().slice(0, 80);
    this.points = [];
    this.count.set(0);
    this.recording.set(true);
    this.watch = navigator.geolocation.watchPosition(p => {
      if (!this.recording() || p.coords.accuracy > 50) return;
      const point = { lat: p.coords.latitude, lng: p.coords.longitude };
      const previous = this.points.at(-1);
      if (previous && distanceMeters(previous, point) < 10) return;
      // Ignore GPS jumps faster than a plausible walking/wheelchair journey.
      if (previous && distanceMeters(previous, point) > 500) return;
      this.points.push(point);
      this.count.set(this.points.length);
      if (this.points.length >= 500) this.finish();
    }, () => {
      this.stop();
      this.points = [];
      this.count.set(0);
      this.error.set('No se pudo registrar la ubicación. Permite el GPS y vuelve a intentar. No se guardó el recorrido.');
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    this.timer = setTimeout(() => this.finish(), 30 * 60000);
  }
  finish() {
    this.stop();
    if (this.points.length < 2) { this.error.set('Se necesitan al menos dos puntos GPS distintos para guardar el recorrido.'); return; }
    const distance = Math.round(this.points.slice(1).reduce((n, p, i) => n + distanceMeters(this.points[i], p), 0));
    this.saved.update(items => [...items, { id: crypto.randomUUID(), name: this.name, distance, date: Date.now(), points: [...this.points] }].slice(-20));
    this.points = [];
    this.persist();
  }
  cancel() { this.stop(); this.points = []; this.count.set(0); }
  remove(id: string) { this.saved.update(items => items.filter(j => j.id !== id)); this.persist(); }
  summaries() {
    const groups = new Map<string, { name: string; visits: number; distance: number }>();
    for (const j of this.saved().filter(j => j.date > Date.now() - 30 * 86400000)) {
      const key = j.name.toLocaleLowerCase().trim();
      const r = groups.get(key) ?? { name: j.name, visits: 0, distance: 0 };
      r.visits++; r.distance += j.distance; groups.set(key, r);
    }
    return [...groups.values()].map(r => ({ ...r, distance: Math.round(r.distance / r.visits) }));
  }
  private stop() {
    if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
    clearTimeout(this.timer); this.watch = undefined; this.timer = undefined; this.recording.set(false);
  }
  private persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(this.saved())); }
    catch { this.error.set('No se pudo guardar en este dispositivo.'); }
  }
}

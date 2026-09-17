import { Injectable, signal } from '@angular/core';
export interface Reading {
  text: string;
  kind: 'text' | 'image';
  time: Date;
}
@Injectable({ providedIn: 'root' })
export class HistoryService {
  entries = signal<Reading[]>([]);
  add(text: string, kind: 'text' | 'image') {
    this.entries.update((v) =>
      [{ text, kind, time: new Date() }, ...v].slice(0, 20),
    );
  }
  clear() {
    this.entries.set([]);
  }
}

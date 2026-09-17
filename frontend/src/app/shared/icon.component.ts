import { Component, Input } from '@angular/core';
const paths: Record<string, string> = {
  scan: 'M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M7 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0m3 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  camera:
    'M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1m4 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
  volume: 'M11 4 6 8H2v8h4l5 4V4m4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  mute: 'M11 4 6 8H2v8h4l5 4V4m5 5 6 6m0-6-6 6',
  settings:
    'm9 3-1 3-3 1-2 4 2 3v3l4 2 3-1 3 1 4-2v-3l2-3-2-4-3-1-1-3H9m0 9a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  user: 'M8 6a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5m6-2v16m6-14v16',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4m-4 10 3 3 5-6',
  upload: 'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',
  text: 'M4 4h16M12 4v16m-4 0h8',
  image: 'M3 3h18v18H3V3m0 13 6-6 5 5 3-3 4 4M15 7h.01',
  check: 'm5 12 4 4L19 6',
  pause: 'M8 4v16m8-16v16',
  play: 'm7 3 14 9-14 9V3',
  stop: 'M5 5h14v14H5V5',
  repeat: 'M3 11a9 9 0 1 1 2 7M3 4v7h7',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5m-4 6v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8',
  close: 'm6 6 12 12M6 18 18 6',
  pin: 'M12 22s8-8 8-13a8 8 0 1 0-16 0c0 5 8 13 8 13m-3-13a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  locate: 'M12 2v4m0 12v4M2 12h4m12 0h4M5 12a7 7 0 1 0 14 0 7 7 0 1 0-14 0',
  alert: 'm12 3 10 18H2L12 3m0 6v5m0 3v1',
  plus: 'M12 4v16M4 12h16',
  wheel:
    'M10 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0m2 3v7h6l3 6M12 10h5M8 11a6 6 0 1 0 8 7',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  info: 'M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0m10-2v7m0-11v1',
};
@Component({
  selector: 'app-icon',
  standalone: true,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path"/></svg>',
  styles: [
    ':host{display:inline-flex;flex-shrink:0;width:1.25em;height:1.25em;align-items:center}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  @Input() name = 'scan';
  get path() {
    return paths[this.name] || paths['info'];
  }
}

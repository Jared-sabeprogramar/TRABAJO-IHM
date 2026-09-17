import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    title: 'Acces · Lector visual',
    loadComponent: () =>
      import('./features/reader/reader.component').then(
        (m) => m.ReaderComponent,
      ),
  },
  {
    path: 'mapa',
    title: 'Acces · Mapa accesible',
    loadComponent: () =>
      import('./features/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'acceder',
    title: 'Acces · Acceder con DNI',
    loadComponent: () =>
      import('./features/access/access.component').then(
        (m) => m.AccessComponent,
      ),
  },
  {
    path: 'recientes',
    title: 'Acces · Mis lecturas',
    loadComponent: () =>
      import('./features/reader/history.component').then(
        (m) => m.HistoryComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];

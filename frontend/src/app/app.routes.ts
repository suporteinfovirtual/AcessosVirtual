import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./pages/painel/painel.component').then((m) => m.PainelComponent),
  },
  { path: '**', redirectTo: '' },
];

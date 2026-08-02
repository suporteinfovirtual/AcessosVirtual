import { Injectable, signal } from '@angular/core';

export type ModoVisualizacao = 'grade' | 'lista';

const CHAVE_STORAGE = 'acessos:modo-visualizacao';

function lerModoSalvo(): ModoVisualizacao {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    return salvo === 'lista' ? 'lista' : 'grade';
  } catch {
    return 'grade';
  }
}

@Injectable({ providedIn: 'root' })
export class ViewModeService {
  modo = signal<ModoVisualizacao>(lerModoSalvo());

  alternar() {
    const novo = this.modo() === 'grade' ? 'lista' : 'grade';
    this.modo.set(novo);
    try {
      localStorage.setItem(CHAVE_STORAGE, novo);
    } catch {
      // localStorage indisponível — mantém só em memória
    }
  }
}

import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  mensagem: string;
  tipo: 'sucesso' | 'erro';
}

let proximoId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  sucesso(mensagem: string) {
    this.mostrar(mensagem, 'sucesso');
  }

  erro(mensagem: string) {
    this.mostrar(mensagem, 'erro');
  }

  fechar(id: number) {
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(mensagem: string, tipo: Toast['tipo']) {
    const id = proximoId++;
    this.toasts.update((lista) => [...lista, { id, mensagem, tipo }]);
    setTimeout(() => this.fechar(id), 2800);
  }
}

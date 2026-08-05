import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  mensagem: string;
  confirmarTexto: string;
  perigo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  estado = signal<ConfirmState | null>(null);
  private resolver: ((valor: boolean) => void) | null = null;

  // substitui o confirm() nativo do navegador por um modal no estilo do painel — resolve
  // true/false igual o confirm() original, então dá pra usar como "if (!(await confirmar(...))) return;"
  confirmar(mensagem: string, opcoes?: { confirmarTexto?: string; perigo?: boolean }): Promise<boolean> {
    this.responderPendente(false);
    this.estado.set({
      mensagem,
      confirmarTexto: opcoes?.confirmarTexto ?? 'Excluir',
      perigo: opcoes?.perigo ?? true,
    });
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  responder(valor: boolean) {
    this.estado.set(null);
    this.responderPendente(valor);
  }

  private responderPendente(valor: boolean) {
    this.resolver?.(valor);
    this.resolver = null;
  }
}

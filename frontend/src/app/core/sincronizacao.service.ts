import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const INTERVALO_MS = 10_000;

// Mantém os vários computadores em dia sem F5: consulta periodicamente a versão
// global dos dados (/api/sincronizacao) e, quando muda, incrementa `mudancas` —
// as telas escutam via aoSincronizar() e recarregam em silêncio.
@Injectable({ providedIn: 'root' })
export class SincronizacaoService {
  private http = inject(HttpClient);

  readonly mudancas = signal(0);

  private versaoConhecida: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private consultando = false;

  private aoVoltarPraAba = () => {
    if (document.visibilityState === 'visible') this.verificar();
  };

  iniciar() {
    if (this.timer) return;
    this.timer = setInterval(() => this.verificar(), INTERVALO_MS);
    document.addEventListener('visibilitychange', this.aoVoltarPraAba);
    this.verificar();
  }

  parar() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.versaoConhecida = null;
    document.removeEventListener('visibilitychange', this.aoVoltarPraAba);
  }

  private async verificar() {
    // aba em segundo plano não consulta; ao voltar pra ela, o visibilitychange verifica na hora
    if (this.consultando || document.visibilityState !== 'visible') return;
    this.consultando = true;
    try {
      const { versao } = await firstValueFrom(this.http.get<{ versao: number }>('/api/sincronizacao'));
      if (this.versaoConhecida !== null && versao !== this.versaoConhecida) {
        this.mudancas.update((n) => n + 1);
      }
      this.versaoConhecida = versao;
    } catch {
      // sem rede ou sessão expirada: tenta de novo no próximo ciclo
    } finally {
      this.consultando = false;
    }
  }
}

// Chama `recarregar` sempre que outro computador (ou esta aba) gravar algo.
// Precisa rodar em contexto de injeção (ex.: inicializador de campo do componente);
// o efeito é destruído junto com o componente.
export function aoSincronizar(recarregar: () => unknown) {
  const sincronizacao = inject(SincronizacaoService);
  let primeira = true;
  effect(() => {
    sincronizacao.mudancas();
    if (primeira) {
      primeira = false;
      return;
    }
    untracked(() => Promise.resolve(recarregar()).catch(() => {}));
  });
}

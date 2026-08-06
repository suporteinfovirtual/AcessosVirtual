import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Cliente,
  ClienteNegociacao,
  ClientePendenteFaturamento,
  Implantacao,
  STATUS_NEGOCIACAO,
  TIPOS_ACESSO,
  TipoAcesso,
} from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { ImplantacoesService } from '../../../../core/implantacoes.service';
import { FaturamentoService } from '../../../../core/faturamento.service';
import { statusCertificado } from '../../../../core/certificado.util';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { CardComponent } from '../../../../shared/card.component';

function formatarDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export type SecaoGestao = 'clientesSistemas' | 'negociacao' | 'implantacao' | 'faturamento';

interface NegociacaoParada {
  cliente: ClienteNegociacao;
  dias: number;
}

interface SegmentoAcesso {
  tipo: TipoAcesso;
  rotulo: string;
  valor: number;
  percentual: number;
  cor: string;
  dasharray: string;
  dashoffset: number;
}

const DIAS_PARADA_ALERTA = 7;
const LIMITE_LISTA = 6;

// donut "Distribuição de acessos": zeta fica com o laranja de marca (maior valor hoje);
// as outras duas ficam em cinza-zinco — a atribuição é fixa por sistema, não por
// posição/ranking, pra cor nunca "pular" de sistema se as contagens mudarem
const CORES_ACESSO: Record<TipoAcesso, string> = {
  acesso_zeta: '#ff7a1a',
  acesso_web: '#a1a1aa',
  anydesk: '#52525b',
};

const DONUT_TAMANHO = 140;
const DONUT_ESPESSURA = 18;
const DONUT_RAIO = (DONUT_TAMANHO - DONUT_ESPESSURA) / 2;
const DONUT_CIRCUNFERENCIA = 2 * Math.PI * DONUT_RAIO;
const DONUT_ESPACO = 4;

@Component({
  selector: 'app-resumo-panel',
  imports: [SkeletonComponent, CardComponent],
  templateUrl: './resumo-panel.component.html',
})
export class ResumoPanelComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private negociacaoService = inject(NegociacaoService);
  private implantacoesService = inject(ImplantacoesService);
  private faturamentoService = inject(FaturamentoService);

  irPara = output<SecaoGestao>();
  irParaAba = output<TipoAcesso>();
  novoCliente = output<void>();
  novaNegociacao = output<void>();

  readonly tiposAcesso = TIPOS_ACESSO;
  readonly statusOpcoes = STATUS_NEGOCIACAO;
  readonly donutTamanho = DONUT_TAMANHO;
  readonly donutRaio = DONUT_RAIO;
  readonly donutEspessura = DONUT_ESPESSURA;

  carregando = signal(true);

  clientes = signal<Cliente[]>([]);
  negociacoes = signal<ClienteNegociacao[]>([]);
  implantacoes = signal<Implantacao[]>([]);
  pendentesFaturamento = signal<ClientePendenteFaturamento[]>([]);

  emNegociacao = computed(() => this.negociacoes().filter((n) => n.status === 'em_negociacao').length);

  implantacoesSemana = computed(() => {
    const hoje = formatarDataIso(new Date());
    const daquiA7Dias = formatarDataIso(new Date(Date.now() + 7 * 86_400_000));
    return this.implantacoes().filter((i) => i.data >= hoje && i.data <= daquiA7Dias).length;
  });

  prontosParaFaturar = computed(() => this.pendentesFaturamento().length);

  certificadosVencidos = computed(
    () => this.clientes().filter((c) => statusCertificado(c.certificado?.validade) === 'vencido').length
  );
  certificadosAlerta = computed(
    () => this.clientes().filter((c) => statusCertificado(c.certificado?.validade) === 'alerta').length
  );
  temAtencaoCertificados = computed(() => this.certificadosVencidos() + this.certificadosAlerta() > 0);

  negociacoesParadas = computed<NegociacaoParada[]>(() => {
    const agora = Date.now();
    return this.negociacoes()
      .filter((n) => n.status === 'em_negociacao')
      .map((n) => {
        const ultimaAtualizacao = n.atualizado_em || n.criado_em;
        const dias = ultimaAtualizacao ? Math.floor((agora - new Date(ultimaAtualizacao).getTime()) / 86_400_000) : 0;
        return { cliente: n, dias };
      })
      .filter((n) => n.dias >= DIAS_PARADA_ALERTA)
      .sort((a, b) => b.dias - a.dias);
  });

  implantacoesAtrasadas = computed(() => {
    const hoje = formatarDataIso(new Date());
    return this.implantacoes()
      .filter((i) => i.data < hoje && !i.concluida_manual)
      .sort((a, b) => a.data.localeCompare(b.data));
  });

  proximasImplantacoes = computed(() => {
    const hoje = formatarDataIso(new Date());
    const daquiA7Dias = formatarDataIso(new Date(Date.now() + 7 * 86_400_000));
    return this.implantacoes()
      .filter((i) => i.data >= hoje && i.data <= daquiA7Dias)
      .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora))
      .slice(0, LIMITE_LISTA);
  });

  negociacoesRecentes = computed(() => {
    return [...this.negociacoes()]
      .sort((a, b) => {
        const dataA = a.atualizado_em || a.criado_em || '';
        const dataB = b.atualizado_em || b.criado_em || '';
        return dataB.localeCompare(dataA);
      })
      .slice(0, LIMITE_LISTA);
  });

  contagemPorTipoAcesso = computed(() => {
    const contagem: Record<TipoAcesso, number> = { anydesk: 0, acesso_web: 0, acesso_zeta: 0 };
    for (const cliente of this.clientes()) {
      for (const acesso of cliente.acessos || []) {
        contagem[acesso.tipo]++;
      }
    }
    return contagem;
  });

  donutTotal = computed(() => {
    const contagem = this.contagemPorTipoAcesso();
    return this.tiposAcesso.reduce((soma, tipo) => soma + contagem[tipo.valor], 0);
  });

  // arcos do donut "Distribuição de acessos" — dasharray/dashoffset em stroke-dasharray
  // pra desenhar cada fatia como um trecho do círculo, com um respiro (DONUT_ESPACO)
  // entre elas em vez de traçar uma borda separando as fatias
  donutSegments = computed<SegmentoAcesso[]>(() => {
    const contagem = this.contagemPorTipoAcesso();
    const total = this.donutTotal();
    if (total === 0) return [];

    let acumulado = 0;
    return this.tiposAcesso.map((tipo) => {
      const valor = contagem[tipo.valor];
      const comprimento = (valor / total) * DONUT_CIRCUNFERENCIA;
      const segmento: SegmentoAcesso = {
        tipo: tipo.valor,
        rotulo: tipo.rotulo,
        valor,
        percentual: Math.round((valor / total) * 100),
        cor: CORES_ACESSO[tipo.valor],
        dasharray: `${Math.max(comprimento - DONUT_ESPACO, 0)} ${DONUT_CIRCUNFERENCIA}`,
        dashoffset: -acumulado,
      };
      acumulado += comprimento;
      return segmento;
    });
  });

  rotuloStatus(status?: string): string {
    return this.statusOpcoes.find((s) => s.valor === status)?.rotulo ?? '';
  }

  corStatus(status?: string): string {
    if (status === 'fechou') return 'bg-emerald-500/15 text-emerald-400';
    if (status === 'desistiu') return 'bg-rose-500/15 text-rose-400';
    return 'bg-zinc-800 text-zinc-400';
  }

  ngOnInit() {
    this.carregar();
  }

  formatarDataBr(dataIso: string): string {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  diasAtras(dataIso?: string | null): number {
    if (!dataIso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(dataIso).getTime()) / 86_400_000));
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const [clientes, negociacoes, implantacoes, pendentesFaturamento] = await Promise.all([
        firstValueFrom(this.clientesService.listar()),
        firstValueFrom(this.negociacaoService.listar()),
        firstValueFrom(this.implantacoesService.listar()),
        firstValueFrom(this.faturamentoService.listarPendentes()),
      ]);
      this.clientes.set(clientes);
      this.negociacoes.set(negociacoes);
      this.implantacoes.set(implantacoes);
      this.pendentesFaturamento.set(pendentesFaturamento);
    } finally {
      this.carregando.set(false);
    }
  }
}

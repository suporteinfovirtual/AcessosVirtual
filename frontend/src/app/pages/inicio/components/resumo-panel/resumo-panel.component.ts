import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Cliente,
  ClienteNegociacao,
  ClientePendenteFaturamento,
  Implantacao,
  SISTEMAS,
  STATUS_NEGOCIACAO,
  Sistema,
  TIPOS_ACESSO,
  TipoAcesso,
} from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { ImplantacoesService } from '../../../../core/implantacoes.service';
import { FaturamentoService } from '../../../../core/faturamento.service';
import { EnviosContabilidadeService } from '../../../../core/envios-contabilidade.service';
import { statusCertificado } from '../../../../core/certificado.util';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { CardComponent } from '../../../../shared/card.component';

function formatarDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export type SecaoGestao = 'clientesSistemas' | 'enviosContabilidade' | 'negociacao' | 'implantacao' | 'faturamento';

interface CertificadoVencendo {
  cliente: Cliente;
  dias: number;
}

interface TooltipDonut {
  seg: SegmentoSistema;
  x: number;
  y: number;
}

interface SegmentoSistema {
  sistema: Sistema;
  rotulo: string;
  valor: number;
  percentual: number;
  cor: string;
  dasharray: string;
  dashoffset: number;
}

const LIMITE_LISTA = 5;

// donut "Distribuição de clientes por sistema": zeta fica com o laranja de marca (maior
// valor hoje); os outros três ficam em cinza-zinco — a atribuição é fixa por sistema, não
// por posição/ranking, pra cor nunca "pular" de sistema se as contagens mudarem
const CORES_SISTEMA: Record<Sistema, string> = {
  zeta: '#ff7a1a',
  uniplus_web: '#a1a1aa',
  uniplus: '#71717a',
  sgbr: '#52525b',
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
  private clientesSistemasService = inject(ClientesSistemasService);
  private negociacaoService = inject(NegociacaoService);
  private implantacoesService = inject(ImplantacoesService);
  private faturamentoService = inject(FaturamentoService);
  private enviosContabilidadeService = inject(EnviosContabilidadeService);

  irPara = output<SecaoGestao>();
  irParaAba = output<TipoAcesso>();
  irParaSistema = output<Sistema>();

  readonly tiposAcesso = TIPOS_ACESSO;
  readonly sistemas = SISTEMAS;
  readonly statusOpcoes = STATUS_NEGOCIACAO;
  readonly donutTamanho = DONUT_TAMANHO;
  readonly donutRaio = DONUT_RAIO;
  readonly donutEspessura = DONUT_ESPESSURA;

  carregando = signal(true);

  clientes = signal<Cliente[]>([]);
  negociacoes = signal<ClienteNegociacao[]>([]);
  implantacoes = signal<Implantacao[]>([]);
  pendentesFaturamento = signal<ClientePendenteFaturamento[]>([]);
  statusEnviosContabilidadeMes = signal<Map<number, boolean>>(new Map());
  totalClientesUniplus = signal(0);
  totalClientesSgbr = signal(0);

  emNegociacao = computed(() => this.negociacoes().filter((n) => n.status === 'em_negociacao').length);

  // ClienteNegociacao tem criado_em confiável: quantos dos que estão em negociação
  // hoje entraram (foram criados) nos últimos 7 dias
  negociacoesNovasSemana = computed(() => {
    const seteDiasAtras = Date.now() - 7 * 86_400_000;
    return this.negociacoes().filter(
      (n) => n.status === 'em_negociacao' && n.criado_em && new Date(n.criado_em).getTime() >= seteDiasAtras
    ).length;
  });

  implantacoesDaSemana = computed(() => {
    const hoje = formatarDataIso(new Date());
    const daquiA7Dias = formatarDataIso(new Date(Date.now() + 7 * 86_400_000));
    return this.implantacoes().filter((i) => i.data >= hoje && i.data <= daquiA7Dias);
  });

  implantacoesSemana = computed(() => this.implantacoesDaSemana().length);

  // Implantacao tem criado_em confiável: quantas das agendadas pra essa semana foram
  // registradas nos últimos 7 dias (agenda recém-marcada, não a data do compromisso em si)
  implantacoesSemanaAgendadasRecentemente = computed(() => {
    const seteDiasAtras = Date.now() - 7 * 86_400_000;
    return this.implantacoesDaSemana().filter(
      (i) => i.criado_em && new Date(i.criado_em).getTime() >= seteDiasAtras
    ).length;
  });

  // "Prontos pra faturar" vem de uma consulta calculada na hora (agregação sobre
  // implantacoes), sem registro próprio — não existe criado_em confiável aqui, então
  // não dá pra saber "quantos entraram nessa janela" sem inventar um critério
  prontosParaFaturar = computed(() => this.pendentesFaturamento().length);

  // mesmo critério do módulo Envios contabilidade: um envio por acesso marcado com
  // "enviar para a contabilidade", pendente quando não está marcado como enviado no mês atual
  pendentesEnvioContabilidade = computed(() => {
    const mapa = this.statusEnviosContabilidadeMes();
    const clientesPendentes = new Set<number>();
    for (const cliente of this.clientes()) {
      for (const acesso of cliente.acessos || []) {
        if (acesso.enviar_contabilidade && acesso.contabilidade_id && !mapa.get(acesso.id!)) {
          clientesPendentes.add(cliente.id!);
        }
      }
    }
    return clientesPendentes.size;
  });

  certificadosVencidos = computed(
    () => this.clientes().filter((c) => statusCertificado(c.certificado?.validade) === 'vencido').length
  );
  certificadosAlerta = computed(
    () => this.clientes().filter((c) => statusCertificado(c.certificado?.validade) === 'alerta').length
  );
  temAtencaoCertificados = computed(() => this.certificadosVencidos() + this.certificadosAlerta() > 0);

  certificadosVencendo = computed<CertificadoVencendo[]>(() => {
    return this.clientes()
      .filter((c) => statusCertificado(c.certificado?.validade) !== null)
      .map((c) => ({
        cliente: c,
        dias: Math.floor((new Date(c.certificado!.validade as string).getTime() - Date.now()) / 86_400_000),
      }))
      .sort((a, b) => a.dias - b.dias);
  });

  // certificado não tem criado_em (só atualizado_em, que muda a cada reupload/renovação e
  // não representa "novo"); em vez de "novos essa semana", mostra os que vencem em breve —
  // contexto que usa só a validade já existente, sem precisar de histórico
  certificadosVencendoProximos7Dias = computed(
    () => this.certificadosVencendo().filter((c) => c.dias >= 0 && c.dias <= 7).length
  );

  implantacoesAtrasadas = computed(() => {
    const hoje = formatarDataIso(new Date());
    return this.implantacoes()
      .filter((i) => i.data < hoje && !i.concluida_manual)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, LIMITE_LISTA);
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

  // uniplus_web e zeta são "unificados" com a tabela clientes/acessos (mesmo mapeamento
  // usado em inicio.component.ts e clientes-sistemas.component.ts); uniplus e sgbr vêm
  // da tabela clientes_sistemas, carregada à parte em carregar()
  contagemPorSistema = computed<Record<Sistema, number>>(() => {
    const contagemAcessos = this.contagemPorTipoAcesso();
    return {
      uniplus: this.totalClientesUniplus(),
      uniplus_web: contagemAcessos.acesso_web,
      sgbr: this.totalClientesSgbr(),
      zeta: contagemAcessos.acesso_zeta,
    };
  });

  donutTotal = computed(() => {
    const contagem = this.contagemPorSistema();
    return this.sistemas.reduce((soma, sistema) => soma + contagem[sistema.valor], 0);
  });

  // arcos do donut "Distribuição de clientes por sistema" — dasharray/dashoffset em
  // stroke-dasharray pra desenhar cada fatia como um trecho do círculo, com um respiro
  // (DONUT_ESPACO) entre elas em vez de traçar uma borda separando as fatias
  donutSegments = computed<SegmentoSistema[]>(() => {
    const contagem = this.contagemPorSistema();
    const total = this.donutTotal();
    if (total === 0) return [];

    let acumulado = 0;
    return this.sistemas.map((sistema) => {
      const valor = contagem[sistema.valor];
      const comprimento = (valor / total) * DONUT_CIRCUNFERENCIA;
      const segmento: SegmentoSistema = {
        sistema: sistema.valor,
        rotulo: sistema.rotulo,
        valor,
        percentual: Math.round((valor / total) * 100),
        cor: CORES_SISTEMA[sistema.valor],
        dasharray: `${Math.max(comprimento - DONUT_ESPACO, 0)} ${DONUT_CIRCUNFERENCIA}`,
        dashoffset: -acumulado,
      };
      acumulado += comprimento;
      return segmento;
    });
  });

  // tooltip do donut: SVG puro, sem lib de gráfico, então a posição é calculada à mão
  // em relação ao container (não ao <svg>, que tem a rotação -90° só de exibição)
  donutTooltip = signal<TooltipDonut | null>(null);

  aoPassarMouseSegmento(event: MouseEvent, seg: SegmentoSistema) {
    const container = (event.currentTarget as SVGElement).closest('.donut-container') as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    this.donutTooltip.set({ seg, x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  aoSairMouseSegmento() {
    this.donutTooltip.set(null);
  }

  rotuloDiasCertificado(dias: number): string {
    if (dias < 0) {
      const passados = -dias;
      return `Vencido há ${passados} ${passados === 1 ? 'dia' : 'dias'}`;
    }
    if (dias === 0) return 'Vence hoje';
    return `${dias} ${dias === 1 ? 'dia restante' : 'dias restantes'}`;
  }

  corDiasCertificado(dias: number): string {
    return dias < 0 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400';
  }

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
      const hoje = new Date();
      const [clientes, negociacoes, implantacoes, pendentesFaturamento, statusEnviosContabilidade, clientesUniplus, clientesSgbr] =
        await Promise.all([
          firstValueFrom(this.clientesService.listar()),
          firstValueFrom(this.negociacaoService.listar()),
          firstValueFrom(this.implantacoesService.listar()),
          firstValueFrom(this.faturamentoService.listarPendentes()),
          firstValueFrom(this.enviosContabilidadeService.listarStatusMes(hoje.getFullYear(), hoje.getMonth() + 1)),
          firstValueFrom(this.clientesSistemasService.listar('uniplus')),
          firstValueFrom(this.clientesSistemasService.listar('sgbr')),
        ]);
      this.clientes.set(clientes);
      this.negociacoes.set(negociacoes);
      this.implantacoes.set(implantacoes);
      this.pendentesFaturamento.set(pendentesFaturamento);
      this.statusEnviosContabilidadeMes.set(new Map(statusEnviosContabilidade.map((s) => [s.acesso_id, !!s.enviado])));
      this.totalClientesUniplus.set(clientesUniplus.length);
      this.totalClientesSgbr.set(clientesSgbr.length);
    } finally {
      this.carregando.set(false);
    }
  }
}

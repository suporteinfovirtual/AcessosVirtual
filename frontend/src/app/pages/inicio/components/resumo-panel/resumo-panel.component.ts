import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Cliente,
  ClienteNegociacao,
  ClientePendenteFaturamento,
  Implantacao,
  Instalacao,
  SISTEMAS,
  Sistema,
  TIPOS_ACESSO,
  TipoAcesso,
} from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { ImplantacoesService } from '../../../../core/implantacoes.service';
import { InstalacoesService } from '../../../../core/instalacoes.service';
import { FaturamentoService } from '../../../../core/faturamento.service';
import { EnviosContabilidadeService } from '../../../../core/envios-contabilidade.service';
import { statusCertificado } from '../../../../core/certificado.util';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { ContadorAnimadoDirective } from '../../../../shared/contador-animado.directive';
import { GraficoAnimadoDirective } from '../../../../shared/grafico-animado.directive';
import { aoSincronizar } from '../../../../core/sincronizacao.service';

function formatarDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export type SecaoGestao = 'clientesSistemas' | 'enviosContabilidade' | 'negociacao' | 'instalacao' | 'implantacao' | 'faturamento';

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

interface SegmentoContabilidade {
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
  dasharray: string;
  dashoffset: number;
}

interface GraficoNovosClientes {
  linha: string;
  area: string;
  pontoFinalX: number;
  pontoFinalY: number;
  total: number;
  pico: number;
  rotulos: { texto: string; x: number }[];
}

export type ChaveOperacional = 'contabilidade' | 'faturamento' | 'implantacao' | 'negociacao' | 'instalacao';

interface LinhaOperacional {
  chave: ChaveOperacional;
  rotulo: string;
  descricao: string;
  valor: number;
  // destaque só pra pendência que trava o mês; "em negociação" é fluxo normal, não alerta
  destaque: boolean;
  secao: SecaoGestao;
  acao: string;
}

interface BarraContabilidade extends SegmentoContabilidade {
  largura: number;
}

const LIMITE_LISTA = 5;
const NAO_INFORMADO = 'Não informado';
const OUTRAS_CONTABILIDADES = 'Outras contabilidades';
const TOP_CONTABILIDADES = 6;

// donut "Distribuição de clientes por sistema": zeta fica com o laranja de marca (maior
// valor hoje); os outros três ficam em cinza-zinco — a atribuição é fixa por sistema, não
// por posição/ranking, pra cor nunca "pular" de sistema se as contagens mudarem
const CORES_SISTEMA: Record<Sistema, string> = {
  zeta: '#ff7a1a',
  uniplus_web: '#a1a1aa',
  uniplus: '#71717a',
  sgbr: '#52525b',
};

// donut "Distribuição de clientes por contabilidade": a contabilidade com mais clientes
// fica com o laranja de marca, o resto cicla por tons de cinza-zinco (do mais claro pro mais
// escuro, sem chegar no tom do trilho de fundo) — "Não informado" sempre num cinza fixo à
// parte, pra ficar claro que é dado faltando, não mais uma contabilidade
const CORES_CONTABILIDADE = ['#ff7a1a', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'];
const COR_NAO_INFORMADO = '#3f3f46';

// O gráfico do topo mostra NOVOS clientes por dia, não o total acumulado: 311 dos 321
// clientes entraram juntos na carga inicial, então uma linha acumulada seria reta e um
// "% vs mês anterior" daria -96%, que é artefato da importação e não movimento real.
const DIAS_GRAFICO = 30;
const GRAFICO_LARGURA = 620;
const GRAFICO_ALTURA = 150;

const MESES_LONGOS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const DONUT_TAMANHO = 140;
const DONUT_ESPESSURA = 18;
const DONUT_RAIO = (DONUT_TAMANHO - DONUT_ESPESSURA) / 2;
const DONUT_CIRCUNFERENCIA = 2 * Math.PI * DONUT_RAIO;
const DONUT_ESPACO = 4;

@Component({
  selector: 'app-resumo-panel',
  imports: [SkeletonComponent, ContadorAnimadoDirective, GraficoAnimadoDirective],
  templateUrl: './resumo-panel.component.html',
})
export class ResumoPanelComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private clientesSistemasService = inject(ClientesSistemasService);
  private negociacaoService = inject(NegociacaoService);
  private implantacoesService = inject(ImplantacoesService);
  private instalacoesService = inject(InstalacoesService);
  private faturamentoService = inject(FaturamentoService);
  private enviosContabilidadeService = inject(EnviosContabilidadeService);

  irPara = output<SecaoGestao>();
  irParaAba = output<TipoAcesso>();
  irParaSistema = output<Sistema>();

  readonly tiposAcesso = TIPOS_ACESSO;
  readonly sistemas = SISTEMAS;
  readonly donutTamanho = DONUT_TAMANHO;
  readonly donutRaio = DONUT_RAIO;
  readonly donutEspessura = DONUT_ESPESSURA;

  carregando = signal(true);
  // quantas das consultas do resumo não responderam na última carga
  consultasComFalha = signal(0);

  clientes = signal<Cliente[]>([]);
  negociacoes = signal<ClienteNegociacao[]>([]);
  implantacoes = signal<Implantacao[]>([]);
  instalacoes = signal<Instalacao[]>([]);
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

  prontosParaInstalar = computed(() => this.instalacoes().filter((i) => !i.instalado).length);

  // Instalacao tem criado_em confiável: quantas das "a instalar" entraram (foram
  // enviadas pra instalação) nos últimos 7 dias, mesmo critério de negociacoesNovasSemana
  instalacoesNovasSemana = computed(() => {
    const seteDiasAtras = Date.now() - 7 * 86_400_000;
    return this.instalacoes().filter(
      (i) => !i.instalado && i.criado_em && new Date(i.criado_em).getTime() >= seteDiasAtras
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

  // "distribuição de clientes por contabilidade": pra cada cliente, usa a contabilidade do
  // primeiro acesso que tiver uma vinculada (anydesk/acesso_web/acesso_zeta praticamente não
  // se sobrepõem por cliente, então não há double-count na prática); sem nenhuma, cai em
  // "Não informado". Mostra as top N contabilidades e agrupa o resto em "Outras" — com ~36
  // contabilidades cadastradas e várias com só 1-2 clientes, listar todas viraria ilegível
  contagemPorContabilidade = computed(() => {
    const contagem = new Map<string, number>();
    for (const cliente of this.clientes()) {
      const acessoComContabilidade = cliente.acessos?.find((a) => a.contabilidade_id);
      const nome = acessoComContabilidade?.contabilidade_nome || NAO_INFORMADO;
      contagem.set(nome, (contagem.get(nome) || 0) + 1);
    }
    return contagem;
  });

  donutContabilidadeTotal = computed(() => this.clientes().length);

  // arcos do donut "Distribuição de clientes por contabilidade" — mesma técnica de
  // stroke-dasharray do donut de sistema, mas com um número variável de fatias (top N
  // contabilidades + "Outras" + "Não informado", em vez de 4 categorias fixas)
  donutContabilidadeSegments = computed<SegmentoContabilidade[]>(() => {
    const contagem = this.contagemPorContabilidade();
    const total = this.donutContabilidadeTotal();
    if (total === 0) return [];

    const naoInformado = contagem.get(NAO_INFORMADO) || 0;
    const demais = [...contagem.entries()]
      .filter(([nome]) => nome !== NAO_INFORMADO)
      .sort((a, b) => b[1] - a[1]);

    const principais = demais.slice(0, TOP_CONTABILIDADES);
    const outras = demais.slice(TOP_CONTABILIDADES).reduce((soma, [, valor]) => soma + valor, 0);

    const linhas: [string, number, string][] = principais.map(([nome, valor], i) => [
      nome,
      valor,
      CORES_CONTABILIDADE[i % CORES_CONTABILIDADE.length],
    ]);
    if (outras > 0) linhas.push([OUTRAS_CONTABILIDADES, outras, CORES_CONTABILIDADE[linhas.length % CORES_CONTABILIDADE.length]]);
    if (naoInformado > 0) linhas.push([NAO_INFORMADO, naoInformado, COR_NAO_INFORMADO]);

    let acumulado = 0;
    return linhas.map(([nome, valor, cor]) => {
      const comprimento = (valor / total) * DONUT_CIRCUNFERENCIA;
      const segmento: SegmentoContabilidade = {
        nome,
        valor,
        percentual: Math.round((valor / total) * 100),
        cor,
        dasharray: `${Math.max(comprimento - DONUT_ESPACO, 0)} ${DONUT_CIRCUNFERENCIA}`,
        dashoffset: -acumulado,
      };
      acumulado += comprimento;
      return segmento;
    });
  });

  // --- topo: total da base e movimento recente ---

  saudacao = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    return hora < 18 ? 'Boa tarde' : 'Boa noite';
  });

  dataPorExtenso = computed(() => {
    const hoje = new Date();
    return `${hoje.getDate()} de ${MESES_LONGOS[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  });

  // Novos clientes por dia nos últimos 30 dias. A escala do eixo Y vai de 0 até o pico do
  // período, pra um dia de 3 cadastros não parecer um pico enorme só por ser o maior.
  graficoNovosClientes = computed<GraficoNovosClientes>(() => {
    const hoje = new Date();
    const dias: { iso: string; data: Date; total: number }[] = [];
    for (let i = DIAS_GRAFICO - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
      dias.push({ iso: formatarDataIso(data), data, total: 0 });
    }

    const indicePorIso = new Map(dias.map((dia, indice) => [dia.iso, indice]));
    for (const cliente of this.clientes()) {
      // criado_em vem como "2026-09-18 13:32:18"; só a data interessa aqui
      const iso = cliente.criado_em?.slice(0, 10);
      const indice = iso === undefined ? undefined : indicePorIso.get(iso);
      if (indice !== undefined) dias[indice].total++;
    }

    const pico = Math.max(1, ...dias.map((dia) => dia.total));
    const pontos = dias.map((dia, indice) => ({
      x: (indice / (DIAS_GRAFICO - 1)) * GRAFICO_LARGURA,
      y: GRAFICO_ALTURA - (dia.total / pico) * GRAFICO_ALTURA,
    }));

    const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const ultimo = pontos[pontos.length - 1];

    const rotulos = [0, 10, 20, DIAS_GRAFICO - 1].map((indice) => ({
      texto: `${dias[indice].data.getDate()} ${MESES_CURTOS[dias[indice].data.getMonth()]}`,
      x: pontos[indice].x,
    }));

    return {
      linha,
      area: `${linha} L${GRAFICO_LARGURA},${GRAFICO_ALTURA} L0,${GRAFICO_ALTURA} Z`,
      pontoFinalX: ultimo.x,
      pontoFinalY: ultimo.y,
      total: dias.reduce((soma, dia) => soma + dia.total, 0),
      pico,
      rotulos,
    };
  });

  novosClientes30Dias = computed(() => this.graficoNovosClientes().total);

  // --- lista "Acompanhamento operacional" ---

  linhasOperacionais = computed<LinhaOperacional[]>(() => [
    {
      chave: 'contabilidade',
      rotulo: 'Pendentes de contabilidade',
      descricao: 'Clientes aguardando envio no mês',
      valor: this.pendentesEnvioContabilidade(),
      destaque: this.pendentesEnvioContabilidade() > 0,
      secao: 'enviosContabilidade',
      acao: 'Revisar',
    },
    {
      chave: 'faturamento',
      rotulo: 'Prontos para faturar',
      descricao: 'Liberados para o próximo ciclo',
      valor: this.prontosParaFaturar(),
      destaque: false,
      secao: 'faturamento',
      acao: 'Abrir',
    },
    {
      chave: 'implantacao',
      rotulo: 'Implantações esta semana',
      descricao: `${this.implantacoesSemanaAgendadasRecentemente()} agendada(s) nos últimos 7 dias`,
      valor: this.implantacoesSemana(),
      destaque: false,
      secao: 'implantacao',
      acao: 'Agenda',
    },
    {
      chave: 'instalacao',
      rotulo: 'Prontos para instalar',
      descricao: `${this.instalacoesNovasSemana()} nova(s) essa semana`,
      valor: this.prontosParaInstalar(),
      destaque: false,
      secao: 'instalacao',
      acao: 'Instalar',
    },
    {
      chave: 'negociacao',
      rotulo: 'Em negociação',
      descricao: `${this.negociacoesNovasSemana()} nova(s) essa semana`,
      valor: this.emNegociacao(),
      destaque: false,
      secao: 'negociacao',
      acao: 'Ver',
    },
  ]);

  // --- barras "Clientes por contabilidade" ---

  // barra proporcional à MAIOR contabilidade, não ao total: com "Não informado" levando
  // metade da base, tudo o mais viraria um risco de 2px se a escala fosse o total
  barrasContabilidade = computed<BarraContabilidade[]>(() => {
    const segmentos = this.donutContabilidadeSegments();
    const maior = Math.max(1, ...segmentos.map((seg) => seg.valor));
    return segmentos.map((seg) => ({ ...seg, largura: Math.round((seg.valor / maior) * 100) }));
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

  // recarrega quando outro computador grava algo, sem F5
  private readonly sincronizar = aoSincronizar(() => this.carregar(true));

  ngOnInit() {
    this.carregar();
  }

  formatarDataBr(dataIso: string): string {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // O resumo junta 8 consultas independentes. Com Promise.all, uma falhando derrubava as
  // outras sete e a tela mostrava zero em tudo, sem avisar — igualzinho a um banco vazio.
  // Com allSettled cada número que chegou é exibido, e o que faltou vira aviso na tela.
  async carregar(silencioso = false) {
    if (!silencioso) this.carregando.set(true);
    try {
      const hoje = new Date();
      const [clientes, negociacoes, implantacoes, instalacoes, pendentesFaturamento, statusEnviosContabilidade, clientesUniplus, clientesSgbr] =
        await Promise.allSettled([
          firstValueFrom(this.clientesService.listar()),
          firstValueFrom(this.negociacaoService.listar()),
          firstValueFrom(this.implantacoesService.listar()),
          firstValueFrom(this.instalacoesService.listar()),
          firstValueFrom(this.faturamentoService.listarPendentes()),
          firstValueFrom(this.enviosContabilidadeService.listarStatusMes(hoje.getFullYear(), hoje.getMonth() + 1)),
          firstValueFrom(this.clientesSistemasService.listar('uniplus')),
          firstValueFrom(this.clientesSistemasService.listar('sgbr')),
        ]);

      if (clientes.status === 'fulfilled') this.clientes.set(clientes.value);
      if (negociacoes.status === 'fulfilled') this.negociacoes.set(negociacoes.value);
      if (implantacoes.status === 'fulfilled') this.implantacoes.set(implantacoes.value);
      if (instalacoes.status === 'fulfilled') this.instalacoes.set(instalacoes.value);
      if (pendentesFaturamento.status === 'fulfilled') this.pendentesFaturamento.set(pendentesFaturamento.value);
      if (statusEnviosContabilidade.status === 'fulfilled') {
        this.statusEnviosContabilidadeMes.set(new Map(statusEnviosContabilidade.value.map((s) => [s.acesso_id, !!s.enviado])));
      }
      if (clientesUniplus.status === 'fulfilled') this.totalClientesUniplus.set(clientesUniplus.value.length);
      if (clientesSgbr.status === 'fulfilled') this.totalClientesSgbr.set(clientesSgbr.value.length);

      const falharam = [
        clientes,
        negociacoes,
        implantacoes,
        instalacoes,
        pendentesFaturamento,
        statusEnviosContabilidade,
        clientesUniplus,
        clientesSgbr,
      ].filter((r) => r.status === 'rejected').length;
      this.consultasComFalha.set(falharam);
    } finally {
      this.carregando.set(false);
    }
  }
}

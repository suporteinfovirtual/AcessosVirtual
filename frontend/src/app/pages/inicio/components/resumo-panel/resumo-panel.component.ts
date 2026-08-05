import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Cliente, ClienteNegociacao, ClientePendenteFaturamento, Implantacao } from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { ImplantacoesService } from '../../../../core/implantacoes.service';
import { FaturamentoService } from '../../../../core/faturamento.service';
import { statusCertificado } from '../../../../core/certificado.util';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

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

const DIAS_PARADA_ALERTA = 7;

@Component({
  selector: 'app-resumo-panel',
  imports: [SkeletonComponent],
  templateUrl: './resumo-panel.component.html',
})
export class ResumoPanelComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private negociacaoService = inject(NegociacaoService);
  private implantacoesService = inject(ImplantacoesService);
  private faturamentoService = inject(FaturamentoService);

  irPara = output<SecaoGestao>();

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

  ngOnInit() {
    this.carregar();
  }

  formatarDataBr(dataIso: string): string {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
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

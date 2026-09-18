import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteNegociacao, SISTEMAS, STATUS_NEGOCIACAO, Sistema } from '../../../../core/models';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { NegociacaoModalComponent } from '../negociacao-modal/negociacao-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeToggleComponent } from '../../../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { aoSincronizar } from '../../../../core/sincronizacao.service';

// filtros da tela (ver clientesFiltrados). Quem já foi enviado pra Instalação sai de
// "Todos" e só aparece em "Na instalação" (ainda não instalado) e "Fechados conosco".
type FiltroNegociacao = 'todos' | 'em_negociacao' | 'na_instalacao' | 'fechados' | 'desistiu';

@Component({
  selector: 'app-negociacao-panel',
  imports: [FormsModule, NegociacaoModalComponent, ViewModeToggleComponent, SkeletonComponent],
  templateUrl: './negociacao-panel.component.html',
})
export class NegociacaoPanelComponent implements OnInit {
  private negociacaoService = inject(NegociacaoService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  // emite o registro completo (já com sistema) pro app-inicio cadastrar o cliente e
  // enviar pra Instalação — ver aoConverterNegociacao() em inicio.component.ts
  converter = output<ClienteNegociacao>();

  busca = signal('');
  statusFiltro = signal<FiltroNegociacao>('todos');
  readonly statusOpcoes: { valor: FiltroNegociacao; rotulo: string }[] = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'em_negociacao', rotulo: 'Em negociação' },
    { valor: 'na_instalacao', rotulo: 'Na instalação' },
    { valor: 'fechados', rotulo: 'Fechados conosco' },
    { valor: 'desistiu', rotulo: 'Desistiu' },
  ];

  clientes = signal<ClienteNegociacao[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteNegociacao | null>(null);

  // Todos: o que ainda está em andamento (em negociação, sem sistema, ou fechou e está
  // pronto pra enviar) — sem desistências e sem quem já foi enviado pra Instalação.
  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const filtro = this.statusFiltro();
    return this.clientes().filter((c) => {
      const bateTermo = !termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo);
      if (!bateTermo) return false;

      const enviado = !!c.convertido_em;
      switch (filtro) {
        case 'todos':
          return !enviado && c.status !== 'desistiu';
        case 'em_negociacao':
          return !enviado && c.status === 'em_negociacao';
        case 'na_instalacao':
          return enviado && !c.instalado;
        case 'fechados':
          return enviado;
        case 'desistiu':
          return c.status === 'desistiu';
      }
    });
  });

  // agrupa o resultado filtrado por sistema (Uniplus, Uniplus Web, SGBR, Zeta), na ordem
  // de SISTEMAS; só entra na lista quem tem pelo menos um cliente — sem linhas vazias.
  // quem ainda não tem sistema decidido cai num grupo à parte, no fim.
  gruposPorSistema = computed(() => {
    const lista = this.clientesFiltrados();
    const grupos = SISTEMAS.map((s) => ({
      sistema: s.valor as Sistema | null,
      rotulo: s.rotulo,
      clientes: lista.filter((c) => c.sistema === s.valor),
    })).filter((grupo) => grupo.clientes.length > 0);

    const semSistema = lista.filter((c) => !c.sistema);
    if (semSistema.length > 0) {
      grupos.push({ sistema: null, rotulo: 'Sem sistema definido', clientes: semSistema });
    }
    return grupos;
  });

  // recarrega quando outro computador grava algo, sem F5
  private readonly sincronizar = aoSincronizar(() => this.carregar(true));

  ngOnInit() {
    this.carregar();
  }

  async carregar(silencioso = false) {
    if (!silencioso) this.carregando.set(true);
    try {
      const clientes = await firstValueFrom(this.negociacaoService.listar());
      this.clientes.set(clientes);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNovo() {
    this.clienteEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  abrirEdicao(cliente: ClienteNegociacao) {
    this.clienteEmEdicao.set(cliente);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.clienteEmEdicao.set(null);
  }

  // quem já foi enviado mostra onde está (Na instalação / Instalado) em vez de "Fechou"
  rotuloStatus(cliente: ClienteNegociacao): string {
    if (cliente.convertido_em) return cliente.instalado ? 'Instalado' : 'Na instalação';
    return STATUS_NEGOCIACAO.find((s) => s.valor === cliente.status)?.rotulo ?? '';
  }

  corStatus(cliente: ClienteNegociacao): string {
    const status = cliente.status;
    if (cliente.convertido_em) return 'bg-accent/15 text-accent border border-accent/30';
    if (status === 'fechou') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    if (status === 'desistiu') return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
    return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
  }

  // só aparece quando fechou, já tem sistema escolhido, e ainda não foi convertido
  podeConverter(cliente: ClienteNegociacao): boolean {
    return cliente.status === 'fechou' && !!cliente.sistema && !cliente.convertido_em;
  }

  solicitarConversao(event: Event, cliente: ClienteNegociacao) {
    event.stopPropagation(); // não deixa abrir o modal de edição junto
    this.converter.emit(cliente);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Cliente salvo.');
  }
}

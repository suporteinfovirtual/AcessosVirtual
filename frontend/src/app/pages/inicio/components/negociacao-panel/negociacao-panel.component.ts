import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteNegociacao, STATUS_NEGOCIACAO, StatusNegociacao } from '../../../../core/models';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { NegociacaoModalComponent } from '../negociacao-modal/negociacao-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeToggleComponent } from '../../../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

@Component({
  selector: 'app-negociacao-panel',
  imports: [FormsModule, NegociacaoModalComponent, ViewModeToggleComponent, SkeletonComponent],
  templateUrl: './negociacao-panel.component.html',
})
export class NegociacaoPanelComponent implements OnInit {
  private negociacaoService = inject(NegociacaoService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  // emite o registro completo (já com sistema) pro app-inicio abrir a tela de
  // Clientes certa, pré-preenchida — ver aoConverterNegociacao() em inicio.component.ts
  converter = output<ClienteNegociacao>();

  // liga true quando o Resumo manda entrar já abrindo o cadastro (botão "+ Negociação")
  abrirNovoAoEntrar = input(false);

  busca = signal('');
  statusFiltro = signal<StatusNegociacao | 'todos'>('todos');
  readonly statusOpcoes = STATUS_NEGOCIACAO;

  clientes = signal<ClienteNegociacao[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteNegociacao | null>(null);

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const status = this.statusFiltro();
    return this.clientes().filter((c) => {
      const bateTermo = !termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo);
      const bateStatus = status === 'todos' || c.status === status;
      return bateTermo && bateStatus;
    });
  });

  ngOnInit() {
    this.carregar();
    if (this.abrirNovoAoEntrar()) this.abrirNovo();
  }

  async carregar() {
    this.carregando.set(true);
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

  rotuloStatus(status?: StatusNegociacao): string {
    return this.statusOpcoes.find((s) => s.valor === status)?.rotulo ?? '';
  }

  corStatus(status?: StatusNegociacao): string {
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

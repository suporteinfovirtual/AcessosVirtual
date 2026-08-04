import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteNegociacao } from '../../../../core/models';
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

  busca = signal('');

  clientes = signal<ClienteNegociacao[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteNegociacao | null>(null);

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.clientes();
    return this.clientes().filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo)
    );
  });

  ngOnInit() {
    this.carregar();
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

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Cliente salvo.');
  }
}

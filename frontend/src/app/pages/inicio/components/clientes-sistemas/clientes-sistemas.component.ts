import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteSistema, SISTEMAS, Sistema } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { ClienteSistemaModalComponent } from '../cliente-sistema-modal/cliente-sistema-modal.component';

@Component({
  selector: 'app-clientes-sistemas',
  imports: [FormsModule, ClienteSistemaModalComponent],
  templateUrl: './clientes-sistemas.component.html',
})
export class ClientesSistemasComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);

  voltar = output<void>();

  readonly sistemas = SISTEMAS;

  sistemaAtivo = signal<Sistema>('uniplus');
  busca = signal('');

  clientes = signal<ClienteSistema[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteSistema | null>(null);

  temVersaoBuild = computed(() => this.sistemas.find((s) => s.valor === this.sistemaAtivo())?.temVersaoBuild ?? false);

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

  selecionarSistema(sistema: Sistema) {
    this.sistemaAtivo.set(sistema);
    this.busca.set('');
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const clientes = await firstValueFrom(this.clientesSistemasService.listar(this.sistemaAtivo()));
      this.clientes.set(clientes);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNovo() {
    this.clienteEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  abrirEdicao(cliente: ClienteSistema) {
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
  }
}

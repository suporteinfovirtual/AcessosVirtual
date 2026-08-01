import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Cliente, ClienteSistema, SISTEMAS, Sistema } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { ClientesService } from '../../../../core/clientes.service';
import { ClienteSistemaModalComponent } from '../cliente-sistema-modal/cliente-sistema-modal.component';
import { ClienteModalComponent } from '../cliente-modal/cliente-modal.component';

@Component({
  selector: 'app-clientes-sistemas',
  imports: [FormsModule, ClienteSistemaModalComponent, ClienteModalComponent],
  templateUrl: './clientes-sistemas.component.html',
})
export class ClientesSistemasComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);
  private clientesService = inject(ClientesService);

  readonly sistemas = SISTEMAS;

  sistemaAtivo = signal<Sistema>('uniplus');
  busca = signal('');

  clientes = signal<ClienteSistema[]>([]);
  clientesZeta = signal<Cliente[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteSistema | null>(null);

  modalZetaAberto = signal(false);
  clienteZetaEmEdicao = signal<Cliente | null>(null);

  ehZeta = computed(() => this.sistemaAtivo() === 'zeta');
  temVersaoBuild = computed(() => this.sistemas.find((s) => s.valor === this.sistemaAtivo())?.temVersaoBuild ?? false);

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.clientes();
    return this.clientes().filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo)
    );
  });

  clientesZetaFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.clientesZeta();
    return this.clientesZeta().filter(
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
      if (this.ehZeta()) {
        // Clientes > Zeta é unificado com o Acesso Zeta: mesma tabela de clientes
        const todos = await firstValueFrom(this.clientesService.listar());
        this.clientesZeta.set(todos.filter((c) => c.acessos?.some((a) => a.tipo === 'acesso_zeta')));
      } else {
        const clientes = await firstValueFrom(this.clientesSistemasService.listar(this.sistemaAtivo()));
        this.clientes.set(clientes);
      }
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNovo() {
    if (this.ehZeta()) {
      this.clienteZetaEmEdicao.set(null);
      this.modalZetaAberto.set(true);
    } else {
      this.clienteEmEdicao.set(null);
      this.modalAberto.set(true);
    }
  }

  abrirEdicao(cliente: ClienteSistema) {
    this.clienteEmEdicao.set(cliente);
    this.modalAberto.set(true);
  }

  abrirEdicaoZeta(cliente: Cliente) {
    this.clienteZetaEmEdicao.set(cliente);
    this.modalZetaAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.clienteEmEdicao.set(null);
  }

  fecharModalZeta() {
    this.modalZetaAberto.set(false);
    this.clienteZetaEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
  }

  async aoSalvarZeta() {
    this.fecharModalZeta();
    await this.carregar();
  }
}

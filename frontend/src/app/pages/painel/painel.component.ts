import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Cliente, TIPOS_ACESSO, TipoAcesso } from '../../core/models';
import { ClientesService } from '../../core/clientes.service';
import { CopyFieldComponent } from '../../shared/copy-field.component';
import { ClienteModalComponent } from './components/cliente-modal/cliente-modal.component';
import { InternosPanelComponent } from './components/internos-panel/internos-panel.component';

type Aba = TipoAcesso | 'internos';

@Component({
  selector: 'app-painel',
  imports: [FormsModule, CopyFieldComponent, ClienteModalComponent, InternosPanelComponent],
  templateUrl: './painel.component.html',
})
export class PainelComponent implements OnInit {
  private clientesService = inject(ClientesService);

  readonly abas: { valor: Aba; rotulo: string }[] = [...TIPOS_ACESSO, { valor: 'internos', rotulo: 'Contas Internas' }];

  clientes = signal<Cliente[]>([]);
  carregando = signal(true);
  erro = signal('');

  busca = signal('');
  abaAtiva = signal<Aba>('anydesk');

  modalAberto = signal(false);
  clienteEmEdicao = signal<Cliente | null>(null);

  mostrandoInternos = computed(() => this.abaAtiva() === 'internos');
  tipoInicialModal = computed<TipoAcesso | null>(() => (this.mostrandoInternos() ? null : (this.abaAtiva() as TipoAcesso)));

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const tipo = this.abaAtiva();
    if (tipo === 'internos') return [];

    return this.clientes()
      .filter((c) => c.acessos?.some((a) => a.tipo === tipo))
      .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo));
  });

  contagemPorTipo = computed(() => {
    const contagem: Record<TipoAcesso, number> = { anydesk: 0, acesso_web: 0, acesso_zeta: 0 };
    for (const cliente of this.clientes()) {
      for (const acesso of cliente.acessos || []) {
        contagem[acesso.tipo]++;
      }
    }
    return contagem;
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    this.erro.set('');
    try {
      const clientes = await firstValueFrom(this.clientesService.listar());
      this.clientes.set(clientes);
    } catch {
      this.erro.set('Não foi possível carregar os clientes.');
    } finally {
      this.carregando.set(false);
    }
  }

  acessoDoTipo(cliente: Cliente, tipo: Aba) {
    if (tipo === 'internos') return undefined;
    return cliente.acessos?.find((a) => a.tipo === tipo);
  }

  abrirNovoCliente() {
    this.clienteEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  abrirEdicao(cliente: Cliente) {
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

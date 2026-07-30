import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Categoria, Cliente, TIPOS_ACESSO, TipoAcesso } from '../../core/models';
import { ClientesService } from '../../core/clientes.service';
import { CategoriasService } from '../../core/categorias.service';
import { CopyFieldComponent } from '../../shared/copy-field.component';
import { ClienteModalComponent } from './components/cliente-modal/cliente-modal.component';
import { InternosPanelComponent } from './components/internos-panel/internos-panel.component';
import { CategoriasModalComponent } from './components/categorias-modal/categorias-modal.component';

type Aba = TipoAcesso | 'internos';

@Component({
  selector: 'app-painel',
  imports: [FormsModule, CopyFieldComponent, ClienteModalComponent, InternosPanelComponent, CategoriasModalComponent],
  templateUrl: './painel.component.html',
})
export class PainelComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private categoriasService = inject(CategoriasService);

  readonly abas: { valor: Aba; rotulo: string }[] = [...TIPOS_ACESSO, { valor: 'internos', rotulo: 'Contas Internas' }];

  clientes = signal<Cliente[]>([]);
  categorias = signal<Categoria[]>([]);
  carregando = signal(true);
  erro = signal('');

  busca = signal('');
  abaAtiva = signal<Aba>('anydesk');
  categoriaFiltro = signal<number | null>(null);

  modalAberto = signal(false);
  clienteEmEdicao = signal<Cliente | null>(null);
  categoriasModalAberto = signal(false);

  senhaDoDia = signal(this.calcularSenhaDoDia());

  mostrandoInternos = computed(() => this.abaAtiva() === 'internos');
  tipoInicialModal = computed<TipoAcesso | null>(() => (this.mostrandoInternos() ? null : (this.abaAtiva() as TipoAcesso)));

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const tipo = this.abaAtiva();
    const categoriaId = this.categoriaFiltro();
    if (tipo === 'internos') return [];

    return this.clientes()
      .filter((c) => c.acessos?.some((a) => a.tipo === tipo))
      .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo))
      .filter((c) => !categoriaId || c.categoria_id === categoriaId);
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
    this.carregarCategorias();
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

  async carregarCategorias() {
    const categorias = await firstValueFrom(this.categoriasService.listar());
    this.categorias.set(categorias);
  }

  abrirCategorias() {
    this.categoriasModalAberto.set(true);
  }

  async aoAlterarCategorias() {
    await this.carregarCategorias();
    await this.carregar();
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

  // mesma fórmula do projeto "senha-do-dia": dia x mês x (ano % 100) x 3
  private calcularSenhaDoDia(): string {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear() % 100;
    return String(dia * mes * ano * 3);
  }
}

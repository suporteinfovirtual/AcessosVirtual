import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Categoria, Cliente, LinkPessoal, TIPOS_ACESSO, TipoAcesso } from '../../core/models';
import { ClientesService } from '../../core/clientes.service';
import { CategoriasService } from '../../core/categorias.service';
import { LinksService } from '../../core/links.service';
import { CopyFieldComponent } from '../../shared/copy-field.component';
import { LinkModalComponent } from './components/link-modal/link-modal.component';
import { ClienteModalComponent } from './components/cliente-modal/cliente-modal.component';
import { InternosPanelComponent } from './components/internos-panel/internos-panel.component';
import { CategoriasModalComponent } from './components/categorias-modal/categorias-modal.component';

type Aba = TipoAcesso | 'internos';

@Component({
  selector: 'app-inicio',
  imports: [
    FormsModule,
    CopyFieldComponent,
    LinkModalComponent,
    ClienteModalComponent,
    InternosPanelComponent,
    CategoriasModalComponent,
  ],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private categoriasService = inject(CategoriasService);
  private linksService = inject(LinksService);
  private destroyRef = inject(DestroyRef);

  // --- links pessoais ---
  links = signal<LinkPessoal[]>([]);
  carregandoLinks = signal(true);
  linkModalAberto = signal(false);
  linkEmEdicao = signal<LinkPessoal | null>(null);

  // --- painel de clientes ---
  readonly abas: { valor: Aba; rotulo: string }[] = [...TIPOS_ACESSO, { valor: 'internos', rotulo: 'Contas Internas' }];

  clientes = signal<Cliente[]>([]);
  categorias = signal<Categoria[]>([]);
  carregandoClientes = signal(true);
  erro = signal('');

  busca = signal('');
  abaAtiva = signal<Aba>('anydesk');
  categoriaFiltro = signal<number | null>(null);
  servidorFiltro = signal<string | null>(null);

  clienteModalAberto = signal(false);
  clienteEmEdicao = signal<Cliente | null>(null);
  categoriasModalAberto = signal(false);

  senhaDoDia = signal(this.calcularSenhaDoDia());

  mostrandoInternos = computed(() => this.abaAtiva() === 'internos');
  tipoInicialModal = computed<TipoAcesso | null>(() => (this.mostrandoInternos() ? null : (this.abaAtiva() as TipoAcesso)));

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const tipo = this.abaAtiva();
    const categoriaId = this.categoriaFiltro();
    const servidor = this.servidorFiltro();
    if (tipo === 'internos') return [];

    return this.clientes()
      .filter((c) => c.acessos?.some((a) => a.tipo === tipo))
      .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo))
      .filter((c) => !categoriaId || c.categoria_id === categoriaId)
      .filter((c) => tipo !== 'acesso_web' || !servidor || c.acessos?.some((a) => a.tipo === 'acesso_web' && a.servidor === servidor));
  });

  servidoresDisponiveis = computed(() => {
    const servidores = new Set<string>();
    for (const cliente of this.clientes()) {
      for (const acesso of cliente.acessos || []) {
        if (acesso.tipo === 'acesso_web' && acesso.servidor) servidores.add(acesso.servidor);
      }
    }
    return Array.from(servidores).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
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
    this.carregarLinks();
    this.carregarClientes();
    this.carregarCategorias();
    this.agendarAtualizacaoSenhaDoDia();
  }

  // --- links pessoais ---

  async carregarLinks() {
    this.carregandoLinks.set(true);
    try {
      const links = await firstValueFrom(this.linksService.listar());
      this.links.set(links);
    } finally {
      this.carregandoLinks.set(false);
    }
  }

  abrirNovoLink() {
    this.linkEmEdicao.set(null);
    this.linkModalAberto.set(true);
  }

  abrirEdicaoLink(link: LinkPessoal) {
    this.linkEmEdicao.set(link);
    this.linkModalAberto.set(true);
  }

  fecharModalLink() {
    this.linkModalAberto.set(false);
    this.linkEmEdicao.set(null);
  }

  async aoSalvarLink() {
    this.fecharModalLink();
    await this.carregarLinks();
  }

  // --- painel de clientes ---

  async carregarClientes() {
    this.carregandoClientes.set(true);
    this.erro.set('');
    try {
      const clientes = await firstValueFrom(this.clientesService.listar());
      this.clientes.set(clientes);
    } catch {
      this.erro.set('Não foi possível carregar os clientes.');
    } finally {
      this.carregandoClientes.set(false);
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
    await this.carregarClientes();
  }

  selecionarAba(valor: Aba) {
    this.abaAtiva.set(valor);
    if (valor !== 'acesso_web') this.servidorFiltro.set(null);
  }

  acessoDoTipo(cliente: Cliente, tipo: Aba) {
    if (tipo === 'internos') return undefined;
    return cliente.acessos?.find((a) => a.tipo === tipo);
  }

  abrirNovoCliente() {
    this.clienteEmEdicao.set(null);
    this.clienteModalAberto.set(true);
  }

  abrirEdicaoCliente(cliente: Cliente) {
    this.clienteEmEdicao.set(cliente);
    this.clienteModalAberto.set(true);
  }

  fecharModalCliente() {
    this.clienteModalAberto.set(false);
    this.clienteEmEdicao.set(null);
  }

  async aoSalvarCliente() {
    this.fecharModalCliente();
    await this.carregarClientes();
  }

  // mesma fórmula do projeto "senha-do-dia": dia x mês x (ano % 100) x 3
  private calcularSenhaDoDia(): string {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear() % 100;
    return String(dia * mes * ano * 3);
  }

  // recalcula sozinho à meia-noite, mesmo com a aba aberta, e se reagenda pro dia seguinte
  private agendarAtualizacaoSenhaDoDia() {
    const agora = new Date();
    const proximaMeiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 2);
    const timeoutId = setTimeout(() => {
      this.senhaDoDia.set(this.calcularSenhaDoDia());
      this.agendarAtualizacaoSenhaDoDia();
    }, proximaMeiaNoite.getTime() - agora.getTime());
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }
}

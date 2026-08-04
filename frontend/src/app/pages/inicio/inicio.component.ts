import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, Categoria, Cliente, Contabilidade, LinkPessoal, TIPOS_ACESSO, TipoAcesso } from '../../core/models';
import { ClientesService } from '../../core/clientes.service';
import { CategoriasService } from '../../core/categorias.service';
import { ContabilidadesService } from '../../core/contabilidades.service';
import { LinksService } from '../../core/links.service';
import { CopyFieldComponent } from '../../shared/copy-field.component';
import { ToastService } from '../../shared/toast.service';
import { ViewModeToggleComponent } from '../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../shared/view-mode.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { LinkModalComponent } from './components/link-modal/link-modal.component';
import { ClienteModalComponent } from './components/cliente-modal/cliente-modal.component';
import { InternosPanelComponent } from './components/internos-panel/internos-panel.component';
import { CategoriasModalComponent } from './components/categorias-modal/categorias-modal.component';
import { ContabilidadesModalComponent } from './components/contabilidades-modal/contabilidades-modal.component';
import { ManuaisPanelComponent } from './components/manuais-panel/manuais-panel.component';
import { ArquivosPanelComponent } from './components/arquivos-panel/arquivos-panel.component';
import { ClientesSistemasComponent } from './components/clientes-sistemas/clientes-sistemas.component';
import { EnviosContabilidadePanelComponent } from './components/envios-contabilidade-panel/envios-contabilidade-panel.component';
import { NegociacaoPanelComponent } from './components/negociacao-panel/negociacao-panel.component';
import { ImplantacaoPanelComponent } from './components/implantacao-panel/implantacao-panel.component';

type Aba = TipoAcesso | 'internos' | 'manuais' | 'arquivos';

@Component({
  selector: 'app-inicio',
  imports: [
    FormsModule,
    CopyFieldComponent,
    LinkModalComponent,
    ClienteModalComponent,
    InternosPanelComponent,
    CategoriasModalComponent,
    ContabilidadesModalComponent,
    ManuaisPanelComponent,
    ArquivosPanelComponent,
    ClientesSistemasComponent,
    EnviosContabilidadePanelComponent,
    NegociacaoPanelComponent,
    ImplantacaoPanelComponent,
    ViewModeToggleComponent,
    SkeletonComponent,
  ],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private categoriasService = inject(CategoriasService);
  private contabilidadesService = inject(ContabilidadesService);
  private linksService = inject(LinksService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  // --- área separada "Clientes" (Uniplus / Uniplus Web / SGBR / Zeta) ---
  mostrandoClientesSistemas = signal(false);

  // --- área separada "Envios para a contabilidade" ---
  mostrandoEnviosContabilidade = signal(false);

  // --- área separada "Clientes em negociação" ---
  mostrandoNegociacao = signal(false);

  // --- área separada "Implantação" (agenda de treinamentos) ---
  mostrandoImplantacao = signal(false);

  // --- links pessoais ---
  links = signal<LinkPessoal[]>([]);
  carregandoLinks = signal(true);
  linkModalAberto = signal(false);
  linkEmEdicao = signal<LinkPessoal | null>(null);

  // --- painel de clientes ---
  readonly abasAcessos: { valor: TipoAcesso; rotulo: string }[] = [...TIPOS_ACESSO];
  readonly abasFerramentas: { valor: Aba; rotulo: string }[] = [
    { valor: 'manuais', rotulo: 'Manuais' },
    { valor: 'internos', rotulo: 'Contas Internas' },
    { valor: 'arquivos', rotulo: 'Arquivos' },
  ];

  clientes = signal<Cliente[]>([]);
  categorias = signal<Categoria[]>([]);
  contabilidades = signal<Contabilidade[]>([]);
  carregandoClientes = signal(true);
  erro = signal('');

  busca = signal('');
  abaAtiva = signal<Aba>('anydesk');
  categoriaFiltro = signal<number | null>(null);
  servidorFiltro = signal<string | null>(null);
  contabilidadeFiltro = signal<number | null>(null);

  clienteModalAberto = signal(false);
  clienteEmEdicao = signal<Cliente | null>(null);
  categoriasModalAberto = signal(false);
  contabilidadesModalAberto = signal(false);

  senhaDoDia = signal(this.calcularSenhaDoDia());
  senhaDoDiaCopiada = signal(false);

  mostrandoInternos = computed(() => this.abaAtiva() === 'internos');
  mostrandoManuais = computed(() => this.abaAtiva() === 'manuais');
  mostrandoArquivos = computed(() => this.abaAtiva() === 'arquivos');
  tipoInicialModal = computed<TipoAcesso | null>(() =>
    this.mostrandoInternos() || this.mostrandoManuais() || this.mostrandoArquivos() ? null : (this.abaAtiva() as TipoAcesso)
  );

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const tipo = this.abaAtiva();
    const categoriaId = this.categoriaFiltro();
    const servidor = this.servidorFiltro();
    const contabilidade = this.contabilidadeFiltro();
    if (tipo === 'internos' || tipo === 'manuais' || tipo === 'arquivos') return [];

    return this.clientes()
      .filter((c) => c.acessos?.some((a) => a.tipo === tipo))
      .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo))
      .filter((c) => tipo !== 'acesso_zeta' || !categoriaId || c.categoria_id === categoriaId)
      .filter((c) => tipo !== 'acesso_web' || !servidor || c.acessos?.some((a) => a.tipo === 'acesso_web' && a.servidor === servidor))
      .filter(
        (c) =>
          (tipo !== 'acesso_web' && tipo !== 'acesso_zeta') ||
          !contabilidade ||
          c.acessos?.some((a) => a.tipo === tipo && a.contabilidade_id === contabilidade)
      );
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
    this.carregarContabilidades();
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
    this.toast.sucesso('Link salvo.');
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
    this.toast.sucesso('Categorias atualizadas.');
  }

  async carregarContabilidades() {
    const contabilidades = await firstValueFrom(this.contabilidadesService.listar());
    this.contabilidades.set(contabilidades);
  }

  abrirContabilidades() {
    this.contabilidadesModalAberto.set(true);
  }

  async aoAlterarContabilidades() {
    await this.carregarContabilidades();
    await this.carregarClientes();
    this.toast.sucesso('Contabilidades atualizadas.');
  }

  selecionarAba(valor: Aba) {
    this.abaAtiva.set(valor);
    if (valor !== 'acesso_web') this.servidorFiltro.set(null);
    if (valor !== 'acesso_zeta') this.categoriaFiltro.set(null);
    if (valor !== 'acesso_web' && valor !== 'acesso_zeta') this.contabilidadeFiltro.set(null);
  }

  acessoDoTipo(cliente: Cliente, tipo: Aba) {
    if (tipo === 'internos') return undefined;
    return cliente.acessos?.find((a) => a.tipo === tipo);
  }

  statusCertificado(cliente: Cliente): 'vencido' | 'alerta' | null {
    const validade = cliente.certificado?.validade;
    if (!validade) return null;
    const dias = (new Date(validade).getTime() - Date.now()) / 86_400_000;
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'alerta';
    return null;
  }

  // o userscript de auto-login do zweb lê zw_e/zw_p do hash da URL para preencher o formulário sozinho
  linkAutoLogin(acesso: Acesso): string {
    const link = acesso.link || '';
    if (!link || !acesso.identificador || !acesso.senha) return link;
    const [base, hash = ''] = link.split('#');
    const caminho = hash.split('?')[0];
    const params = new URLSearchParams({ zw_e: acesso.identificador, zw_p: acesso.senha }).toString();
    return `${base}#${caminho}?${params}`;
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
    this.toast.sucesso('Cliente salvo.');
  }

  // abre o AnyDesk instalado já direcionado pro ID (protocolo anydesk:) e deixa a senha
  // no clipboard pronta pra colar — o app nativo não permite preencher a senha via URI
  async conectarAnydesk(acesso: Acesso) {
    if (acesso.senha) {
      try {
        await navigator.clipboard.writeText(acesso.senha);
        this.toast.sucesso('Senha copiada — cole na janela do AnyDesk.');
      } catch {
        // clipboard indisponível — segue e abre o AnyDesk mesmo assim
      }
    }
    if (acesso.identificador) {
      window.location.href = `anydesk:${acesso.identificador}`;
    }
  }

  async copiarSenhaDoDia() {
    try {
      await navigator.clipboard.writeText(this.senhaDoDia());
      this.senhaDoDiaCopiada.set(true);
      this.toast.sucesso('Senha do dia copiada.');
      setTimeout(() => this.senhaDoDiaCopiada.set(false), 1500);
    } catch {
      this.toast.erro('Não foi possível copiar.');
    }
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

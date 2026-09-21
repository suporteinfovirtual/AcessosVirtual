import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, Categoria, Cliente, ClienteSistema, SISTEMAS, Sistema, TipoAcesso } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { ClientesService } from '../../../../core/clientes.service';
import { CategoriasService } from '../../../../core/categorias.service';
import { ClienteSistemaModalComponent } from '../cliente-sistema-modal/cliente-sistema-modal.component';
import { ClienteModalComponent } from '../cliente-modal/cliente-modal.component';
import { LicencasModalComponent } from '../licencas-modal/licencas-modal.component';
import { CategoriasModalComponent } from '../categorias-modal/categorias-modal.component';
import { SelectCadastroComponent } from '../../../../shared/select-cadastro.component';
import { RelatorioLucroModalComponent } from '../relatorio-lucro-modal/relatorio-lucro-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeToggleComponent } from '../../../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { aoSincronizar } from '../../../../core/sincronizacao.service';

// sistemas sem cadastro proprio: usam direto a tabela clientes/acessos, filtrando pelo tipo de acesso correspondente
const TIPO_POR_SISTEMA_UNIFICADO: Partial<Record<Sistema, TipoAcesso>> = {
  uniplus_web: 'acesso_web',
  zeta: 'acesso_zeta',
};

// sistemas que usam a lista de licenças cadastrada (em vez do campo de texto livre)
const SISTEMAS_COM_LISTA_DE_LICENCAS: Sistema[] = ['uniplus', 'uniplus_web'];

@Component({
  selector: 'app-clientes-sistemas',
  imports: [
    FormsModule,
    ClienteSistemaModalComponent,
    ClienteModalComponent,
    LicencasModalComponent,
    CategoriasModalComponent,
    RelatorioLucroModalComponent,
    SelectCadastroComponent,
    ViewModeToggleComponent,
    SkeletonComponent,
  ],
  templateUrl: './clientes-sistemas.component.html',
})
export class ClientesSistemasComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);
  private clientesService = inject(ClientesService);
  private categoriasService = inject(CategoriasService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  readonly sistemas = SISTEMAS;

  // preenchido quando o Resumo manda entrar já num sistema específico (legenda do donut)
  sistemaInicial = input<Sistema | null>(null);

  sistemaAtivo = signal<Sistema>('uniplus');
  busca = signal('');
  categoriaFiltro = signal<number | null>(null);
  categorias = signal<Categoria[]>([]);

  clientes = signal<ClienteSistema[]>([]);
  clientesUnificados = signal<Cliente[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteSistema | null>(null);

  modalUnificadoAberto = signal(false);
  clienteUnificadoEmEdicao = signal<Cliente | null>(null);

  licencasModalAberto = signal(false);
  categoriasModalAberto = signal(false);
  relatorioModalAberto = signal(false);

  tipoUnificado = computed<TipoAcesso | null>(() => TIPO_POR_SISTEMA_UNIFICADO[this.sistemaAtivo()] ?? null);
  ehUnificado = computed(() => this.tipoUnificado() !== null);
  temVersaoBuild = computed(() => this.sistemas.find((s) => s.valor === this.sistemaAtivo())?.temVersaoBuild ?? false);
  usaListaDeLicencas = computed(() => SISTEMAS_COM_LISTA_DE_LICENCAS.includes(this.sistemaAtivo()));

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const categoriaId = this.categoriaFiltro();
    return this.clientes().filter(
      (c) =>
        (!termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo)) &&
        (!categoriaId || c.categoria_id === categoriaId)
    );
  });

  clientesUnificadosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const categoriaId = this.categoriaFiltro();
    return this.clientesUnificados().filter(
      (c) =>
        (!termo || c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo)) &&
        (!categoriaId || c.categoria_id === categoriaId)
    );
  });

  // recarrega quando outro computador grava algo, sem F5
  private readonly sincronizar = aoSincronizar(() => this.carregar(true));

  ngOnInit() {
    if (this.sistemaInicial()) this.sistemaAtivo.set(this.sistemaInicial()!);
    this.carregar();
    firstValueFrom(this.categoriasService.listar()).then((categorias) => this.categorias.set(categorias));
  }

  selecionarSistema(sistema: Sistema) {
    this.sistemaAtivo.set(sistema);
    this.busca.set('');
    this.carregar();
  }

  async carregar(silencioso = false) {
    if (!silencioso) this.carregando.set(true);
    try {
      const tipo = this.tipoUnificado();
      if (tipo) {
        // Uniplus Web / Zeta são unificados com Acesso Web / Acesso Zeta: mesma tabela de clientes
        const todos = await firstValueFrom(this.clientesService.listar());
        this.clientesUnificados.set(todos.filter((c) => c.acessos?.some((a) => a.tipo === tipo)));
      } else {
        const clientes = await firstValueFrom(this.clientesSistemasService.listar(this.sistemaAtivo()));
        this.clientes.set(clientes);
      }
    } finally {
      this.carregando.set(false);
    }
  }

  acessoUnificado(cliente: Cliente): Acesso | undefined {
    return cliente.acessos?.find((a) => a.tipo === this.tipoUnificado());
  }

  abrirNovo() {
    if (this.ehUnificado()) {
      this.clienteUnificadoEmEdicao.set(null);
      this.modalUnificadoAberto.set(true);
    } else {
      this.clienteEmEdicao.set(null);
      this.modalAberto.set(true);
    }
  }

  abrirEdicao(cliente: ClienteSistema) {
    this.clienteEmEdicao.set(cliente);
    this.modalAberto.set(true);
  }

  abrirEdicaoUnificado(cliente: Cliente) {
    this.clienteUnificadoEmEdicao.set(cliente);
    this.modalUnificadoAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.clienteEmEdicao.set(null);
  }

  fecharModalUnificado() {
    this.modalUnificadoAberto.set(false);
    this.clienteUnificadoEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Cliente salvo.');
  }

  async aoSalvarUnificado() {
    this.fecharModalUnificado();
    await this.carregar();
    this.toast.sucesso('Cliente salvo.');
  }

  abrirLicencas() {
    this.licencasModalAberto.set(true);
  }

  abrirCategorias() {
    this.categoriasModalAberto.set(true);
  }

  async aoAlterarCategorias() {
    const categorias = await firstValueFrom(this.categoriasService.listar());
    this.categorias.set(categorias);
    await this.carregar();
    this.toast.sucesso('Categorias atualizadas.');
  }

  // renomear/excluir direto no select do filtro: ele já atualiza a própria lista e já
  // mostra o toast, aqui só recarrega os clientes, que trazem categoria_nome pronto do
  // servidor e ficariam com o nome antigo
  async aoRenomearOuExcluirCategoria() {
    await this.carregar(true);
  }

  abrirRelatorio() {
    this.relatorioModalAberto.set(true);
  }

  async aoAlterarLicencas() {
    await this.carregar();
    this.toast.sucesso('Licenças atualizadas.');
  }
}

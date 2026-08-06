import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, Cliente, ClienteSistema, SISTEMAS, Sistema, TipoAcesso } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { ClientesService } from '../../../../core/clientes.service';
import { ClienteSistemaModalComponent } from '../cliente-sistema-modal/cliente-sistema-modal.component';
import { ClienteModalComponent } from '../cliente-modal/cliente-modal.component';
import { LicencasModalComponent } from '../licencas-modal/licencas-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeToggleComponent } from '../../../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

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
    ViewModeToggleComponent,
    SkeletonComponent,
  ],
  templateUrl: './clientes-sistemas.component.html',
})
export class ClientesSistemasComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);
  private clientesService = inject(ClientesService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  readonly sistemas = SISTEMAS;

  // liga true quando o Resumo manda entrar já abrindo o cadastro (botão "+ Cliente")
  abrirNovoAoEntrar = input(false);

  sistemaAtivo = signal<Sistema>('uniplus');
  busca = signal('');

  clientes = signal<ClienteSistema[]>([]);
  clientesUnificados = signal<Cliente[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  clienteEmEdicao = signal<ClienteSistema | null>(null);

  modalUnificadoAberto = signal(false);
  clienteUnificadoEmEdicao = signal<Cliente | null>(null);

  licencasModalAberto = signal(false);

  tipoUnificado = computed<TipoAcesso | null>(() => TIPO_POR_SISTEMA_UNIFICADO[this.sistemaAtivo()] ?? null);
  ehUnificado = computed(() => this.tipoUnificado() !== null);
  temVersaoBuild = computed(() => this.sistemas.find((s) => s.valor === this.sistemaAtivo())?.temVersaoBuild ?? false);
  usaListaDeLicencas = computed(() => SISTEMAS_COM_LISTA_DE_LICENCAS.includes(this.sistemaAtivo()));

  clientesFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.clientes();
    return this.clientes().filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo)
    );
  });

  clientesUnificadosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.clientesUnificados();
    return this.clientesUnificados().filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.cnpj || '').toLowerCase().includes(termo)
    );
  });

  ngOnInit() {
    this.carregar();
    if (this.abrirNovoAoEntrar()) this.abrirNovo();
  }

  selecionarSistema(sistema: Sistema) {
    this.sistemaAtivo.set(sistema);
    this.busca.set('');
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
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

  async aoAlterarLicencas() {
    await this.carregar();
    this.toast.sucesso('Licenças atualizadas.');
  }
}

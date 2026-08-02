import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, Cliente, Contabilidade, TIPOS_ACESSO } from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { ContabilidadesService } from '../../../../core/contabilidades.service';
import { EnviosContabilidadeService } from '../../../../core/envios-contabilidade.service';
import { CopyFieldComponent } from '../../../../shared/copy-field.component';
import { CardComponent } from '../../../../shared/card.component';
import { ClienteModalComponent } from '../cliente-modal/cliente-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

interface Envio {
  cliente: Cliente;
  acesso: Acesso;
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

@Component({
  selector: 'app-envios-contabilidade-panel',
  imports: [FormsModule, NgClass, CopyFieldComponent, CardComponent, ClienteModalComponent, SkeletonComponent],
  templateUrl: './envios-contabilidade-panel.component.html',
})
export class EnviosContabilidadePanelComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private contabilidadesService = inject(ContabilidadesService);
  private enviosContabilidadeService = inject(EnviosContabilidadeService);
  private toast = inject(ToastService);

  readonly tipos = TIPOS_ACESSO;

  buscaContabilidade = signal('');
  buscaCliente = signal('');

  contabilidades = signal<Contabilidade[]>([]);
  clientes = signal<Cliente[]>([]);
  carregando = signal(true);

  contabilidadeSelecionadaId = signal<number | null>(null);

  formNovaAberto = signal(false);
  nomeNova = signal('');
  emailNova = signal('');
  criando = signal(false);
  erroNova = signal('');

  clienteModalAberto = signal(false);
  clienteEmEdicao = signal<Cliente | null>(null);

  mesSelecionado = signal(this.mesAtual());
  statusEnviosMes = signal<Map<number, boolean>>(new Map());
  carregandoStatusMes = signal(false);

  rotuloMes = computed(() => {
    const { ano, mes } = this.mesSelecionado();
    return `${NOMES_MES[mes - 1]} de ${ano}`;
  });

  // um envio por acesso (anydesk / acesso_web / acesso_zeta) marcado com "enviar para a contabilidade"
  envios = computed<Envio[]>(() => {
    const lista: Envio[] = [];
    for (const cliente of this.clientes()) {
      for (const acesso of cliente.acessos || []) {
        if (acesso.enviar_contabilidade && acesso.contabilidade_id) {
          lista.push({ cliente, acesso });
        }
      }
    }
    return lista;
  });

  totalPorContabilidade = computed(() => {
    const mapa = new Map<number, number>();
    for (const { acesso } of this.envios()) {
      const id = acesso.contabilidade_id!;
      mapa.set(id, (mapa.get(id) || 0) + 1);
    }
    return mapa;
  });

  // só as contabilidades que realmente têm algum envio marcado, pra não poluir a lista
  contabilidadesComEnvio = computed(() => {
    const totais = this.totalPorContabilidade();
    return this.contabilidades().filter((c) => (totais.get(c.id!) || 0) > 0);
  });

  contabilidadesFiltradas = computed(() => {
    const termo = this.buscaContabilidade().trim().toLowerCase();
    return this.contabilidadesComEnvio().filter((c) => !termo || c.nome.toLowerCase().includes(termo));
  });

  contabilidadeSelecionada = computed(
    () => this.contabilidades().find((c) => c.id === this.contabilidadeSelecionadaId()) || null
  );

  enviosDaContabilidade = computed(() => {
    const id = this.contabilidadeSelecionadaId();
    if (!id) return [];
    const termo = this.buscaCliente().trim().toLowerCase();
    return this.envios()
      .filter((e) => e.acesso.contabilidade_id === id)
      .filter(
        (e) =>
          !termo || e.cliente.nome.toLowerCase().includes(termo) || (e.cliente.cnpj || '').toLowerCase().includes(termo)
      )
      .sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome) || a.acesso.tipo.localeCompare(b.acesso.tipo));
  });

  ngOnInit() {
    this.carregar();
    this.carregarStatusMes();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const [contabilidades, clientes] = await Promise.all([
        firstValueFrom(this.contabilidadesService.listar()),
        firstValueFrom(this.clientesService.listar()),
      ]);
      this.contabilidades.set(contabilidades);
      this.clientes.set(clientes);
    } finally {
      this.carregando.set(false);
    }
  }

  private mesAtual(): { ano: number; mes: number } {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  }

  async carregarStatusMes() {
    const { ano, mes } = this.mesSelecionado();
    this.carregandoStatusMes.set(true);
    try {
      const lista = await firstValueFrom(this.enviosContabilidadeService.listarStatusMes(ano, mes));
      this.statusEnviosMes.set(new Map(lista.map((s) => [s.acesso_id, !!s.enviado])));
    } finally {
      this.carregandoStatusMes.set(false);
    }
  }

  mesAnterior() {
    const { ano, mes } = this.mesSelecionado();
    this.mesSelecionado.set(mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 });
    this.carregarStatusMes();
  }

  proximoMes() {
    const { ano, mes } = this.mesSelecionado();
    this.mesSelecionado.set(mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 });
    this.carregarStatusMes();
  }

  enviadoNoMes(acessoId: number): boolean {
    return this.statusEnviosMes().get(acessoId) || false;
  }

  async alternarEnvioMes(acessoId: number) {
    const anterior = this.enviadoNoMes(acessoId);
    const novoValor = !anterior;

    const mapa = new Map(this.statusEnviosMes());
    mapa.set(acessoId, novoValor);
    this.statusEnviosMes.set(mapa);

    const { ano, mes } = this.mesSelecionado();
    try {
      await firstValueFrom(this.enviosContabilidadeService.marcar(acessoId, ano, mes, novoValor));
    } catch {
      const mapaRevertido = new Map(this.statusEnviosMes());
      mapaRevertido.set(acessoId, anterior);
      this.statusEnviosMes.set(mapaRevertido);
    }
  }

  rotuloTipo(tipo: string): string {
    return this.tipos.find((t) => t.valor === tipo)?.rotulo || tipo;
  }

  rotuloIdentificador(tipo: string): string {
    if (tipo === 'anydesk') return 'Código AnyDesk';
    if (tipo === 'acesso_zeta') return 'E-mail do Cliente';
    return 'Identificador';
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

  selecionarContabilidade(id: number) {
    this.contabilidadeSelecionadaId.set(id);
    this.buscaCliente.set('');
  }

  abrirFormNova() {
    this.nomeNova.set('');
    this.emailNova.set('');
    this.erroNova.set('');
    this.formNovaAberto.set(true);
  }

  cancelarFormNova() {
    this.formNovaAberto.set(false);
  }

  async criarContabilidade() {
    const nome = this.nomeNova().trim().toUpperCase();
    if (!nome || this.criando()) return;

    this.criando.set(true);
    this.erroNova.set('');
    try {
      const resultado = await firstValueFrom(
        this.contabilidadesService.criar({ nome, email: this.emailNova().trim() || null })
      );
      this.formNovaAberto.set(false);
      await this.carregar();
      this.selecionarContabilidade(resultado.id);
      this.toast.sucesso('Contabilidade criada.');
    } catch {
      this.erroNova.set('Já existe uma contabilidade com esse nome.');
    } finally {
      this.criando.set(false);
    }
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
    await this.carregar();
    this.toast.sucesso('Cliente salvo.');
  }
}

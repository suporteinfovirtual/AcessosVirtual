import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, Cliente, TIPOS_ACESSO } from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { CopyFieldComponent } from '../../../../shared/copy-field.component';
import { ClienteModalComponent } from '../cliente-modal/cliente-modal.component';

interface Envio {
  cliente: Cliente;
  acesso: Acesso;
}

interface ResumoContabilidade {
  id: number;
  nome: string;
  total: number;
}

@Component({
  selector: 'app-envios-contabilidade-panel',
  imports: [FormsModule, CopyFieldComponent, ClienteModalComponent],
  templateUrl: './envios-contabilidade-panel.component.html',
})
export class EnviosContabilidadePanelComponent implements OnInit {
  private clientesService = inject(ClientesService);

  voltar = output<void>();

  readonly tipos = TIPOS_ACESSO;

  busca = signal('');
  clientes = signal<Cliente[]>([]);
  carregando = signal(true);

  contabilidadeSelecionada = signal<number | null>(null);

  clienteModalAberto = signal(false);
  clienteEmEdicao = signal<Cliente | null>(null);

  // um envio por acesso (acesso_web / acesso_zeta) marcado com "enviar para a contabilidade"
  envios = computed<Envio[]>(() => {
    const lista: Envio[] = [];
    for (const cliente of this.clientes()) {
      for (const acesso of cliente.acessos || []) {
        if ((acesso.tipo === 'acesso_web' || acesso.tipo === 'acesso_zeta') && acesso.enviar_contabilidade && acesso.contabilidade_id) {
          lista.push({ cliente, acesso });
        }
      }
    }
    return lista;
  });

  // só as contabilidades que realmente têm algum envio marcado
  contabilidades = computed<ResumoContabilidade[]>(() => {
    const mapa = new Map<number, ResumoContabilidade>();
    for (const { acesso } of this.envios()) {
      const id = acesso.contabilidade_id!;
      if (!mapa.has(id)) mapa.set(id, { id, nome: acesso.contabilidade_nome || 'Sem nome', total: 0 });
      mapa.get(id)!.total++;
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  });

  contabilidadesFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.contabilidades();
    return this.contabilidades().filter((c) => c.nome.toLowerCase().includes(termo));
  });

  nomeContabilidadeSelecionada = computed(
    () => this.contabilidades().find((c) => c.id === this.contabilidadeSelecionada())?.nome || ''
  );

  enviosDaContabilidade = computed(() => {
    const id = this.contabilidadeSelecionada();
    if (!id) return [];
    const termo = this.busca().trim().toLowerCase();
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
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const clientes = await firstValueFrom(this.clientesService.listar());
      this.clientes.set(clientes);
    } finally {
      this.carregando.set(false);
    }
  }

  rotuloTipo(tipo: string): string {
    return this.tipos.find((t) => t.valor === tipo)?.rotulo || tipo;
  }

  selecionarContabilidade(id: number) {
    this.contabilidadeSelecionada.set(id);
    this.busca.set('');
  }

  voltarParaContabilidades() {
    this.contabilidadeSelecionada.set(null);
    this.busca.set('');
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
  }
}

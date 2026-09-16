import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SISTEMAS, Sistema } from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { calcularLucro, calcularMargemPercentual } from '../../../../core/financeiro.util';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

// tipo de acesso que identifica um cliente unificado (tabela clientes) como sendo
// de um sistema ou outro — mesmo mapeamento usado em clientes-sistemas.component.ts
const TIPO_POR_SISTEMA_UNIFICADO: Partial<Record<Sistema, 'acesso_web' | 'acesso_zeta'>> = {
  uniplus_web: 'acesso_web',
  zeta: 'acesso_zeta',
};

interface LinhaRelatorio {
  sistema: Sistema;
  nome: string;
  custo: number | null;
  valor: number | null;
  lucro: number | null;
  margem: number | null;
}

@Component({
  selector: 'app-relatorio-lucro-modal',
  imports: [FormsModule, DecimalPipe, SkeletonComponent],
  templateUrl: './relatorio-lucro-modal.component.html',
})
export class RelatorioLucroModalComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private clientesSistemasService = inject(ClientesSistemasService);

  fechar = output<void>();

  readonly sistemas = SISTEMAS;

  busca = signal('');
  carregando = signal(true);
  linhas = signal<LinhaRelatorio[]>([]);

  linhasFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = !termo ? this.linhas() : this.linhas().filter((l) => l.nome.toLowerCase().includes(termo));
    // mais lucrativos primeiro; quem não tem os dois valores preenchidos (lucro null) vai pro fim
    return [...lista].sort((a, b) => {
      if (a.lucro === null && b.lucro === null) return a.nome.localeCompare(b.nome);
      if (a.lucro === null) return 1;
      if (b.lucro === null) return -1;
      return b.lucro - a.lucro;
    });
  });

  totalCusto = computed(() => this.linhasFiltradas().reduce((soma, l) => soma + (l.custo ?? 0), 0));
  totalValor = computed(() => this.linhasFiltradas().reduce((soma, l) => soma + (l.valor ?? 0), 0));
  totalLucro = computed(() => this.totalValor() - this.totalCusto());
  totalMargem = computed(() => calcularMargemPercentual(this.totalCusto(), this.totalValor()));
  totalSemDados = computed(() => this.linhasFiltradas().filter((l) => l.lucro === null).length);

  rotuloSistema(sistema: Sistema): string {
    return this.sistemas.find((s) => s.valor === sistema)?.rotulo ?? sistema;
  }

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const linhas: LinhaRelatorio[] = [];

      const clientesUnificados = await firstValueFrom(this.clientesService.listar());
      for (const [sistema, tipoAcesso] of Object.entries(TIPO_POR_SISTEMA_UNIFICADO) as [Sistema, 'acesso_web' | 'acesso_zeta'][]) {
        for (const cliente of clientesUnificados) {
          if (!cliente.acessos?.some((a) => a.tipo === tipoAcesso)) continue;
          linhas.push({
            sistema,
            nome: cliente.nome,
            custo: cliente.custo_mensalidade ?? null,
            valor: cliente.valor_mensalidade ?? null,
            lucro: calcularLucro(cliente.custo_mensalidade, cliente.valor_mensalidade),
            margem: calcularMargemPercentual(cliente.custo_mensalidade, cliente.valor_mensalidade),
          });
        }
      }

      for (const sistema of ['uniplus', 'sgbr'] as Sistema[]) {
        const clientes = await firstValueFrom(this.clientesSistemasService.listar(sistema));
        for (const cliente of clientes) {
          linhas.push({
            sistema,
            nome: cliente.nome,
            custo: cliente.custo_mensalidade ?? null,
            valor: cliente.valor_mensalidade ?? null,
            lucro: calcularLucro(cliente.custo_mensalidade, cliente.valor_mensalidade),
            margem: calcularMargemPercentual(cliente.custo_mensalidade, cliente.valor_mensalidade),
          });
        }
      }

      this.linhas.set(linhas);
    } finally {
      this.carregando.set(false);
    }
  }
}

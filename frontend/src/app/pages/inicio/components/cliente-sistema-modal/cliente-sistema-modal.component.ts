import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Categoria, ClienteSistema, ENQUADRAMENTOS_FISCAIS, Licenca, Sistema, SISTEMAS } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { CategoriasService } from '../../../../core/categorias.service';
import { LicencasService } from '../../../../core/licencas.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { formatarTelefone, somenteDigitos } from '../../../../core/texto.util';
import { calcularLucro, calcularMargemPercentual } from '../../../../core/financeiro.util';
import { LicencasSelectComponent } from '../licencas-select/licencas-select.component';

@Component({
  selector: 'app-cliente-sistema-modal',
  imports: [FormsModule, DecimalPipe, LicencasSelectComponent],
  templateUrl: './cliente-sistema-modal.component.html',
})
export class ClienteSistemaModalComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);
  private categoriasService = inject(CategoriasService);
  private licencasService = inject(LicencasService);
  private confirmService = inject(ConfirmService);

  readonly enquadramentosFiscais = ENQUADRAMENTOS_FISCAIS;

  cliente = input<ClienteSistema | null>(null);
  sistema = input.required<Sistema>();
  fechar = output<void>();
  // emite o id do cliente salvo (útil pra quem converte uma negociação e precisa
  // do id recém-criado); consumidores que só querem recarregar podem ignorar o valor
  salvo = output<number>();

  nome = signal('');
  cnpj = signal('');
  telefone = signal('');
  licencas = signal('');
  licencaIds = signal<number[]>([]);
  licencasDisponiveis = signal<Licenca[]>([]);
  enquadramentoFiscal = signal('');
  versaoBuild = signal('');
  observacoes = signal('');
  custoMensalidade = signal<number | null>(null);
  valorMensalidade = signal<number | null>(null);
  categoriaId = signal<number | null>(null);
  categorias = signal<Categoria[]>([]);

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.cliente()?.id;
  }

  get temVersaoBuild() {
    return SISTEMAS.find((s) => s.valor === this.sistema())?.temVersaoBuild ?? false;
  }

  get usaListaDeLicencas() {
    return this.sistema() === 'uniplus';
  }

  lucro = computed(() => calcularLucro(this.custoMensalidade(), this.valorMensalidade()));
  margem = computed(() => calcularMargemPercentual(this.custoMensalidade(), this.valorMensalidade()));

  aoDigitarTelefone(valor: string) {
    this.telefone.set(formatarTelefone(valor));
  }

  ngOnInit() {
    if (this.usaListaDeLicencas) {
      firstValueFrom(this.licencasService.listar()).then((licencas) => this.licencasDisponiveis.set(licencas));
    }
    firstValueFrom(this.categoriasService.listar()).then((categorias) => this.categorias.set(categorias));

    const cliente = this.cliente();
    if (cliente) {
      this.nome.set(cliente.nome);
      this.cnpj.set(cliente.cnpj || '');
      this.telefone.set(cliente.telefone || '');
      this.licencas.set(cliente.licencas || '');
      this.licencaIds.set((cliente.licencas_selecionadas || []).map((l) => l.id!));
      this.enquadramentoFiscal.set(cliente.enquadramento_fiscal || '');
      this.versaoBuild.set(cliente.versao_build || '');
      this.observacoes.set(cliente.observacoes || '');
      this.custoMensalidade.set(cliente.custo_mensalidade ?? null);
      this.valorMensalidade.set(cliente.valor_mensalidade ?? null);
      this.categoriaId.set(cliente.categoria_id ?? null);
    }
  }

  async salvarCliente() {
    if (!this.nome().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      nome: this.nome().trim(),
      cnpj: somenteDigitos(this.cnpj()) || null,
      telefone: this.telefone().trim() || null,
      licencas: this.licencas().trim() || null,
      licenca_ids: this.usaListaDeLicencas ? this.licencaIds() : undefined,
      enquadramento_fiscal: this.enquadramentoFiscal().trim() || null,
      versao_build: this.temVersaoBuild ? this.versaoBuild().trim() || null : null,
      observacoes: this.observacoes().trim() || null,
      custo_mensalidade: this.custoMensalidade(),
      valor_mensalidade: this.valorMensalidade(),
      categoria_id: this.categoriaId(),
    };

    try {
      if (this.editando) {
        await firstValueFrom(this.clientesSistemasService.atualizar(this.cliente()!.id!, dados));
        this.salvo.emit(this.cliente()!.id!);
      } else {
        const { id } = await firstValueFrom(this.clientesSistemasService.criar({ ...dados, sistema: this.sistema() }));
        this.salvo.emit(id);
      }
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirCliente() {
    const cliente = this.cliente();
    if (!cliente?.id || this.excluindo()) return;
    if (!(await this.confirmService.confirmar(`Excluir "${cliente.nome}"?`))) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.clientesSistemasService.remover(cliente.id));
      this.salvo.emit(cliente.id);
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteNegociacao, SISTEMAS, STATUS_NEGOCIACAO, Sistema, StatusNegociacao } from '../../../../core/models';
import { NegociacaoService } from '../../../../core/negociacao.service';
import { formatarTelefone, somenteDigitos } from '../../../../core/texto.util';

@Component({
  selector: 'app-negociacao-modal',
  imports: [FormsModule],
  templateUrl: './negociacao-modal.component.html',
})
export class NegociacaoModalComponent implements OnInit {
  private negociacaoService = inject(NegociacaoService);

  cliente = input<ClienteNegociacao | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  nome = signal('');
  cnpj = signal('');
  telefone = signal('');
  enquadramentoFiscal = signal('');
  observacoes = signal('');
  status = signal<StatusNegociacao>('em_negociacao');
  sistema = signal<Sistema | null>(null);
  precisaMigrarBase = signal(false);

  readonly statusOpcoes = STATUS_NEGOCIACAO;
  readonly sistemaOpcoes = SISTEMAS;

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.cliente()?.id;
  }

  aoDigitarTelefone(valor: string) {
    this.telefone.set(formatarTelefone(valor));
  }

  ngOnInit() {
    const cliente = this.cliente();
    if (cliente) {
      this.nome.set(cliente.nome);
      this.cnpj.set(cliente.cnpj || '');
      this.telefone.set(cliente.telefone || '');
      this.enquadramentoFiscal.set(cliente.enquadramento_fiscal || '');
      this.observacoes.set(cliente.observacoes || '');
      this.status.set(cliente.status || 'em_negociacao');
      this.sistema.set(cliente.sistema || null);
      this.precisaMigrarBase.set(!!cliente.precisa_migrar_base);
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
      enquadramento_fiscal: this.enquadramentoFiscal().trim() || null,
      observacoes: this.observacoes().trim() || null,
      sistema: this.sistema(),
      precisa_migrar_base: this.precisaMigrarBase(),
    };

    try {
      if (this.editando) {
        await firstValueFrom(this.negociacaoService.atualizar(this.cliente()!.id!, { ...dados, status: this.status() }));
      } else {
        await firstValueFrom(this.negociacaoService.criar(dados));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirCliente() {
    const cliente = this.cliente();
    if (!cliente?.id || this.excluindo()) return;
    if (!confirm(`Excluir "${cliente.nome}"?`)) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.negociacaoService.remover(cliente.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

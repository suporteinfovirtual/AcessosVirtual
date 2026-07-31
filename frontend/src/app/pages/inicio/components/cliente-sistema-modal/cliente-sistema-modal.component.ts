import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteSistema, Sistema, SISTEMAS } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { somenteDigitos } from '../../../../core/texto.util';

@Component({
  selector: 'app-cliente-sistema-modal',
  imports: [FormsModule],
  templateUrl: './cliente-sistema-modal.component.html',
})
export class ClienteSistemaModalComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);

  cliente = input<ClienteSistema | null>(null);
  sistema = input.required<Sistema>();
  fechar = output<void>();
  salvo = output<void>();

  nome = signal('');
  cnpj = signal('');
  licencas = signal('');
  enquadramentoFiscal = signal('');
  versaoBuild = signal('');
  observacoes = signal('');

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.cliente()?.id;
  }

  get temVersaoBuild() {
    return SISTEMAS.find((s) => s.valor === this.sistema())?.temVersaoBuild ?? false;
  }

  ngOnInit() {
    const cliente = this.cliente();
    if (cliente) {
      this.nome.set(cliente.nome);
      this.cnpj.set(cliente.cnpj || '');
      this.licencas.set(cliente.licencas || '');
      this.enquadramentoFiscal.set(cliente.enquadramento_fiscal || '');
      this.versaoBuild.set(cliente.versao_build || '');
      this.observacoes.set(cliente.observacoes || '');
    }
  }

  async salvarCliente() {
    if (!this.nome().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      nome: this.nome().trim(),
      cnpj: somenteDigitos(this.cnpj()) || null,
      licencas: this.licencas().trim() || null,
      enquadramento_fiscal: this.enquadramentoFiscal().trim() || null,
      versao_build: this.temVersaoBuild ? this.versaoBuild().trim() || null : null,
      observacoes: this.observacoes().trim() || null,
    };

    try {
      if (this.editando) {
        await firstValueFrom(this.clientesSistemasService.atualizar(this.cliente()!.id!, dados));
      } else {
        await firstValueFrom(this.clientesSistemasService.criar({ ...dados, sistema: this.sistema() }));
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
      await firstValueFrom(this.clientesSistemasService.remover(cliente.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

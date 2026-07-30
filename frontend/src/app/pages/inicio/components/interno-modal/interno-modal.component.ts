import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ContaInterna } from '../../../../core/models';
import { InternosService } from '../../../../core/internos.service';

@Component({
  selector: 'app-interno-modal',
  imports: [FormsModule],
  templateUrl: './interno-modal.component.html',
})
export class InternoModalComponent implements OnInit {
  private internosService = inject(InternosService);

  conta = input<ContaInterna | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  servico = signal('');
  usuario = signal('');
  senha = signal('');
  observacoes = signal('');

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.conta()?.id;
  }

  ngOnInit() {
    const conta = this.conta();
    if (conta) {
      this.servico.set(conta.servico);
      this.usuario.set(conta.usuario || '');
      this.senha.set(conta.senha || '');
      this.observacoes.set(conta.observacoes || '');
    }
  }

  async salvarConta() {
    if (!this.servico().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      servico: this.servico().trim(),
      usuario: this.usuario().trim() || null,
      senha: this.senha().trim() || null,
      observacoes: this.observacoes().trim() || null,
    };

    try {
      if (this.editando) {
        await firstValueFrom(this.internosService.atualizar(this.conta()!.id!, dados));
      } else {
        await firstValueFrom(this.internosService.criar(dados));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirConta() {
    const conta = this.conta();
    if (!conta?.id || this.excluindo()) return;
    if (!confirm(`Excluir a conta interna "${conta.servico}"?`)) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.internosService.remover(conta.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

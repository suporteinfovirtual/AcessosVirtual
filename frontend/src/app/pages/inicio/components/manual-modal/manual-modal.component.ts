import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Manual } from '../../../../core/models';
import { ManuaisService } from '../../../../core/manuais.service';

@Component({
  selector: 'app-manual-modal',
  imports: [FormsModule],
  templateUrl: './manual-modal.component.html',
})
export class ManualModalComponent implements OnInit {
  private manuaisService = inject(ManuaisService);

  manual = input<Manual | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  titulo = signal('');
  descricao = signal('');

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.manual()?.id;
  }

  ngOnInit() {
    const manual = this.manual();
    if (manual) {
      this.titulo.set(manual.titulo);
      this.descricao.set(manual.descricao || '');
    }
  }

  async salvarManual() {
    if (!this.titulo().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = { titulo: this.titulo().trim(), descricao: this.descricao().trim() || null };

    try {
      if (this.editando) {
        await firstValueFrom(this.manuaisService.atualizar(this.manual()!.id!, dados));
      } else {
        await firstValueFrom(this.manuaisService.criar(dados));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirManual() {
    const manual = this.manual();
    if (!manual?.id || this.excluindo()) return;
    if (!confirm(`Excluir o manual "${manual.titulo}" e todos os passos dele?`)) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.manuaisService.remover(manual.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

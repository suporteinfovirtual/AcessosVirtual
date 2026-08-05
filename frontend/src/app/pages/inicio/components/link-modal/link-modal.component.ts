import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LinkPessoal } from '../../../../core/models';
import { LinksService } from '../../../../core/links.service';
import { ConfirmService } from '../../../../shared/confirm.service';

@Component({
  selector: 'app-link-modal',
  imports: [FormsModule],
  templateUrl: './link-modal.component.html',
})
export class LinkModalComponent implements OnInit {
  private linksService = inject(LinksService);
  private confirmService = inject(ConfirmService);

  link = input<LinkPessoal | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  titulo = signal('');
  url = signal('');

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.link()?.id;
  }

  ngOnInit() {
    const link = this.link();
    if (link) {
      this.titulo.set(link.titulo);
      this.url.set(link.url);
    }
  }

  async salvarLink() {
    if (!this.titulo().trim() || !this.url().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = { titulo: this.titulo().trim(), url: this.normalizarUrl(this.url().trim()) };

    try {
      if (this.editando) {
        await firstValueFrom(this.linksService.atualizar(this.link()!.id!, dados));
      } else {
        await firstValueFrom(this.linksService.criar(dados));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirLink() {
    const link = this.link();
    if (!link?.id || this.excluindo()) return;
    if (!(await this.confirmService.confirmar(`Excluir o link "${link.titulo}"?`))) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.linksService.remover(link.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }

  private normalizarUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
}

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { WikiArtigo } from '../../../../core/models';
import { WikiService } from '../../../../core/wiki.service';
import { ConfirmService } from '../../../../shared/confirm.service';

@Component({
  selector: 'app-wiki-modal',
  imports: [FormsModule],
  templateUrl: './wiki-modal.component.html',
})
export class WikiModalComponent implements OnInit {
  private wikiService = inject(WikiService);
  private confirmService = inject(ConfirmService);

  artigo = input<WikiArtigo | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  titulo = signal('');
  codigo = signal('');
  mensagemErro = signal('');
  causa = signal('');
  solucao = signal('');

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.artigo()?.id;
  }

  ngOnInit() {
    const artigo = this.artigo();
    if (artigo) {
      this.titulo.set(artigo.titulo);
      this.codigo.set(artigo.codigo || '');
      this.mensagemErro.set(artigo.mensagem_erro || '');
      this.causa.set(artigo.causa || '');
      this.solucao.set(artigo.solucao || '');
    }
  }

  async salvarArtigo() {
    if (!this.titulo().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      titulo: this.titulo().trim(),
      codigo: this.codigo().trim() || null,
      mensagem_erro: this.mensagemErro().trim() || null,
      causa: this.causa().trim() || null,
      solucao: this.solucao().trim() || null,
    };

    try {
      if (this.editando) {
        await firstValueFrom(this.wikiService.atualizar(this.artigo()!.id!, dados));
      } else {
        await firstValueFrom(this.wikiService.criar(dados));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirArtigo() {
    const artigo = this.artigo();
    if (!artigo?.id || this.excluindo()) return;
    if (!(await this.confirmService.confirmar(`Excluir o artigo "${artigo.titulo}"?`))) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.wikiService.remover(artigo.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

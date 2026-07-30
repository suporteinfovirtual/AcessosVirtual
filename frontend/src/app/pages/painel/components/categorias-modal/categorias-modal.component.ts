import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Categoria } from '../../../../core/models';
import { CategoriasService } from '../../../../core/categorias.service';

@Component({
  selector: 'app-categorias-modal',
  imports: [FormsModule],
  templateUrl: './categorias-modal.component.html',
})
export class CategoriasModalComponent implements OnInit {
  private categoriasService = inject(CategoriasService);

  fechar = output<void>();
  alterado = output<void>();

  categorias = signal<Categoria[]>([]);
  carregando = signal(true);
  erro = signal('');

  nomeNova = signal('');
  criando = signal(false);

  idEmEdicao = signal<number | null>(null);
  nomeEdicao = signal('');
  salvandoEdicao = signal(false);

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const categorias = await firstValueFrom(this.categoriasService.listar());
      this.categorias.set(categorias);
    } catch {
      this.erro.set('Não foi possível carregar as categorias.');
    } finally {
      this.carregando.set(false);
    }
  }

  async criarCategoria() {
    const nome = this.nomeNova().trim();
    if (!nome || this.criando()) return;

    this.criando.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.categoriasService.criar({ nome }));
      this.nomeNova.set('');
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe uma categoria com esse nome.');
    } finally {
      this.criando.set(false);
    }
  }

  iniciarEdicao(categoria: Categoria) {
    this.idEmEdicao.set(categoria.id!);
    this.nomeEdicao.set(categoria.nome);
  }

  cancelarEdicao() {
    this.idEmEdicao.set(null);
    this.nomeEdicao.set('');
  }

  async salvarEdicao() {
    const id = this.idEmEdicao();
    const nome = this.nomeEdicao().trim();
    if (!id || !nome || this.salvandoEdicao()) return;

    this.salvandoEdicao.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.categoriasService.atualizar(id, { nome }));
      this.cancelarEdicao();
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe uma categoria com esse nome.');
    } finally {
      this.salvandoEdicao.set(false);
    }
  }

  async excluirCategoria(categoria: Categoria) {
    if (!confirm(`Excluir a categoria "${categoria.nome}"? Os clientes ligados a ela ficam sem categoria.`)) return;

    try {
      await firstValueFrom(this.categoriasService.remover(categoria.id!));
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    }
  }
}

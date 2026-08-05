import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Contabilidade } from '../../../../core/models';
import { ContabilidadesService } from '../../../../core/contabilidades.service';
import { ConfirmService } from '../../../../shared/confirm.service';

@Component({
  selector: 'app-contabilidades-modal',
  imports: [FormsModule],
  templateUrl: './contabilidades-modal.component.html',
})
export class ContabilidadesModalComponent implements OnInit {
  private contabilidadesService = inject(ContabilidadesService);
  private confirmService = inject(ConfirmService);

  fechar = output<void>();
  alterado = output<void>();

  contabilidades = signal<Contabilidade[]>([]);
  carregando = signal(true);
  erro = signal('');

  nomeNova = signal('');
  emailNovo = signal('');
  criando = signal(false);

  idEmEdicao = signal<number | null>(null);
  nomeEdicao = signal('');
  emailEdicao = signal('');
  salvandoEdicao = signal(false);

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const contabilidades = await firstValueFrom(this.contabilidadesService.listar());
      this.contabilidades.set(contabilidades);
    } catch {
      this.erro.set('Não foi possível carregar as contabilidades.');
    } finally {
      this.carregando.set(false);
    }
  }

  async criarContabilidade() {
    const nome = this.nomeNova().trim().toUpperCase();
    if (!nome || this.criando()) return;

    this.criando.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.contabilidadesService.criar({ nome, email: this.emailNovo().trim() || null }));
      this.nomeNova.set('');
      this.emailNovo.set('');
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe uma contabilidade com esse nome.');
    } finally {
      this.criando.set(false);
    }
  }

  iniciarEdicao(contabilidade: Contabilidade) {
    this.idEmEdicao.set(contabilidade.id!);
    this.nomeEdicao.set(contabilidade.nome);
    this.emailEdicao.set(contabilidade.email || '');
  }

  cancelarEdicao() {
    this.idEmEdicao.set(null);
    this.nomeEdicao.set('');
    this.emailEdicao.set('');
  }

  async salvarEdicao() {
    const id = this.idEmEdicao();
    const nome = this.nomeEdicao().trim().toUpperCase();
    if (!id || !nome || this.salvandoEdicao()) return;

    this.salvandoEdicao.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.contabilidadesService.atualizar(id, { nome, email: this.emailEdicao().trim() || null }));
      this.cancelarEdicao();
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe uma contabilidade com esse nome.');
    } finally {
      this.salvandoEdicao.set(false);
    }
  }

  async excluirContabilidade(contabilidade: Contabilidade) {
    if (!(await this.confirmService.confirmar(`Excluir a contabilidade "${contabilidade.nome}"? Os acessos ligados a ela ficam sem contabilidade.`))) return;

    try {
      await firstValueFrom(this.contabilidadesService.remover(contabilidade.id!));
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    }
  }
}

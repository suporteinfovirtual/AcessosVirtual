import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Tecnico } from '../../../../core/models';
import { TecnicosService } from '../../../../core/tecnicos.service';
import { ConfirmService } from '../../../../shared/confirm.service';

@Component({
  selector: 'app-tecnicos-modal',
  imports: [FormsModule],
  templateUrl: './tecnicos-modal.component.html',
})
export class TecnicosModalComponent implements OnInit {
  private tecnicosService = inject(TecnicosService);
  private confirmService = inject(ConfirmService);

  fechar = output<void>();
  alterado = output<void>();

  tecnicos = signal<Tecnico[]>([]);
  carregando = signal(true);
  erro = signal('');

  nomeNovo = signal('');
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
      const tecnicos = await firstValueFrom(this.tecnicosService.listar());
      this.tecnicos.set(tecnicos);
    } catch {
      this.erro.set('Não foi possível carregar os técnicos.');
    } finally {
      this.carregando.set(false);
    }
  }

  async criarTecnico() {
    const nome = this.nomeNovo().trim();
    if (!nome || this.criando()) return;

    this.criando.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.tecnicosService.criar({ nome }));
      this.nomeNovo.set('');
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe um técnico com esse nome.');
    } finally {
      this.criando.set(false);
    }
  }

  iniciarEdicao(tecnico: Tecnico) {
    this.idEmEdicao.set(tecnico.id!);
    this.nomeEdicao.set(tecnico.nome);
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
      await firstValueFrom(this.tecnicosService.atualizar(id, { nome }));
      this.cancelarEdicao();
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe um técnico com esse nome.');
    } finally {
      this.salvandoEdicao.set(false);
    }
  }

  async excluirTecnico(tecnico: Tecnico) {
    if (!(await this.confirmService.confirmar(`Excluir o técnico "${tecnico.nome}"? As implantações ligadas a ele ficam sem técnico.`))) return;

    try {
      await firstValueFrom(this.tecnicosService.remover(tecnico.id!));
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    }
  }
}

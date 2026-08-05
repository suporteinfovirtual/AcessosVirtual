import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Licenca } from '../../../../core/models';
import { LicencasService } from '../../../../core/licencas.service';
import { ConfirmService } from '../../../../shared/confirm.service';

@Component({
  selector: 'app-licencas-modal',
  imports: [FormsModule],
  templateUrl: './licencas-modal.component.html',
})
export class LicencasModalComponent implements OnInit {
  private licencasService = inject(LicencasService);
  private confirmService = inject(ConfirmService);

  fechar = output<void>();
  alterado = output<void>();

  licencas = signal<Licenca[]>([]);
  carregando = signal(true);
  erro = signal('');

  busca = signal('');

  nomeNova = signal('');
  criando = signal(false);

  idEmEdicao = signal<number | null>(null);
  nomeEdicao = signal('');
  salvandoEdicao = signal(false);

  licencasFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.licencas();
    return this.licencas().filter((l) => l.nome.toLowerCase().includes(termo));
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const licencas = await firstValueFrom(this.licencasService.listar());
      this.licencas.set(licencas);
    } catch {
      this.erro.set('Não foi possível carregar as licenças.');
    } finally {
      this.carregando.set(false);
    }
  }

  async criarLicenca() {
    const nome = this.nomeNova().trim();
    if (!nome || this.criando()) return;

    this.criando.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.licencasService.criar({ nome }));
      this.nomeNova.set('');
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe uma licença com esse nome.');
    } finally {
      this.criando.set(false);
    }
  }

  iniciarEdicao(licenca: Licenca) {
    this.idEmEdicao.set(licenca.id!);
    this.nomeEdicao.set(licenca.nome);
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
      await firstValueFrom(this.licencasService.atualizar(id, { nome }));
      this.cancelarEdicao();
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Já existe uma licença com esse nome.');
    } finally {
      this.salvandoEdicao.set(false);
    }
  }

  async excluirLicenca(licenca: Licenca) {
    if (!(await this.confirmService.confirmar(`Excluir a licença "${licenca.nome}"? Os clientes ligados a ela perdem o vínculo.`))) return;

    try {
      await firstValueFrom(this.licencasService.remover(licenca.id!));
      await this.carregar();
      this.alterado.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    }
  }
}

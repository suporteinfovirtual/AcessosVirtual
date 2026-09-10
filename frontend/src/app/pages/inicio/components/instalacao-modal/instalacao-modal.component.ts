import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Instalacao, SISTEMAS, Tecnico } from '../../../../core/models';
import { InstalacoesService } from '../../../../core/instalacoes.service';
import { TecnicosService } from '../../../../core/tecnicos.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { formatarTelefone, somenteDigitos } from '../../../../core/texto.util';

@Component({
  selector: 'app-instalacao-modal',
  imports: [FormsModule],
  templateUrl: './instalacao-modal.component.html',
})
export class InstalacaoModalComponent implements OnInit {
  private instalacoesService = inject(InstalacoesService);
  private tecnicosService = inject(TecnicosService);
  private confirmService = inject(ConfirmService);

  instalacao = input.required<Instalacao>();
  fechar = output<void>();
  salvo = output<void>();

  telefone = signal('');
  tecnicoId = signal<number | null>(null);
  dataInstalacao = signal('');
  observacoes = signal('');
  instalado = signal(false);
  tecnicos = signal<Tecnico[]>([]);

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  rotuloSistema = computed(() => SISTEMAS.find((s) => s.valor === this.instalacao().cliente_sistema)?.rotulo ?? '');

  linkWhatsapp = computed(() => {
    const digitos = somenteDigitos(this.telefone());
    if (digitos.length < 10) return null;
    return `https://wa.me/55${digitos}`;
  });

  aoDigitarTelefone(valor: string) {
    this.telefone.set(formatarTelefone(valor));
  }

  ngOnInit() {
    firstValueFrom(this.tecnicosService.listar()).then((tecnicos) => this.tecnicos.set(tecnicos));

    const item = this.instalacao();
    this.telefone.set(item.telefone || '');
    this.tecnicoId.set(item.tecnico_id || null);
    this.dataInstalacao.set(item.data_instalacao || '');
    this.observacoes.set(item.observacoes || '');
    this.instalado.set(!!item.instalado);
  }

  async salvar() {
    if (this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      telefone: this.telefone().trim() || null,
      tecnico_id: this.tecnicoId(),
      data_instalacao: this.dataInstalacao() || null,
      observacoes: this.observacoes().trim() || null,
      instalado: this.instalado(),
    };

    try {
      await firstValueFrom(this.instalacoesService.atualizar(this.instalacao().id!, dados));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluir() {
    const item = this.instalacao();
    if (!item.id || this.excluindo()) return;
    if (!(await this.confirmService.confirmar(`Remover a instalação de "${item.cliente_nome}"?`))) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.instalacoesService.remover(item.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível remover. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

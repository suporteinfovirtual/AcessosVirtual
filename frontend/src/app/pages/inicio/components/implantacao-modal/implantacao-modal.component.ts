import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteRef, Implantacao, Tecnico } from '../../../../core/models';
import { ImplantacoesService } from '../../../../core/implantacoes.service';
import { TecnicosService } from '../../../../core/tecnicos.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { ClientePickerComponent } from '../cliente-picker/cliente-picker.component';

@Component({
  selector: 'app-implantacao-modal',
  imports: [FormsModule, ClientePickerComponent],
  templateUrl: './implantacao-modal.component.html',
})
export class ImplantacaoModalComponent implements OnInit {
  private implantacoesService = inject(ImplantacoesService);
  private tecnicosService = inject(TecnicosService);
  private confirmService = inject(ConfirmService);

  implantacao = input<Implantacao | null>(null);
  dataInicial = input<string | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  cliente = signal<ClienteRef | null>(null);
  data = signal('');
  hora = signal('');
  observacoes = signal('');
  concluidaManual = signal(false);
  tecnicoId = signal<number | null>(null);
  tecnicos = signal<Tecnico[]>([]);

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.implantacao()?.id;
  }

  // considera concluída automaticamente quando a data já passou, mesmo sem marcação manual
  get jaPassouData(): boolean {
    const data = this.implantacao()?.data;
    if (!data) return false;
    return data < new Date().toISOString().slice(0, 10);
  }

  ngOnInit() {
    firstValueFrom(this.tecnicosService.listar()).then((tecnicos) => this.tecnicos.set(tecnicos));

    const item = this.implantacao();
    if (item) {
      this.cliente.set({ sistema: item.cliente_sistema, ref_id: item.cliente_ref_id, nome: item.cliente_nome });
      this.data.set(item.data);
      this.hora.set(item.hora);
      this.observacoes.set(item.observacoes || '');
      this.concluidaManual.set(!!item.concluida_manual);
      this.tecnicoId.set(item.tecnico_id || null);
    } else if (this.dataInicial()) {
      this.data.set(this.dataInicial()!);
    }
  }

  async salvarImplantacao() {
    const cliente = this.cliente();
    if (!cliente || !this.data() || !this.hora() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      cliente_nome: cliente.nome,
      cliente_sistema: cliente.sistema,
      cliente_ref_id: cliente.ref_id,
      data: this.data(),
      hora: this.hora(),
      observacoes: this.observacoes().trim() || null,
      concluida_manual: this.concluidaManual(),
      tecnico_id: this.tecnicoId(),
    };

    try {
      if (this.editando) {
        await firstValueFrom(this.implantacoesService.atualizar(this.implantacao()!.id!, dados));
      } else {
        await firstValueFrom(this.implantacoesService.criar(dados));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluirImplantacao() {
    const item = this.implantacao();
    if (!item?.id || this.excluindo()) return;
    if (!(await this.confirmService.confirmar(`Cancelar a implantação de "${item.cliente_nome}"?`))) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.implantacoesService.remover(item.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}

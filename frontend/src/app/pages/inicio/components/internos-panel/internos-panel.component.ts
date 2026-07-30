import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ContaInterna } from '../../../../core/models';
import { InternosService } from '../../../../core/internos.service';
import { CopyFieldComponent } from '../../../../shared/copy-field.component';
import { InternoModalComponent } from '../interno-modal/interno-modal.component';

@Component({
  selector: 'app-internos-panel',
  imports: [CopyFieldComponent, InternoModalComponent],
  templateUrl: './internos-panel.component.html',
})
export class InternosPanelComponent implements OnInit {
  private internosService = inject(InternosService);

  busca = input('');

  contas = signal<ContaInterna[]>([]);
  carregando = signal(false);

  modalAberto = signal(false);
  contaEmEdicao = signal<ContaInterna | null>(null);

  contasFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.contas();
    return this.contas().filter(
      (c) => c.servico.toLowerCase().includes(termo) || (c.usuario || '').toLowerCase().includes(termo)
    );
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const contas = await firstValueFrom(this.internosService.listar());
      this.contas.set(contas);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNova() {
    this.contaEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  abrirEdicao(conta: ContaInterna) {
    this.contaEmEdicao.set(conta);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.contaEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
  }
}

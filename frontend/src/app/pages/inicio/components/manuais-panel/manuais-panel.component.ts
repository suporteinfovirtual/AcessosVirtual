import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Manual } from '../../../../core/models';
import { ManuaisService } from '../../../../core/manuais.service';
import { ManualModalComponent } from '../manual-modal/manual-modal.component';
import { ManualDetalheComponent } from '../manual-detalhe/manual-detalhe.component';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

@Component({
  selector: 'app-manuais-panel',
  imports: [ManualModalComponent, ManualDetalheComponent, SkeletonComponent],
  templateUrl: './manuais-panel.component.html',
})
export class ManuaisPanelComponent implements OnInit {
  private manuaisService = inject(ManuaisService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  busca = input('');

  manuais = signal<Manual[]>([]);
  carregando = signal(false);

  modalAberto = signal(false);
  manualEmEdicao = signal<Manual | null>(null);

  manualAbertoId = signal<number | null>(null);

  manuaisFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.manuais();
    return this.manuais().filter(
      (m) => m.titulo.toLowerCase().includes(termo) || (m.descricao || '').toLowerCase().includes(termo)
    );
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const manuais = await firstValueFrom(this.manuaisService.listar());
      this.manuais.set(manuais);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirManual(manual: Manual) {
    this.manualAbertoId.set(manual.id!);
  }

  async voltarParaLista() {
    this.manualAbertoId.set(null);
    await this.carregar();
  }

  abrirNovo() {
    this.manualEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.manualEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Manual salvo.');
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteFaturado, ClientePendenteFaturamento, SISTEMAS } from '../../../../core/models';
import { FaturamentoService } from '../../../../core/faturamento.service';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeToggleComponent } from '../../../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

type Filtro = 'pendentes' | 'faturados';

@Component({
  selector: 'app-faturamento-panel',
  imports: [FormsModule, DatePipe, ViewModeToggleComponent, SkeletonComponent],
  templateUrl: './faturamento-panel.component.html',
})
export class FaturamentoPanelComponent implements OnInit {
  private faturamentoService = inject(FaturamentoService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  readonly sistemas = SISTEMAS;

  busca = signal('');
  filtro = signal<Filtro>('pendentes');

  pendentes = signal<ClientePendenteFaturamento[]>([]);
  faturados = signal<ClienteFaturado[]>([]);
  carregando = signal(true);

  marcando = signal<string | null>(null);

  itensFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this.filtro() === 'pendentes' ? this.pendentes() : this.faturados();
    return lista.filter((c) => !termo || c.cliente_nome.toLowerCase().includes(termo));
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const [pendentes, faturados] = await Promise.all([
        firstValueFrom(this.faturamentoService.listarPendentes()),
        firstValueFrom(this.faturamentoService.listarFaturados()),
      ]);
      this.pendentes.set(pendentes);
      this.faturados.set(faturados);
    } finally {
      this.carregando.set(false);
    }
  }

  rotuloSistema(sistema: string): string {
    return this.sistemas.find((s) => s.valor === sistema)?.rotulo ?? sistema;
  }

  chave(item: ClientePendenteFaturamento): string {
    return `${item.cliente_sistema}:${item.cliente_ref_id}`;
  }

  async marcarFaturado(item: ClientePendenteFaturamento) {
    if (this.marcando()) return;
    this.marcando.set(this.chave(item));
    try {
      await firstValueFrom(this.faturamentoService.marcarFaturado(item));
      await this.carregar();
      this.toast.sucesso('Cliente marcado como faturado.');
    } finally {
      this.marcando.set(null);
    }
  }

  async desmarcarFaturado(item: ClienteFaturado) {
    if (this.marcando()) return;
    this.marcando.set(this.chave(item));
    try {
      await firstValueFrom(this.faturamentoService.desmarcarFaturado(item.id));
      await this.carregar();
      this.toast.sucesso('Marcação de faturado desfeita.');
    } finally {
      this.marcando.set(null);
    }
  }
}

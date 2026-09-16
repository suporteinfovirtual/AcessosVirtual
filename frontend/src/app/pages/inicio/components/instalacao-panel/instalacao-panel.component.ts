import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Instalacao, SISTEMAS, STATUS_INSTALACAO, StatusInstalacao } from '../../../../core/models';
import { InstalacoesService } from '../../../../core/instalacoes.service';
import { InstalacaoModalComponent } from '../instalacao-modal/instalacao-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { ViewModeToggleComponent } from '../../../../shared/view-mode-toggle.component';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { somenteDigitos } from '../../../../core/texto.util';

@Component({
  selector: 'app-instalacao-panel',
  imports: [FormsModule, InstalacaoModalComponent, ViewModeToggleComponent, SkeletonComponent],
  templateUrl: './instalacao-panel.component.html',
})
export class InstalacaoPanelComponent implements OnInit {
  private instalacoesService = inject(InstalacoesService);
  private toast = inject(ToastService);
  viewMode = inject(ViewModeService);

  busca = signal('');
  // sem opção "Todos": ou vê quem está pendente, ou quem já foi instalado, nunca os dois juntos
  statusFiltro = signal<StatusInstalacao>('a_instalar');
  readonly statusOpcoes = STATUS_INSTALACAO;

  instalacoes = signal<Instalacao[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  itemEmEdicao = signal<Instalacao | null>(null);

  instalacoesFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const status = this.statusFiltro();
    return this.instalacoes().filter((i) => {
      const bateTermo = !termo || i.cliente_nome.toLowerCase().includes(termo) || (i.cnpj || '').toLowerCase().includes(termo);
      const bateStatus = status === 'instalado' ? !!i.instalado : !i.instalado;
      return bateTermo && bateStatus;
    });
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const instalacoes = await firstValueFrom(this.instalacoesService.listar());
      this.instalacoes.set(instalacoes);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirDetalhe(item: Instalacao) {
    this.itemEmEdicao.set(item);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.itemEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Instalação salva.');
  }

  rotuloSistema(sistema: string): string {
    return SISTEMAS.find((s) => s.valor === sistema)?.rotulo || sistema;
  }

  linkWhatsapp(telefone?: string | null): string | null {
    const digitos = somenteDigitos(telefone || '');
    return digitos.length >= 10 ? `https://wa.me/55${digitos}` : null;
  }

  formatarData(iso?: string | null): string {
    if (!iso) return '';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }
}

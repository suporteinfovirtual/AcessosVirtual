import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Implantacao } from '../../../../core/models';
import { ImplantacoesService } from '../../../../core/implantacoes.service';
import { ImplantacaoModalComponent } from '../implantacao-modal/implantacao-modal.component';
import { ToastService } from '../../../../shared/toast.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const NOMES_DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface DiaGrade {
  data: Date;
  dataIso: string;
  dia: number;
  dentroDoMes: boolean;
  hoje: boolean;
}

function formatarDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

@Component({
  selector: 'app-implantacao-panel',
  imports: [ImplantacaoModalComponent, SkeletonComponent],
  templateUrl: './implantacao-panel.component.html',
})
export class ImplantacaoPanelComponent implements OnInit {
  private implantacoesService = inject(ImplantacoesService);
  private toast = inject(ToastService);

  readonly nomesDiaSemana = NOMES_DIA_SEMANA;

  mesExibido = signal(this.primeiroDiaDoMesAtual());
  implantacoes = signal<Implantacao[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  implantacaoEmEdicao = signal<Implantacao | null>(null);
  dataParaNova = signal<string | null>(null);

  rotuloMes = computed(() => {
    const mes = this.mesExibido();
    return `${NOMES_MES[mes.getMonth()]} de ${mes.getFullYear()}`;
  });

  implantacoesPorDia = computed(() => {
    const mapa = new Map<string, Implantacao[]>();
    for (const item of this.implantacoes()) {
      const lista = mapa.get(item.data) || [];
      lista.push(item);
      mapa.set(item.data, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.hora.localeCompare(b.hora));
    }
    return mapa;
  });

  diasDaGrade = computed<DiaGrade[]>(() => {
    const mes = this.mesExibido();
    const ano = mes.getFullYear();
    const mesIndice = mes.getMonth();
    const hojeIso = formatarDataIso(new Date());

    const primeiroDiaSemana = new Date(ano, mesIndice, 1).getDay();
    const totalDiasMes = new Date(ano, mesIndice + 1, 0).getDate();

    const dias: DiaGrade[] = [];
    const construirDia = (data: Date, dentroDoMes: boolean): DiaGrade => {
      const dataIso = formatarDataIso(data);
      return { data, dataIso, dia: data.getDate(), dentroDoMes, hoje: dataIso === hojeIso };
    };

    for (let i = primeiroDiaSemana; i > 0; i--) {
      dias.push(construirDia(new Date(ano, mesIndice, 1 - i), false));
    }
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      dias.push(construirDia(new Date(ano, mesIndice, dia), true));
    }
    while (dias.length % 7 !== 0) {
      const ultima = dias[dias.length - 1].data;
      dias.push(construirDia(new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() + 1), false));
    }

    return dias;
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const implantacoes = await firstValueFrom(this.implantacoesService.listar());
      this.implantacoes.set(implantacoes);
    } finally {
      this.carregando.set(false);
    }
  }

  private primeiroDiaDoMesAtual(): Date {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  }

  mesAnterior() {
    const mes = this.mesExibido();
    this.mesExibido.set(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
  }

  proximoMes() {
    const mes = this.mesExibido();
    this.mesExibido.set(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));
  }

  irParaHoje() {
    this.mesExibido.set(this.primeiroDiaDoMesAtual());
  }

  implantacoesNoDia(dataIso: string): Implantacao[] {
    return this.implantacoesPorDia().get(dataIso) || [];
  }

  abrirNovo(dataIso?: string) {
    this.implantacaoEmEdicao.set(null);
    this.dataParaNova.set(dataIso || formatarDataIso(new Date()));
    this.modalAberto.set(true);
  }

  abrirEdicao(item: Implantacao) {
    this.implantacaoEmEdicao.set(item);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.implantacaoEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Implantação salva.');
  }
}

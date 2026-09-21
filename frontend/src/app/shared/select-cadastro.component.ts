import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CategoriasService } from '../core/categorias.service';
import { ContabilidadesService } from '../core/contabilidades.service';
import { ConfirmService } from './confirm.service';
import { ToastService } from './toast.service';
import { CadastroRapidoComponent, ItemCadastrado, incluirOrdenado } from './cadastro-rapido.component';

// mesmo formato de Categoria / Contabilidade (id opcional como no models.ts)
export interface ItemLista {
  id?: number;
  nome: string;
  email?: string | null;
}

// Select de contabilidade/categoria feito à mão (o <select> nativo não deixa usar o botão
// direito nas opções): "+" dentro do campo cadastra um item novo e já seleciona; botão
// direito numa opção abre o menu com "Editar" (renomeia ali mesmo, sem sair da lista) e
// "Excluir". A lista (`itens`) e o valor são two-way, então quem usa recebe na hora o item
// criado/renomeado/excluído, e `(alterado)` avisa quem precisa recarregar o que mostra
// esses nomes (os cartões de cliente trazem categoria_nome do servidor).
@Component({
  selector: 'app-select-cadastro',
  imports: [CadastroRapidoComponent],
  template: `
    <div class="relative">
      <button
        #gatilho
        type="button"
        [class]="classeCampo()"
        (click)="alternar(gatilho, origem)"
        (keydown.escape)="fecharTudo()"
      >
        <span class="block truncate" [class.text-zinc-500]="valor() === undefined">{{ rotuloSelecionado() }}</span>
      </button>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      @if (permiteCriar()) {
        <app-cadastro-rapido [tipo]="tipo()" (criado)="aoCriar($event)"></app-cadastro-rapido>
      }
    </div>

    <!-- marca onde fica o (0,0) do "fixed" aqui dentro: modais com transform/backdrop-filter
         mudam essa origem, então as posições abaixo são corrigidas por ela -->
    <div #origem class="pointer-events-none fixed left-0 top-0 h-0 w-0"></div>

    <!-- fixed: não é cortado pela rolagem dos modais -->
    @if (aberto()) {
      <div
        class="fixed z-[55] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40"
        [style.top.px]="posicao().top"
        [style.left.px]="posicao().left"
        [style.width.px]="posicao().width"
      >
        <ul class="max-h-60 overflow-y-auto py-1 text-sm">
          <li [class]="classeLinha(valor() === null)">
            <button type="button" [class]="classeOpcao(valor() === null)" (click)="escolher(null)">{{ textoVazio() }}</button>
          </li>
          @for (item of itens(); track item.id) {
            <li [class]="classeLinha(valor() === item.id && idEmEdicao() !== item.id)">
              @if (idEmEdicao() === item.id) {
                <input
                  #campoNome
                  [value]="nomeEdicao()"
                  (input)="nomeEdicao.set(campoNome.value)"
                  (keydown.enter)="$event.preventDefault(); salvarEdicao(item)"
                  (keydown.escape)="$event.preventDefault(); cancelarEdicao()"
                  class="mx-1 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-accent"
                />
                <button
                  type="button"
                  class="shrink-0 px-1.5 py-1.5 text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                  [disabled]="!nomeEdicao().trim() || salvandoEdicao()"
                  (click)="salvarEdicao(item)"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  class="shrink-0 pr-2 text-xs font-medium text-zinc-500 hover:text-zinc-300"
                  (click)="cancelarEdicao()"
                >
                  Cancelar
                </button>
              } @else {
                <button
                  type="button"
                  [class]="classeOpcao(valor() === item.id)"
                  [title]="item.nome"
                  (click)="escolher(item.id!)"
                  (contextmenu)="abrirMenu($event, item, origem)"
                >
                  {{ item.nome }}
                </button>
              }
            </li>
          }
        </ul>
        <p class="border-t border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500">Botão direito numa opção para editar ou excluir</p>
      </div>
    }

    @if (menu(); as m) {
      <div
        class="fixed z-[56] max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl shadow-black/40"
        [style.top.px]="m.y"
        [style.left.px]="m.x"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          (click)="iniciarEdicao(m.item)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
          <span class="truncate">Editar "{{ m.item.nome }}"</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-800"
          (click)="excluir(m.item)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
          <span class="truncate">Excluir "{{ m.item.nome }}"</span>
        </button>
      </div>
    }
  `,
})
export class SelectCadastroComponent {
  private host = inject(ElementRef<HTMLElement>);
  private categoriasService = inject(CategoriasService);
  private contabilidadesService = inject(ContabilidadesService);
  private confirmService = inject(ConfirmService);
  private toast = inject(ToastService);

  tipo = input.required<'contabilidade' | 'categoria'>();
  // undefined = nada escolhido ainda (usado na edição em lote, com o texto de `placeholder`)
  valor = model<number | null | undefined>(null);
  itens = model<ItemLista[]>([]);
  textoVazio = input('');
  placeholder = input('Selecione…');
  tamanho = input<'md' | 'sm' | 'filtro'>('md');
  // no filtro da barra o "+" fica de fora: criar por ali selecionaria na hora um item novo
  // (e ainda sem clientes), deixando a lista vazia como se fosse bug
  permiteCriar = input(true);
  // renomeou ou excluiu algo: quem usa pode recarregar o que mostra esses nomes
  alterado = output<void>();

  aberto = signal(false);
  posicao = signal({ top: 0, left: 0, width: 0 });
  menu = signal<{ x: number; y: number; item: ItemLista } | null>(null);
  idEmEdicao = signal<number | null>(null);
  nomeEdicao = signal('');
  salvandoEdicao = signal(false);

  private campoEdicao = viewChild<ElementRef<HTMLInputElement>>('campoNome');

  rotuloSelecionado = computed(() => {
    const valor = this.valor();
    if (valor === undefined) return this.placeholder();
    if (valor === null) return this.textoVazio();
    return this.itens().find((i) => i.id === valor)?.nome ?? this.textoVazio();
  });

  classeCampo = computed(() => {
    // espaço à direita pro chevron e, quando existe, pro "+"
    const direita = this.permiteCriar() ? 'pr-14' : 'pr-9';
    if (this.tamanho() === 'sm') {
      return `campo-select w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-2.5 ${direita} text-left text-sm text-zinc-100 outline-none focus:border-accent`;
    }
    if (this.tamanho() === 'filtro') {
      return `campo-select w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-3 ${direita} text-left text-sm text-zinc-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft`;
    }
    return `campo-select w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-3 ${direita} text-left text-sm text-zinc-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft`;
  });

  // o realce fica na linha, não no botão: senão ele pararia antes da coluna do lápis
  classeLinha(selecionada: boolean) {
    return selecionada ? 'flex items-center bg-accent/15' : 'flex items-center hover:bg-zinc-800';
  }

  classeOpcao(selecionada: boolean) {
    return selecionada
      ? 'min-w-0 flex-1 truncate px-3 py-1.5 text-left text-accent'
      : 'min-w-0 flex-1 truncate px-3 py-1.5 text-left text-zinc-200';
  }

  alternar(gatilho: HTMLElement, origem: HTMLElement) {
    if (this.aberto()) {
      this.fecharTudo();
      return;
    }
    const r = gatilho.getBoundingClientRect();
    const o = origem.getBoundingClientRect();
    // abre pra cima se não couber embaixo (lista tem no máximo ~15rem + rodapé)
    const altura = 280;
    const top = r.bottom + altura > window.innerHeight ? Math.max(8, r.top - altura - 4) : r.bottom + 4;
    this.posicao.set({ top: top - o.top, left: r.left - o.left, width: r.width });
    this.aberto.set(true);
  }

  escolher(id: number | null) {
    this.valor.set(id);
    this.fecharTudo();
  }

  abrirMenu(evento: MouseEvent, item: ItemLista, origem: HTMLElement) {
    evento.preventDefault();
    const o = origem.getBoundingClientRect();
    this.menu.set({ x: evento.clientX - o.left, y: evento.clientY - o.top, item });
  }

  fecharTudo = () => {
    this.aberto.set(false);
    this.menu.set(null);
    this.cancelarEdicao();
  };

  aoCriar(item: ItemCadastrado) {
    this.itens.update((lista) => incluirOrdenado(lista, item));
    this.valor.set(item.id);
  }

  // --- renomear ---

  iniciarEdicao(item: ItemLista) {
    if (!item.id) return;
    this.menu.set(null);
    this.nomeEdicao.set(item.nome);
    this.idEmEdicao.set(item.id);
  }

  cancelarEdicao() {
    this.idEmEdicao.set(null);
    this.nomeEdicao.set('');
    this.salvandoEdicao.set(false);
  }

  async salvarEdicao(item: ItemLista) {
    const nome = this.nomeEdicao().trim();
    if (!item.id || !nome || this.salvandoEdicao()) return;
    if (nome === item.nome) {
      this.cancelarEdicao();
      return;
    }

    const id = item.id;
    this.salvandoEdicao.set(true);
    try {
      await firstValueFrom(
        this.tipo() === 'contabilidade'
          ? // o PUT regrava a linha inteira: sem mandar o e-mail atual junto ele seria apagado
            this.contabilidadesService.atualizar(id, { nome, email: item.email ?? null })
          : this.categoriasService.atualizar(id, { nome })
      );
      // a lista vem ordenada da API; renomear pode mudar o lugar do item
      this.itens.update((lista) => incluirOrdenado(lista.filter((i) => i.id !== id), { ...item, nome }));
      this.cancelarEdicao();
      this.toast.sucesso(this.tipo() === 'contabilidade' ? 'Contabilidade renomeada.' : 'Categoria renomeada.');
      this.alterado.emit();
    } catch (e) {
      // ex.: 409 "Já existe uma categoria com esse nome"
      this.toast.erro((e as { error?: { erro?: string } })?.error?.erro || 'Não foi possível renomear.');
      this.salvandoEdicao.set(false);
    }
  }

  // --- excluir ---

  async excluir(item: ItemLista) {
    this.fecharTudo();
    if (!item.id) return;
    const id = item.id;
    const mensagem =
      this.tipo() === 'contabilidade'
        ? `Excluir a contabilidade "${item.nome}"? Os acessos ligados a ela ficam sem contabilidade.`
        : `Excluir a categoria "${item.nome}"? Os clientes ligados a ela ficam sem categoria.`;
    if (!(await this.confirmService.confirmar(mensagem, { confirmarTexto: 'Excluir', perigo: true }))) return;

    try {
      await firstValueFrom(
        this.tipo() === 'contabilidade' ? this.contabilidadesService.remover(id) : this.categoriasService.remover(id)
      );
      this.itens.update((lista) => lista.filter((i) => i.id !== id));
      if (this.valor() === id) this.valor.set(null);
      this.toast.sucesso(this.tipo() === 'contabilidade' ? 'Contabilidade excluída.' : 'Categoria excluída.');
      this.alterado.emit();
    } catch {
      this.toast.erro('Não foi possível excluir.');
    }
  }

  // fecha ao clicar fora (o menu do botão direito e a lista ficam dentro do host)
  @HostListener('document:mousedown', ['$event'])
  aoClicarFora(evento: MouseEvent) {
    if (!this.host.nativeElement.contains(evento.target as Node)) this.fecharTudo();
  }

  // a lista é fixed: se a página ou o modal rolar, fecha em vez de ficar descolada do campo.
  // scroll não borbulha, então escuta na fase de captura (ignorando a rolagem da própria lista)
  constructor() {
    // "Editar" vem do menu de contexto, longe do campo: já deixa o nome selecionado
    // pra poder digitar por cima na hora
    effect(() => {
      const campo = this.campoEdicao();
      if (campo) campo.nativeElement.select();
    });

    const aoRolar = (evento: Event) => {
      if (!this.aberto() || this.host.nativeElement.contains(evento.target as Node)) return;
      this.fecharTudo();
    };
    document.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', this.fecharTudo);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', this.fecharTudo);
    });
  }
}

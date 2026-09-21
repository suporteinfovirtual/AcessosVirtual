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
import { normalizarBusca } from '../core/texto.util';
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
// direito nas opções nem filtrar por pedaço do nome). Ao abrir, o foco já vai pro campo de
// filtro: digitar reduz a lista e Enter escolhe a primeira. O "+" dentro do campo cadastra
// um item novo; botão direito numa opção abre o menu com "Editar" (renomeia ali mesmo, sem
// sair da lista) e "Excluir". A lista (`itens`) e o valor são two-way, então quem usa
// recebe na hora o item criado/renomeado/excluído, e `(alterado)` avisa quem precisa
// recarregar o que mostra esses nomes (os cartões trazem categoria_nome do servidor).
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
      <app-cadastro-rapido [tipo]="tipo()" (criado)="aoCriar($event)"></app-cadastro-rapido>
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
        <div class="border-b border-zinc-800 p-1.5">
          <input
            #campoBusca
            [value]="busca()"
            (input)="busca.set(campoBusca.value)"
            (keydown.enter)="$event.preventDefault(); escolherPrimeiro()"
            (keydown.escape)="$event.preventDefault(); fecharTudo()"
            placeholder="Digite para filtrar…"
            class="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent"
          />
        </div>

        <ul class="max-h-60 overflow-y-auto py-1 text-sm">
          @if (!busca()) {
            <li [class]="classeLinha(null)">
              <button type="button" [class]="classeOpcao(valor() === null)" (click)="escolher(null)">{{ textoVazio() }}</button>
            </li>
          }
          @if (busca() && itensFiltrados().length === 0) {
            <li class="px-3 py-2 text-zinc-500">Nenhum resultado</li>
          }
          @for (item of itensFiltrados(); track item.id) {
            <li [class]="classeLinha(item)">
              @if (idEmEdicao() === item.id) {
                <div class="flex w-full flex-col gap-1 px-1 py-1">
                  <input
                    #campoNome
                    [value]="nomeEdicao()"
                    (input)="nomeEdicao.set(campoNome.value)"
                    (keydown.enter)="$event.preventDefault(); salvarEdicao(item)"
                    (keydown.escape)="$event.preventDefault(); cancelarEdicao()"
                    placeholder="Nome"
                    class="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent"
                  />
                  @if (tipo() === 'contabilidade') {
                    <input
                      #campoEmail
                      type="email"
                      [value]="emailEdicao()"
                      (input)="emailEdicao.set(campoEmail.value)"
                      (keydown.enter)="$event.preventDefault(); salvarEdicao(item)"
                      (keydown.escape)="$event.preventDefault(); cancelarEdicao()"
                      placeholder="E-mail"
                      class="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent"
                    />
                  }
                  <div class="flex justify-end gap-3 pt-0.5">
                    <button
                      type="button"
                      class="text-xs font-medium text-zinc-500 hover:text-zinc-300"
                      (click)="cancelarEdicao()"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      class="text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                      [disabled]="!nomeEdicao().trim() || salvandoEdicao()"
                      (click)="salvarEdicao(item)"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
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
      </div>
    }

    <!-- compacto de propósito: o nome não se repete aqui porque a linha clicada fica
         destacada atrás, e o nome ainda aparece na confirmação de exclusão -->
    @if (menu(); as m) {
      <div
        class="fixed z-[56] w-36 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl shadow-black/50"
        [style.top.px]="m.y"
        [style.left.px]="m.x"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          (click)="iniciarEdicao(m.item)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0 text-zinc-500"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
          Editar
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10"
          (click)="excluir(m.item)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
          Excluir
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
  // num formulário, criar já escolhe o item — é o que se quer. Num filtro, não: passaria a
  // filtrar por uma categoria recém-criada, ainda sem nenhum cliente, e a lista ficaria
  // vazia como se fosse bug.
  selecionaAoCriar = input(true);
  // renomeou ou excluiu algo: quem usa pode recarregar o que mostra esses nomes
  alterado = output<void>();

  aberto = signal(false);
  busca = signal('');
  posicao = signal({ top: 0, left: 0, width: 0 });
  menu = signal<{ x: number; y: number; item: ItemLista } | null>(null);
  idEmEdicao = signal<number | null>(null);
  nomeEdicao = signal('');
  emailEdicao = signal('');
  salvandoEdicao = signal(false);

  private campoEdicao = viewChild<ElementRef<HTMLInputElement>>('campoNome');
  private campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');

  // filtro por pedaço do nome, sem caixa nem acento: os nomes são longos e nem sempre a
  // pessoa lembra pelo começo ("indaial" acha "CONTABILIDADE INDAIAL")
  itensFiltrados = computed(() => {
    const termo = normalizarBusca(this.busca());
    if (!termo) return this.itens();
    return this.itens().filter((item) => normalizarBusca(item.nome).includes(termo));
  });

  rotuloSelecionado = computed(() => {
    const valor = this.valor();
    if (valor === undefined) return this.placeholder();
    if (valor === null) return this.textoVazio();
    return this.itens().find((i) => i.id === valor)?.nome ?? this.textoVazio();
  });

  // pr-14 deixa o espaço à direita pro chevron e pro "+"
  classeCampo = computed(() => {
    if (this.tamanho() === 'sm') {
      return 'campo-select w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-2.5 pr-14 text-left text-sm text-zinc-100 outline-none focus:border-accent';
    }
    if (this.tamanho() === 'filtro') {
      return 'campo-select w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-3 pr-14 text-left text-sm text-zinc-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft';
    }
    return 'campo-select w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-3 pr-14 text-left text-sm text-zinc-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft';
  });

  // o realce fica na linha, não no botão, pra ir de ponta a ponta. A linha com o menu de
  // contexto aberto fica destacada: é o que diz a qual item o "Editar"/"Excluir" se refere,
  // já que o menu não repete o nome.
  classeLinha(item: ItemLista | null) {
    const base = 'flex items-center';
    if (item && this.idEmEdicao() === item.id) return base;
    if (item && this.menu()?.item.id === item.id) return `${base} bg-zinc-800`;
    const selecionada = item ? this.valor() === item.id : this.valor() === null;
    return selecionada ? `${base} bg-accent/15` : `${base} hover:bg-zinc-800`;
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
    // abre pra cima se não couber embaixo (15rem de lista + o campo de filtro em cima)
    const altura = 300;
    const top = r.bottom + altura > window.innerHeight ? Math.max(8, r.top - altura - 4) : r.bottom + 4;
    this.posicao.set({ top: top - o.top, left: r.left - o.left, width: r.width });
    this.aberto.set(true);
  }

  escolher(id: number | null) {
    this.valor.set(id);
    this.fecharTudo();
  }

  // o menu tem tamanho fixo (w-36 e duas linhas), então dá pra manter ele dentro da tela
  // sem medir: perto da borda, abre pro outro lado em vez de vazar
  abrirMenu(evento: MouseEvent, item: ItemLista, origem: HTMLElement) {
    evento.preventDefault();
    const o = origem.getBoundingClientRect();
    const largura = 144;
    const altura = 76;
    const x = Math.max(8, Math.min(evento.clientX, window.innerWidth - largura - 8));
    const y = Math.max(8, Math.min(evento.clientY, window.innerHeight - altura - 8));
    this.menu.set({ x: x - o.left, y: y - o.top, item });
  }

  fecharTudo = () => {
    this.aberto.set(false);
    this.busca.set('');
    this.menu.set(null);
    this.cancelarEdicao();
  };

  // Enter no filtro pega a primeira opção da lista: digitar "cone" + Enter já escolhe
  escolherPrimeiro() {
    const primeiro = this.itensFiltrados()[0];
    if (primeiro?.id) this.escolher(primeiro.id);
  }

  // sem `alterado` aqui: item recém-criado ainda não está em nenhum cliente, então não há
  // nome desatualizado nos cartões pra recarregar
  aoCriar(item: ItemCadastrado) {
    this.busca.set('');
    this.itens.update((lista) => incluirOrdenado(lista, item));
    if (this.selecionaAoCriar()) this.valor.set(item.id);
  }

  // --- renomear ---

  iniciarEdicao(item: ItemLista) {
    if (!item.id) return;
    this.menu.set(null);
    this.nomeEdicao.set(item.nome);
    this.emailEdicao.set(item.email ?? '');
    this.idEmEdicao.set(item.id);
  }

  cancelarEdicao() {
    this.idEmEdicao.set(null);
    this.nomeEdicao.set('');
    this.emailEdicao.set('');
    this.salvandoEdicao.set(false);
  }

  async salvarEdicao(item: ItemLista) {
    const nome = this.nomeEdicao().trim();
    const email = this.emailEdicao().trim() || null;
    if (!item.id || !nome || this.salvandoEdicao()) return;
    if (nome === item.nome && (this.tipo() !== 'contabilidade' || email === (item.email ?? null))) {
      this.cancelarEdicao();
      return;
    }

    const id = item.id;
    this.salvandoEdicao.set(true);
    try {
      await firstValueFrom(
        this.tipo() === 'contabilidade'
          ? // o PUT regrava a linha inteira, então o e-mail vai junto sempre: sem ele a rota
            // apagaria o que já estava gravado
            this.contabilidadesService.atualizar(id, { nome, email })
          : this.categoriasService.atualizar(id, { nome })
      );
      // a lista vem ordenada da API; renomear pode mudar o lugar do item
      const atualizado = this.tipo() === 'contabilidade' ? { ...item, nome, email } : { ...item, nome };
      this.itens.update((lista) => incluirOrdenado(lista.filter((i) => i.id !== id), atualizado));
      this.cancelarEdicao();
      this.toast.sucesso(this.tipo() === 'contabilidade' ? 'Contabilidade salva.' : 'Categoria salva.');
      this.alterado.emit();
    } catch (e) {
      // ex.: 409 "Já existe uma categoria com esse nome"
      this.toast.erro((e as { error?: { erro?: string } })?.error?.erro || 'Não foi possível salvar.');
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

    // abriu a lista: o foco já vai pro filtro, pra sair digitando direto
    effect(() => {
      const campo = this.campoBusca();
      if (campo) campo.nativeElement.focus();
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

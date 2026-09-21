import { Directive, ElementRef, NgZone, OnDestroy, OnInit, effect, inject, input, signal } from '@angular/core';

const FORMATO = new Intl.NumberFormat('pt-BR');

function prefereMenosAnimacao(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Conta de zero até o valor quando o elemento entra na tela, e conta de novo se ele sair e
 * voltar — é isso que dá a resposta ao rolar a página.
 *
 * O número é escrito direto no elemento, então o template NÃO pode interpolar nada dentro
 * dele: os dois estariam escrevendo no mesmo lugar, e na primeira atualização o Angular
 * gravaria num nó de texto que a diretiva já descartou — o número simplesmente sumiria.
 *
 * Uso: <p [appContador]="total()"></p>
 */
@Directive({ selector: '[appContador]' })
export class ContadorAnimadoDirective implements OnInit, OnDestroy {
  readonly valor = input.required<number>({ alias: 'appContador' });
  readonly duracao = input(1100);

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private readonly naTela = signal(false);
  private observador?: IntersectionObserver;
  private quadro = 0;

  constructor() {
    effect(() => {
      const alvo = this.valor();
      if (this.naTela()) this.animar(alvo);
      else this.escrever(0);
    });
  }

  ngOnInit() {
    // sem IntersectionObserver o número aparece contando na entrada, sem esperar rolagem
    if (typeof IntersectionObserver === 'undefined') {
      this.naTela.set(true);
      return;
    }

    // o observador em si não muda estado do app; só o resultado volta pra dentro do Angular
    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(
        ([entrada]) => this.zona.run(() => this.naTela.set(entrada.isIntersecting)),
        { threshold: 0.4 },
      );
      this.observador.observe(this.elemento);
    });
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    cancelAnimationFrame(this.quadro);
  }

  private animar(alvo: number) {
    cancelAnimationFrame(this.quadro);

    if (alvo === 0 || prefereMenosAnimacao()) {
      this.escrever(alvo);
      return;
    }

    const duracao = this.duracao();

    // dezenas de quadros por segundo, nenhum deles mexe em signal: fora da zona do Angular
    // isso não dispara change detection nenhuma vez.
    this.zona.runOutsideAngular(() => {
      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao);
        // desacelera forte no fim: o número dispara e depois "assenta" no valor certo
        const suave = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        this.escrever(Math.round(alvo * suave));
        if (t < 1) this.quadro = requestAnimationFrame(passo);
      };
      this.quadro = requestAnimationFrame(passo);
    });
  }

  private escrever(valor: number) {
    this.elemento.textContent = FORMATO.format(valor);
  }
}

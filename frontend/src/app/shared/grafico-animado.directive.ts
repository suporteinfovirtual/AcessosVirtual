import { Directive, ElementRef, NgZone, OnDestroy, OnInit, effect, inject, input } from '@angular/core';

// A linha é escondida por um traço do tamanho dela mesma. Um pouco maior que o comprimento
// real pra garantir que ela comece 100% invisível mesmo se a medida vier curta — o gráfico
// é esticado na horizontal (preserveAspectRatio="none"), então a medida em unidades do
// viewBox não bate exatamente com o que o navegador desenha na tela.
const FOLGA = 1.08;

/**
 * Faz o gráfico se desenhar quando entra na tela, e de novo se sair e voltar.
 *
 * A diretiva mede a linha e só então marca o SVG como pronto. Enquanto isso não acontece,
 * o CSS deixa tudo visível: se o JavaScript falhar ou o navegador não tiver
 * IntersectionObserver, o gráfico aparece completo em vez de ficar em branco.
 *
 * Uso: <svg [appGraficoAnimado]="dados().linha"> com .grafico-linha, .grafico-area e
 * .grafico-ponta nos elementos internos.
 */
@Directive({ selector: '[appGraficoAnimado]' })
export class GraficoAnimadoDirective implements OnInit, OnDestroy {
  /** o path da linha; muda quando os dados mudam, e aí remedimos */
  readonly linha = input.required<string>({ alias: 'appGraficoAnimado' });

  private readonly elemento = inject<ElementRef<SVGSVGElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private observador?: IntersectionObserver;
  private quadro = 0;

  constructor() {
    effect(() => {
      this.linha();
      // o efeito pode rodar antes do [attr.d] chegar no DOM; medir no próximo quadro
      // garante que getTotalLength() já enxerga o desenho novo
      cancelAnimationFrame(this.quadro);
      this.zona.runOutsideAngular(() => {
        this.quadro = requestAnimationFrame(() => this.medir());
      });
    });
  }

  ngOnInit() {
    if (typeof IntersectionObserver === 'undefined') {
      this.elemento.classList.add('grafico-visivel');
      return;
    }

    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(
        ([entrada]) => {
          // tirar e repor a classe reinicia a animação: é o replay ao voltar rolando
          this.elemento.classList.toggle('grafico-visivel', entrada.isIntersecting);
        },
        { threshold: 0.25 },
      );
      this.observador.observe(this.elemento);
    });
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    cancelAnimationFrame(this.quadro);
  }

  private medir() {
    const linha = this.elemento.querySelector<SVGPathElement>('.grafico-linha');
    if (!linha) return;

    const comprimento = Math.ceil(linha.getTotalLength() * FOLGA);
    if (comprimento <= 0) return;

    this.elemento.style.setProperty('--comprimento-linha', `${comprimento}px`);
    this.elemento.classList.add('grafico-pronto');
  }
}

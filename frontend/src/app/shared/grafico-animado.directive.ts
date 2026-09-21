import { Directive, NgZone, OnDestroy, OnInit, ElementRef, effect, inject, input } from '@angular/core';

export interface PontoGrafico {
  x: number;
  y: number;
}

const DURACAO_MS = 1600;

// mesma curva do cubic-bezier(0.22, 1, 0.36, 1) que o gráfico usava: rápido no começo,
// assentando devagar no fim
function suavizar(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Faz o gráfico se desenhar da esquerda pra direita quando entra na tela (e de novo se
 * sair e voltar), com uma seta que vai correndo pela ponta da linha.
 *
 * O desenho é revelado por um <rect class="grafico-revelar"> dentro de um clipPath, com
 * a largura crescendo de 0 até a largura do viewBox. A seta é um elemento HTML
 * (.grafico-seta) por cima do SVG: o gráfico é esticado na horizontal
 * (preserveAspectRatio="none"), e uma seta desenhada dentro dele sairia deformada.
 *
 * Sem JavaScript ou sem IntersectionObserver o rect fica com a largura cheia que veio
 * do template, então o gráfico aparece completo em vez de ficar em branco.
 *
 * Uso: <div [appGraficoAnimado]="pontos" [larguraViewBox]="620" [alturaViewBox]="150">
 * contendo o <svg> e a .grafico-seta.
 */
@Directive({ selector: '[appGraficoAnimado]' })
export class GraficoAnimadoDirective implements OnInit, OnDestroy {
  /** pontos da linha em unidades do viewBox, da esquerda pra direita */
  readonly pontos = input.required<PontoGrafico[]>({ alias: 'appGraficoAnimado' });
  readonly larguraViewBox = input.required<number>();
  readonly alturaViewBox = input.required<number>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private observador?: IntersectionObserver;
  private quadro = 0;
  private visivel = false;
  private progresso = 1;

  constructor() {
    effect(() => {
      this.pontos();
      // dados novos (sincronização) com o gráfico já na tela: redesenha no estado atual
      // sem reiniciar a animação; o [attr] do template pode não ter chegado ao DOM ainda
      this.zona.runOutsideAngular(() => requestAnimationFrame(() => this.aplicar(this.progresso)));
    });
  }

  ngOnInit() {
    this.zona.runOutsideAngular(() => window.addEventListener('resize', this.aoRedimensionar));
    if (typeof IntersectionObserver === 'undefined') return;

    // começa escondido; o observador dispara a animação quando o gráfico aparecer
    this.progresso = 0;
    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting && !this.visivel) this.animar();
          if (!entrada.isIntersecting && this.visivel) {
            // saiu da tela: volta pro começo, pra animação recomeçar na próxima volta
            cancelAnimationFrame(this.quadro);
            this.aplicar(0);
          }
          this.visivel = entrada.isIntersecting;
        },
        { threshold: 0.25 },
      );
      this.observador.observe(this.elemento);
    });
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    cancelAnimationFrame(this.quadro);
    window.removeEventListener('resize', this.aoRedimensionar);
  }

  // a seta é posicionada em pixels; se a largura do gráfico mudar ela precisa acompanhar
  private readonly aoRedimensionar = () => this.aplicar(this.progresso);

  private animar() {
    cancelAnimationFrame(this.quadro);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.aplicar(1);
      return;
    }

    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_MS);
      this.aplicar(suavizar(t));
      if (t < 1) this.quadro = requestAnimationFrame(passo);
    };
    this.aplicar(0);
    this.quadro = requestAnimationFrame(passo);
  }

  private aplicar(progresso: number) {
    this.progresso = progresso;
    const pontos = this.pontos();
    const largura = this.larguraViewBox();
    const revelar = this.elemento.querySelector<SVGRectElement>('.grafico-revelar');
    const seta = this.elemento.querySelector<HTMLElement>('.grafico-seta');
    const svg = this.elemento.querySelector<SVGSVGElement>('svg');
    if (!revelar || !seta || !svg || pontos.length < 2) return;

    const x = progresso * largura;
    revelar.setAttribute('width', String(x));

    // segmento da linha onde a ponta está agora
    let i = 0;
    while (i < pontos.length - 2 && pontos[i + 1].x < x) i++;
    const a = pontos[i];
    const b = pontos[i + 1];
    const fracao = b.x === a.x ? 0 : Math.min(1, Math.max(0, (x - a.x) / (b.x - a.x)));
    const y = a.y + (b.y - a.y) * fracao;

    // tudo em pixels de tela: o SVG é esticado só na horizontal, então o ângulo da seta
    // precisa das duas escalas pra acompanhar a inclinação que aparece de fato
    const escalaX = svg.clientWidth / largura;
    const escalaY = svg.clientHeight / this.alturaViewBox();
    const angulo = Math.atan2((b.y - a.y) * escalaY, (b.x - a.x) * escalaX);

    seta.style.opacity = progresso > 0 ? '1' : '0';
    seta.style.transform =
      `translate(${x * escalaX}px, ${y * escalaY}px) translate(-50%, -50%) rotate(${angulo}rad)`;
  }
}

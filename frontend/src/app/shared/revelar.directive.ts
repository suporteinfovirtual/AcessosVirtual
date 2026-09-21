import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject, input } from '@angular/core';

// Escalonamento entre itens de uma mesma lista. Limitado porque, com muitos itens, o último
// esperaria tempo demais e a lista pareceria travada em vez de animada.
const ATRASO_POR_ITEM = 65;
const ATRASO_MAXIMO = 8;

/**
 * Revela o elemento quando ele entra na tela.
 *
 * O valor passado é a posição do item na lista, usada pra escalonar a entrada
 * (`[appRevelar]="$index"`). Quem não faz parte de lista passa 0.
 *
 * Por padrão revela uma vez só: bloco de conteúdo reaparecendo a cada rolagem cansa. Com
 * `repetir`, a animação recomeça sempre que o elemento volta — é o que faz sentido pros
 * desenhos de dados (rosca, barras), que acompanham o comportamento dos contadores.
 *
 * A classe .revelar-pronto só é aplicada aqui, pelo JavaScript. Enquanto ela não existe o
 * CSS deixa tudo visível, então uma falha na diretiva não esconde a página.
 */
@Directive({ selector: '[appRevelar]' })
export class RevelarDirective implements OnInit, OnDestroy {
  readonly ordem = input(0, { alias: 'appRevelar' });
  readonly repetir = input(false);
  /**
   * Seletor de um desenho SVG dentro do elemento (o anel da rosca). Quando informado, a
   * diretiva mede o comprimento dele e publica em --medida, que o CSS usa pra escondê-lo
   * atrás de um traço do tamanho exato. Medir evita repetir aqui a conta do raio que já
   * existe no componente — se a rosca mudar de tamanho, isto acompanha sozinho.
   */
  readonly medir = input('');

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private observador?: IntersectionObserver;
  private quadro = 0;

  ngOnInit() {
    if (typeof IntersectionObserver === 'undefined') {
      this.elemento.classList.add('revelado');
      return;
    }

    const atraso = Math.min(this.ordem(), ATRASO_MAXIMO) * ATRASO_POR_ITEM;
    this.elemento.style.setProperty('--atraso-revelar', `${atraso}ms`);

    const seletor = this.medir();
    if (seletor) {
      // no próximo quadro o SVG filho já existe e tem geometria pra medir
      this.zona.runOutsideAngular(() => {
        this.quadro = requestAnimationFrame(() => {
          const desenho = this.elemento.querySelector<SVGGeometryElement>(seletor);
          if (!desenho) return;
          this.elemento.style.setProperty('--medida', `${Math.ceil(desenho.getTotalLength())}px`);
          this.elemento.classList.add('revelar-pronto');
        });
      });
    } else {
      this.elemento.classList.add('revelar-pronto');
    }

    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            this.elemento.classList.add('revelado');
            if (!this.repetir()) this.observador?.disconnect();
          } else if (this.repetir()) {
            this.elemento.classList.remove('revelado');
          }
        },
        // margem negativa embaixo: o item só conta como visível depois de entrar de fato,
        // não quando encosta a primeira linha de pixels na borda da tela
        { threshold: 0, rootMargin: '0px 0px -12% 0px' },
      );
      this.observador.observe(this.elemento);
    });
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    cancelAnimationFrame(this.quadro);
  }
}

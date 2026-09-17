import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2, inject } from '@angular/core';

/** Reveals non-essential content once; it never hides content before JS runs. */
@Directive({ selector: '[reveal]', standalone: true })
export class RevealDirective implements AfterViewInit, OnDestroy {
  @Input() revealDelay = 0;
  private element = inject(ElementRef<HTMLElement>).nativeElement;
  private renderer = inject(Renderer2);
  private observer?: IntersectionObserver;
  ngAfterViewInit() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    this.renderer.addClass(this.element, 'reveal-pending');
    this.element.style.setProperty('--reveal-delay', `${Math.max(0, Number(this.revealDelay) || 0)}ms`);
    this.observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      this.renderer.addClass(this.element, 'is-revealed');
      this.observer?.disconnect();
    }, { threshold: 0.08 });
    this.observer.observe(this.element);
  }
  ngOnDestroy() { this.observer?.disconnect(); }
}

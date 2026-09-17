import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { SpeechService } from '../core/speech.service';

/** Announces dynamically added status and alert regions for non-visual feedback. */
@Directive({ selector: '[appStatusAnnouncer]', standalone: true })
export class StatusAnnouncerDirective implements AfterViewInit, OnDestroy {
  private host: HTMLElement = inject(ElementRef).nativeElement;
  private speech = inject(SpeechService);
  private observer?: MutationObserver;
  private announced = new WeakMap<Element, string>();
  ngAfterViewInit() {
    this.observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          const regions = [
            ...(node.matches('[role="alert"], [role="status"]') ? [node] : []),
            ...Array.from(node.querySelectorAll('[role="alert"], [role="status"]')),
          ];
          regions.forEach(region => this.announce(region));
        });
      }
    });
    this.observer.observe(this.host, { childList: true, subtree: true });
  }
  private announce(region: Element) {
    const message = region.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!message || this.announced.get(region) === message) return;
    this.announced.set(region, message);
    if (region.getAttribute('role') === 'alert') this.speech.read(message);
    else this.speech.announce(message);
  }
  ngOnDestroy() { this.observer?.disconnect(); }
}

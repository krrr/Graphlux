import { Component, Input, HostBinding, ChangeDetectorRef, OnChanges } from '@angular/core';

@Component({
    selector: 'custom-socket',
    template: ``,
    styles: [
        `
            :host {
                display: block;
                width: 12px;
                height: 12px;
                background: var(--primary-color-tint);
                border-radius: 50%;
                border: 2px solid var(--component-background);
                box-shadow: 0 0 0 1px var(--primary-color-tint);
                transition: background 0.3s, box-shadow 0.3s;
            }
            :host:hover {
                background: var(--primary-color);
                box-shadow: 0 0 0 1px var(--primary-color);
            }
        `,
    ],
})
export class CustomSocketComponent implements OnChanges {
    // input variables and methods from https://retejs.org/examples/customization/angular/#customization-for-angular
    @Input() data!: any;
    @Input() rendered!: any;

    @HostBinding('title') get title() {
        return this.data.name;
    }

    constructor(private cdr: ChangeDetectorRef) {
        this.cdr.detach();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
    }
}

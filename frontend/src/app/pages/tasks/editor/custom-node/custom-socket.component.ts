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
                border: 2px solid white;
                box-shadow: 0 0 0 1px var(--primary-color-tint);
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

import { Component, Input } from '@angular/core';
import { ClassicPreset } from 'rete';

@Component({
    selector: 'connection',
    template: `
        <svg data-testid="connection">
            <path [attr.d]="path" />
        </svg>
    `,
    styles: [
        `
            svg {
                overflow: visible;
                position: absolute;
                pointer-events: none;
            }
            path {
                fill: none;
                stroke-width: 2px;
                stroke: var(--primary-color);
                pointer-events: auto;
            }
        `,
    ],
})
export class CustomConnComponent {
    @Input() data!: ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>;
    @Input() start: any;
    @Input() end: any;
    @Input() path!: string;
}

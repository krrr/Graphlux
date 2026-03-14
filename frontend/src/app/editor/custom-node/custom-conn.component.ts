import { Component, Input } from '@angular/core';
import { ClassicPreset } from 'rete';
import { TaskConnection, TaskNode } from '../editor.service';

@Component({
    selector: 'custom_conn',
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
                stroke: var(--primary-color-tint);
                pointer-events: auto;
            }
        `,
    ],
})
export class CustomConnComponent {
    @Input() data!: TaskConnection<TaskNode>;
    @Input() start: any;
    @Input() end: any;
    @Input() path!: string;
}

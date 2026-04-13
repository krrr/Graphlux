import { Component, Input, ChangeDetectorRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ReteModule } from 'rete-angular-plugin/18';
import { NODE_INFO, TaskNode } from '../editor.service';


@Component({
    selector: 'app-custom-node',
    standalone: true,
    imports: [CommonModule, NzIconModule, ReteModule],
    templateUrl: './custom-node.component.html',
    styleUrls: ['./custom-node.component.scss'],
})
export class CustomNodeComponent implements OnChanges {
    @Input() data!: TaskNode;
    @Input() emit!: (data: any) => void;
    @Input() rendered!: () => void;

    seed = 0; // from official demo

    get iconType(): string {
        return NODE_INFO[this.data.type]?.icon || 'setting';
    }

    get iconColor(): string {
        return NODE_INFO[this.data.type]?.color || '#666';
    }

    get headerBgColor(): string {
        const iconColor = this.iconColor;
        if (iconColor.startsWith('#')) {
            return iconColor + '11'; // ~6% opacity
        } else {
            return 'rgba(0,0,0,0.05)';
        }
    }

    get inputs() {
        return Object.keys(this.data.inputs).map((key) => ({
            key,
            input: this.data.inputs[key]!,
        }));
    }

    get outputs() {
        return Object.keys(this.data.outputs).map((key) => ({
            key,
            output: this.data.outputs[key]!,
        }));
    }

    get configDisplayKeys() {
        const info = NODE_INFO[this.data.type];
        const config = (this.data as any).customConfig || {};

        if (info?.footerKeys) {
            return info.footerKeys.filter((key) => config[key] !== undefined && config[key] !== null && config[key] !== '');
        }

        return Object.keys(config)
            .filter((key) => config[key] !== undefined && config[key] !== null && config[key] !== '')
            .slice(0, 3); // show up to 3 properties
    }

    getOutputLabel(key: string): string {
        const info = NODE_INFO[this.data.type];
        if (key === 'default') {
            if (info?.outputVar) {
                const config = (this.data as any).customConfig || {};
                if (typeof info.outputVar === 'function') {
                    return info.outputVar(config);
                }
                return info.outputVar;
            }
            return ''; // keep hidden if no outputVar defined
        }
        return key;
    }

    getConfigKeyLabel(key: string): string {
        const labels: Record<string, string> = {
            input_file_var: 'input',
            target_file_var: 'target',
            result_var: 'result',
            read_single_tag: 'tag',
            target_extension: 'ext',
            output_var: 'output',
            relation: 'logic',
            action: 'action',
            format: 'format',
            extension: 'ext',
            tool: 'tool'
        };
        return labels[key] || key;
    }

    getConfigValue(key: string) {
        const config = (this.data as any).customConfig || {};
        let val = config[key];
        if (typeof val === 'object') {
            val = JSON.stringify(val);
        }
        if (String(val).length > 20) {
            return String(val).substring(0, 20) + '...';
        }
        return val;
    }

    constructor(private cdr: ChangeDetectorRef) {
        // from official demo
        this.cdr.detach();
    }

    ngOnChanges() {
        // from official demo
        this.cdr.detectChanges();
        this.seed++; // force render sockets
        requestAnimationFrame(() => this.rendered());
    }
}

import { Component, inject, computed, input, output } from '@angular/core';
import { EditorService } from '../editor.service';
import { COMMON_IMPORTS } from '../../../../shared-imports';
import { NzCascaderModule, NzCascaderOption } from 'ng-zorro-antd/cascader';


@Component({
    selector: 'app-variable-selector',
    standalone: true,
    imports: [...COMMON_IMPORTS, NzCascaderModule],
    template: `
        <ng-container *transloco="let t">
            <nz-cascader
                style="width: 100%"
                [nzOptions]="options()"
                [ngModel]="displayValue()"
                (ngModelChange)="onCascaderChange($event)"
                [nzPlaceHolder]="placeholder() || t('common.var')"
                [nzLabelRender]="renderTpl"
                nzSize="small"
            />
        </ng-container>
        <ng-template #renderTpl let-labels="labels" let-selectedOptions="selectedOptions">
            {{ labels.join('.')}}
        </ng-template>
  `
})
export class VariableSelectorComponent {
    nodeId = input.required<string>();
    value = input<string | undefined>();
    placeholder = input<string>();
    valueChange = output<string>();

    private editorService = inject(EditorService);

    // availableVariables re-evaluates when nodeId() changes.
    availableVariables = computed(() => {
        return this.editorService.getAvailableVariables(this.nodeId());
    });

    options = computed<NzCascaderOption[]>(() => {
        const vars = this.availableVariables();
        return vars.map(v => {
            const option: NzCascaderOption = {
                label: v.label,
                value: v.value,
            };

            if (v.type === 'file') {
                option.children = [
                    { label: 'path', value: `${v.value}.path`, isLeaf: true },
                    { label: 'size', value: `${v.value}.size`, isLeaf: true },
                    { label: 'create_time', value: `${v.value}.ctime`, isLeaf: true }
                ];
            }

            option.isLeaf = !option.children;
            return option;
        });
    });

    displayValue = computed(() => {
        const val = this.value();
        if (!val) return [];
        if (val.includes('.')) {
            return [val.split('.')[0], val];
        }
        return [val];
    });

    onCascaderChange(values: string[]): void {
        if (values && values.length > 0) {
            this.valueChange.emit(values[values.length - 1]);
        } else {
            this.valueChange.emit('');
        }
    }
}

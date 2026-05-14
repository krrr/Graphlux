import { Component, inject, computed, input, output } from '@angular/core';
import { EditorService, VAR_TYPE_INFO } from '../editor.service';
import { COMMON_IMPORTS } from '../../../../shared-imports';
import { NzCascaderModule, NzCascaderOption } from 'ng-zorro-antd/cascader';
import { NzTagModule } from 'ng-zorro-antd/tag';


@Component({
    selector: 'app-variable-selector',
    standalone: true,
    imports: [...COMMON_IMPORTS, NzCascaderModule, NzTagModule],
    template: `
        <ng-container *transloco="let t">
            <nz-cascader
                style="width: 100%"
                [nzOptions]="options()"
                [ngModel]="displayValue()"
                [nzAllowClear]="false"
                (ngModelChange)="onCascaderChange($event)"
                [nzPlaceHolder]="placeholder() || t('common.var')"
                [nzLabelRender]="renderTpl"
                [nzOptionRender]="optionTpl"
                [nzSize]="size()"
            />
        </ng-container>
        <ng-template #renderTpl let-labels="labels" let-selectedOptions="selectedOptions">
            <div class="render-label-div">
                {{ labels.join('.')}}
                @if (selectedOptions.length > 0) {
                    @let last = selectedOptions[selectedOptions.length - 1];
                    @if (last.type) {
                        <div class="flex1"></div>
                        <nz-tag [nzColor]="getTypeColor(last.type)" class="type-tag">{{ last.type }}</nz-tag>
                    }
                }
            </div>
        </ng-template>
        <ng-template #optionTpl let-option let-index="index">
            <span>{{ option.label }}</span>
            @if (option.type) {
                <div class="flex1"></div>
                <nz-tag [nzColor]="getTypeColor(option.type)" nzSize="small" class="type-tag">{{ option.type }}</nz-tag>
            }
        </ng-template>
    `,
    styles: `
        .render-label-div {
            display: inline-flex;
            width: 100%;
        }
        .type-tag {
            margin-left: 8px;
            font-weight: normal;
            padding: 0 4px;
            line-height: 14px;
            height: 16px;
            font-size: 12px;
            margin-right: 0;
            align-self: center;
        }
    `
})
export class VariableSelectorComponent {
    nodeId = input.required<string>();
    value = input<string | undefined>();
    size = input<'small' | 'default' | 'large'>('default');
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
                type: v.type,
            };

            if (v.type === 'file') {
                option.children = [
                    { label: 'path', value: `${v.value}.path`, isLeaf: true, type: 'str' },
                    { label: 'size', value: `${v.value}.size`, isLeaf: true, type: 'int' },
                    { label: 'create_time', value: `${v.value}.ctime`, isLeaf: true, type: 'str' }
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

    getTypeColor(type: string): string {
        return VAR_TYPE_INFO[type]?.color || 'default';
    }
}

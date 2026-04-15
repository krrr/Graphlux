import { Component, Input, OnChanges, signal } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';
import { COMMON_IMPORTS } from '../../../../shared-imports';

@Component({
    selector: 'app-file-operation-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, ...COMMON_IMPORTS],
    template: `
        <ng-container *transloco="let t">
            <nz-form-item>
                <nz-form-label>{{ t('props.input_file_source') }}</nz-form-label>
                <nz-form-control>
                    <nz-select [ngModel]="config().input_file_var" (ngModelChange)="updateConfig('input_file_var', $event)"
                        [nzPlaceHolder]="t('props.placeholder_select_source')" name="input_file_var">
                        @for (i of availableVariables; track i.value) {
                            <nz-option [nzValue]="i.value" [nzLabel]="i.label" />
                        }
                    </nz-select>
                </nz-form-control>
            </nz-form-item>
            <nz-form-item>
                <nz-form-label>{{ t('props.action') }}</nz-form-label>
                <nz-form-control>
                    <nz-select [ngModel]="config().action" (ngModelChange)="updateConfig('action', $event)" name="action">
                        <nz-option nzValue="overwrite" [nzLabel]="t('props.action_overwrite')"></nz-option>
                        <nz-option nzValue="cleanup" [nzLabel]="t('props.action_cleanup')"></nz-option>
                    </nz-select>
                </nz-form-control>
            </nz-form-item>
            @if (config().action === 'overwrite') {
                <nz-form-item>
                    <nz-form-label>{{ t('props.target_file_replace') }}</nz-form-label>
                    <nz-form-control>
                        <nz-select [ngModel]="config().target_file_var" (ngModelChange)="updateConfig('target_file_var', $event)"
                            [nzPlaceHolder]="t('props.placeholder_select_replace')" name="target_file_var">
                            @for (i of availableVariables; track i.value) {
                                <nz-option [nzValue]="i.value" [nzLabel]="i.label" />
                            }
                        </nz-select>
                    </nz-form-control>
                </nz-form-item>
                <nz-form-item>
                    <nz-form-label>{{ t('props.target_extension_optional') }}</nz-form-label>
                    <nz-form-control>
                        <input nz-input [ngModel]="config().target_extension" (ngModelChange)="updateConfig('target_extension', $event)"
                            name="target_extension_fo" placeholder=".avif" />
                    </nz-form-control>
                </nz-form-item>
            }
        </ng-container>
    `
})
export class PropsFileOperationComponent extends PropsBase implements OnChanges {
    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId).filter(v => v.value.endsWith(':file'));
    }
}

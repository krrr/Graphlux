import { Component, Input, OnChanges, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-read-input-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSwitchModule, NzSelectModule],
    template: `
        <nz-form-item>
            <nz-form-label>Input File Source</nz-form-label>
            <nz-form-control>
                <nz-select [ngModel]="config().input_file_var" (ngModelChange)="updateConfig('input_file_var', $event)"
                    nzPlaceHolder="Select source node" name="input_file_var">
                    @for (i of availableVariables; track i.value) {
                        <nz-option [nzValue]="i.value" [nzLabel]="i.label"></nz-option>
                    }
                </nz-select>
            </nz-form-control>
        </nz-form-item>
        <nz-form-item>
            <nz-form-label>Enable single tag read</nz-form-label>
            <nz-form-control>
                <nz-switch [ngModel]="config().enable_single_tag"
                    (ngModelChange)="updateConfig('enable_single_tag', $event)"></nz-switch>
            </nz-form-control>
        </nz-form-item>
        @if (config().enable_single_tag) {
            <nz-form-item>
                <nz-form-label>Read single tag</nz-form-label>
                <nz-form-control>
                    <input nz-input [ngModel]="config().read_single_tag" (ngModelChange)="updateConfig('read_single_tag', $event)"
                        name="read_single_tag" placeholder="e.g. Xmp.ProcessingStatus" />
                </nz-form-control>
            </nz-form-item>
        }
    `
})
export class PropsMetadataReadComponent extends PropsBase implements OnChanges {
    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId).filter(v => v.value.endsWith(':file'));
    }
}

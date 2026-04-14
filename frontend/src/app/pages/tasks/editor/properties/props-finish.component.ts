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
    selector: 'app-finish-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSwitchModule, NzSelectModule],
    template: `
        <nz-form-item>
            <nz-form-label>Result</nz-form-label>
            <nz-form-control>
                <nz-select [ngModel]="config().result_var" (ngModelChange)="updateConfig('result_var', $event)"
                    name="finish_result_var">
                    <nz-option [nzValue]="null" nzLabel="None" />
                    @for (i of availableVariables; track i.value) {
                        <nz-option [nzValue]="i.value" [nzLabel]="i.label"></nz-option>
                    }
                </nz-select>
            </nz-form-control>
        </nz-form-item>
    `
})
export class PropsFinishComponent extends PropsBase implements OnChanges {
    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId);
    }
}

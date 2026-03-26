import { Component, OnChanges } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-metadata-write-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
    template: `
        <nz-form-item>
            <nz-form-label>Target File Source</nz-form-label>
            <nz-form-control>
                <nz-select [ngModel]="config().target_file_var" (ngModelChange)="updateConfig('target_file_var', $event)"
                    nzPlaceHolder="Select target node" name="target_file_var">
                    <nz-option *ngFor="let i of availableVariables" [nzValue]="i.value" [nzLabel]="i.label" />
                </nz-select>
            </nz-form-control>
        </nz-form-item>
        <nz-form-item>
            <nz-form-label>Tags (JSON Key-Value string)</nz-form-label>
            <nz-form-control>
                <textarea nz-input [ngModel]="config().tags | json" (ngModelChange)="updateTags($event)" name="tags" rows="4"
                    placeholder='{"XMP:ProcessingStatus": "LowCompression_Skipped"}'></textarea>
            </nz-form-control>
        </nz-form-item>
    `
})
export class PropsMetadataWriteComponent extends PropsBase implements OnChanges {
    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId).filter(v => v.value.endsWith(':file'));
    }

    updateTags(jsonString: string) {
        try {
            const tags = JSON.parse(jsonString);
            this.updateConfig('tags', tags);
        } catch (e) {
            // Ignore
        }
    }
}

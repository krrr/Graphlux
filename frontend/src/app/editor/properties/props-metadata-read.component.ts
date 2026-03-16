import { Component, Input, OnChanges, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-read-input-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSwitchModule],
    template: `
        <nz-form-item>
            <nz-form-label>Enable single tag read</nz-form-label>
            <nz-form-control>
                <nz-switch
                    [ngModel]="config().enable_single_tag"
                    (ngModelChange)="updateConfig('enable_single_tag', $event)"
                ></nz-switch>
            </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="config().enable_single_tag">
            <nz-form-label>Read single tag</nz-form-label>
            <nz-form-control>
            <input
                nz-input
                [ngModel]="config().read_single_tag"
                (ngModelChange)="updateConfig('read_single_tag', $event)"
                name="read_single_tag"
                placeholder="e.g. Xmp.ProcessingStatus"
            />
            </nz-form-control>
        </nz-form-item>
    `
})
export class PropsMetadataReadComponent extends PropsBase implements OnChanges {
}

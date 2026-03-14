import { Component, Input, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
    selector: 'app-read-input-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule],
    template: `
        <nz-form-item>
            <nz-form-label>Check Tag</nz-form-label>
            <nz-form-control>
            <input
                nz-input
                [ngModel]="config().check_tag"
                (ngModelChange)="updateConfig('check_tag', $event)"
                name="check_tag"
                placeholder="e.g. XMP:ProcessingStatus"
            />
            </nz-form-control>
        </nz-form-item>
        <nz-form-item>
            <nz-form-label>Skip Value</nz-form-label>
            <nz-form-control>
            <input
                nz-input
                [ngModel]="config().skip_value"
                (ngModelChange)="updateConfig('skip_value', $event)"
                name="skip_value"
                placeholder="e.g. Processed=True"
            />
            </nz-form-control>
        </nz-form-item>
    `
})
export class PropsMetadataReadComponent implements OnInit {
    config = signal<any>({});
    @Input() nodeId!: string;
    editorService = inject(EditorService);

    ngOnInit(): void {
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }

    updateConfig(field: string, value: any) {
        this.editorService.updateNodeConfig(this.nodeId, field, value);
    }
}

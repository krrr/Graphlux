import { Component, Input, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component({
    selector: 'app-metadata-write-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzCheckboxModule],
    template: `
        <nz-form-item>
          <nz-form-label>Write To Original File</nz-form-label>
          <nz-form-control>
            <label
              nz-checkbox
              [ngModel]="config().write_to_original"
              (ngModelChange)="updateConfig('write_to_original', $event)"
              name="write_to_original"
              >Enable</label
            >
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Tags (JSON Key-Value string)</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              [ngModel]="config().tags | json"
              (ngModelChange)="updateTags($event)"
              name="tags"
              rows="4"
              placeholder='{"XMP:ProcessingStatus": "LowCompression_Skipped"}'
            ></textarea>
          </nz-form-control>
        </nz-form-item>
    `
})
export class PropsMetadataWriteComponent implements OnInit {
    config = signal<any>({});
    @Input() nodeId!: string;
    editorService = inject(EditorService);

    ngOnInit(): void {
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }

    updateConfig(field: string, value: any) {
        this.editorService.updateNodeConfig(this.nodeId, field, value);
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

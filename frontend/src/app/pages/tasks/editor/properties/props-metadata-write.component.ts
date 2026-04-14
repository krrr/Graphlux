import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-metadata-write-props',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzTableModule,
        NzButtonModule,
        NzIconModule
    ],
    template: `
        <nz-form-item>
            <nz-form-label>Target File Source</nz-form-label>
            <nz-form-control>
                <nz-select [ngModel]="config().target_file_var" (ngModelChange)="updateConfig('target_file_var', $event)"
                    nzPlaceHolder="Select target node" name="target_file_var">
                    @for (i of availableVariables; track i.value) {
                        <nz-option [nzValue]="i.value" [nzLabel]="i.label" />
                    }
                </nz-select>
            </nz-form-control>
        </nz-form-item>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label style="color: rgba(0, 0, 0, 0.85); font-weight: 500;">Tags</label>
            <button nz-button nzShape="circle" nzSize="small" (click)="addTag()" type="button" aria-label="Add Tag" title="Add Tag">
                <span nz-icon nzType="plus"></span>
            </button>
        </div>

        <nz-form-item>
            <nz-form-control>
                <nz-table #basicTable [nzData]="tagEntries" [nzShowPagination]="false" nzSize="small" [nzBordered]="true">
                    <thead>
                        <tr class="sm-tr-th">
                            <th nzWidth="60%">Tag</th>
                            <th>Value</th>
                            <th nzWidth="24px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (data of tagEntries; track data) {
                            <tr>
                            <td class="input-cell">
                                <input nz-input [(ngModel)]="data.key" (ngModelChange)="syncTags()" placeholder="Tag" />
                            </td>
                            <td class="input-cell">
                                <input nz-input [(ngModel)]="data.value" (ngModelChange)="syncTags()" placeholder="Value" />
                            </td>
                            <td class="sm-btn-cell">
                                <button nz-button nzType="text" (click)="removeTag($index)" type="button" nzSize="small" aria-label="Remove Tag" title="Remove Tag">
                                    <span nz-icon nzType="delete"></span>
                                </button>
                            </td>
                        </tr>
                        }
                    </tbody>
                </nz-table>
            </nz-form-control>
        </nz-form-item>
    `
})
export class PropsMetadataWriteComponent extends PropsBase implements OnChanges {
    tagEntries: { key: string, value: string }[] = [];

    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId).filter(v => v.value.endsWith(':file'));
    }

    override ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
        if (changes['nodeId']) {
            this.tagEntries = Object.entries(this.config().tags || {}).map(([key, value]) => ({
                key,
                value: String(value)
            }));
        }
    }

    addTag() {
        this.tagEntries = [...this.tagEntries, { key: '', value: '' }];
        this.syncTags();
    }

    removeTag(index: number) {
        this.tagEntries = this.tagEntries.filter((_, i) => i !== index);
        this.syncTags();
    }

    syncTags() {
        const tags: { [key: string]: string } = {};
        this.tagEntries.forEach(e => {
            if (e.key) {
                tags[e.key] = e.value;
            }
        });
        this.updateConfig('tags', tags);
    }
}

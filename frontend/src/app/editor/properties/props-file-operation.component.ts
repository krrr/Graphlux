import { Component, Input, OnChanges, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-file-operation-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
    template: `
        <nz-form-item>
          <nz-form-label>Action</nz-form-label>
          <nz-form-control>
            <nz-select
              [ngModel]="config().action"
              (ngModelChange)="updateConfig('action', $event)"
              name="action"
            >
              <nz-option nzValue="overwrite" nzLabel="Overwrite / Move"></nz-option>
              <nz-option nzValue="cleanup" nzLabel="Cleanup"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="config().action === 'overwrite'">
          <nz-form-label>Target Extension (Optional, for rename)</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [ngModel]="config().target_extension"
              (ngModelChange)="updateConfig('target_extension', $event)"
              name="target_extension_fo"
              placeholder=".avif"
            />
          </nz-form-control>
        </nz-form-item>
    `
})
export class PropsFileOperationComponent extends PropsBase implements OnChanges {
}

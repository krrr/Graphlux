import { Component, Input, OnChanges, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-convert-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
    template: `
        <nz-form-item>
          <nz-form-label>Input File Source</nz-form-label>
          <nz-form-control>
            <nz-select
              [ngModel]="config().input_file_var"
              (ngModelChange)="updateConfig('input_file_var', $event)"
              nzPlaceHolder="Select source node"
              name="input_file_var"
            >
              <nz-option *ngFor="let i of availableVariables" [nzValue]="i.value" [nzLabel]="i.label"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Tool</nz-form-label>
          <nz-form-control>
            <nz-select
              [ngModel]="config().tool"
              (ngModelChange)="updateConfig('tool', $event)"
              name="tool"
            >
              <nz-option nzValue="imagemagick" nzLabel="ImageMagick"></nz-option>
              <nz-option nzValue="ffmpeg" nzLabel="FFmpeg"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Target Extension</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [ngModel]="config().target_extension"
              (ngModelChange)="updateConfig('target_extension', $event)"
              name="target_extension"
              placeholder=".avif"
            />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Arguments (JSON Array string)</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [ngModel]="config().args | json"
              (ngModelChange)="updateArgs($event)"
              name="args"
              placeholder='["-quality", "85"]'
            />
          </nz-form-control>
        </nz-form-item>
    `
})
export class PropsConvertComponent extends PropsBase implements OnChanges {
    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId).filter(v => v.value.endsWith(':file'));
    }

    updateArgs(jsonString: string) {
        try {
            const args = JSON.parse(jsonString);
            this.updateConfig('args', args);
        } catch (e) {
            // Ignore invalid JSON during typing
        }
    }
}

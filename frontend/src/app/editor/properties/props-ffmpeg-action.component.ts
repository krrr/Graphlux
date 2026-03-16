import { Component, Input, OnChanges, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-ffmpeg-action-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule],
    template: `
        <nz-form-item>
          <nz-form-label>Arguments (String format)</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [ngModel]="config().args"
              (ngModelChange)="updateConfig('args', $event)"
              name="args_ff"
              placeholder="-map 0:v -c:v copy"
            />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Target Extension</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [ngModel]="config().extension"
              (ngModelChange)="updateConfig('extension', $event)"
              name="extension_ff"
              placeholder=".mp4"
            />
          </nz-form-control>
        </nz-form-item>
    `
})
export class PropsFFmpegActionComponent extends PropsBase implements OnChanges {
}

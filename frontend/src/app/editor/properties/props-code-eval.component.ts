import { Component, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-code-eval-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, NzCodeEditorModule],
    template: `
        <nz-form-item>
          <nz-form-label>Python Code</nz-form-label>
          <nz-form-control>
            <nz-code-editor
              class="editor"
              [nzEditorOption]="editorOpt"
              [ngModel]="config().code"
              (ngModelChange)="updateConfig('code', $event)"
              style=""
            ></nz-code-editor>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Quick Insert Variable</nz-form-label>
          <nz-form-control>
            <nz-input-group nzSearch [nzAddOnAfter]="suffixButton">
              <nz-select [(ngModel)]="selectedVarForInsert" name="quick_var" nzSize="small">
                <nz-option *ngFor="let i of availableVariables" [nzValue]="formatVarForCode(i)" [nzLabel]="i"/>
              </nz-select>
            </nz-input-group>
            <ng-template #suffixButton>
              <button nz-button (click)="insertVariableToCode()" nzSize="small">Insert</button>
            </ng-template>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Output Variable Name</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              [ngModel]="config().output_var || 'eval_result'"
              (ngModelChange)="updateConfig('output_var', $event)"
              name="output_var"
              placeholder="eval_result"
            />
          </nz-form-control>
        </nz-form-item>
    `,
    styles: [`
      .editor {
        overflow: hidden;
        height: 200px;
        border: 1px solid #d9d9d9;
        border-radius: 2px;
      }
    `]
})
export class PropsCodeEvalComponent extends PropsBase implements OnChanges {
    editorOpt = {
        language: 'python',
        minimap: { enabled: false },
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        // lineDecorationsWidth: 0
    }

    get availableVariables(): string[] {
        return this.editorService.getAvailableVariables(this.nodeId);
    }

    selectedVarForInsert: string = 'args["file"]["size"]';

    formatVarForCode(varName: string): string {
        if (varName.startsWith('file.')) {
            const parts = varName.split('.');
            return `args["${parts[0]}"]["${parts[1]}"]`;
        }
        return `args["${varName}"]`;
    }

    insertVariableToCode() {
        const currentCode = this.config().code || '';
        const newCode = currentCode + (currentCode.endsWith('\n') || currentCode === '' ? '' : ' ') + this.selectedVarForInsert;
        this.updateConfig('code', newCode);
    }
}

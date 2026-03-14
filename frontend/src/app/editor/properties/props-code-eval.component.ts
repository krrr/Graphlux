import { Component, Input, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
    selector: 'app-code-eval-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule],
    template: `
        <nz-form-item>
          <nz-form-label>Python Code</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              [ngModel]="config().code"
              (ngModelChange)="updateConfig('code', $event)"
              name="code"
              rows="6"
              placeholder="import os&#10;args['file']['size'] / os.path.getsize(args['original_file_path'])"
            ></textarea>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Quick Insert Variable</nz-form-label>
          <nz-form-control>
            <nz-input-group nzSearch [nzAddOnAfter]="suffixButton">
              <nz-select [(ngModel)]="selectedVarForInsert" name="quick_var" nzSize="small">
                <nz-option *ngFor="let varName of availableVariables" [nzValue]="formatVarForCode(varName)" [nzLabel]="varName"></nz-option>
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
    `
})
export class PropsCodeEvalComponent implements OnInit {
    config = signal<any>({});
    @Input() nodeId!: string;
    editorService = inject(EditorService);

    ngOnInit(): void {
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }

    get availableVariables(): string[] {
        return this.editorService.getAvailableVariables(this.nodeId);
    }
    
    selectedVarForInsert: string = 'args["file"]["size"]';

    updateConfig(field: string, value: any) {
        this.editorService.updateNodeConfig(this.nodeId, field, value);
    }

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

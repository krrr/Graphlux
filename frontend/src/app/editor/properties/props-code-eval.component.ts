import { Component, Input, OnChanges, signal } from '@angular/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';
import { PropsBase } from './props-base';
import { VariableInfo } from '../editor.service';
import { COMMON_IMPORTS } from '../../shared-imports';
import type { editor } from 'monaco-editor';

@Component({
    selector: 'app-code-eval-props',
    standalone: true,
    imports: [NzFormModule, NzSelectModule, NzCodeEditorModule, ...COMMON_IMPORTS],
    template: `
        <nz-form-item>
            <nz-form-label style="width: 100%; text-align: left">Python Code</nz-form-label>
            <nz-form-control>
                <div class="editor-wrap" [class.expanded]="isExpanded()">
                    <button nz-button nzShape="circle" class="expand-btn" (click)="toggleExpand()"
                        [nzSize]="isExpanded() ? 'default' : 'small'" [title]="isExpanded() ? 'Minimize' : 'Expand'"
                        [attr.aria-label]="isExpanded() ? 'Minimize' : 'Expand'">
                        <i nz-icon [nzType]="isExpanded() ? 'fullscreen-exit' : 'fullscreen'"></i>
                    </button>
                    <nz-code-editor class="editor" [nzEditorOption]="editorOpt" [ngModel]="config().code"
                        (ngModelChange)="updateConfig('code', $event)" (nzEditorInitialized)="onEditorInit($event)" />
                </div>
                <div *ngIf="isExpanded()" class="ant-modal-mask" (click)="toggleExpand()"></div>
            </nz-form-control>
        </nz-form-item>
        <nz-form-item>
            <nz-form-label>Quick Insert Variable</nz-form-label>
            <nz-form-control>
                <nz-input-group nzSearch [nzAddOnAfter]="suffixButton">
                    <nz-select [(ngModel)]="selectedVarForInsert" name="quick_var" nzSize="small">
                        <nz-option *ngFor="let i of availableVariables" [nzValue]="formatVarForCode(i.value)"
                            [nzLabel]="i.label" />
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
                <input nz-input [ngModel]="config().output_var || 'eval_result'"
                    (ngModelChange)="updateConfig('output_var', $event)" name="output_var" placeholder="eval_result" />
            </nz-form-control>
        </nz-form-item>
    `,
    styles: [`
        .editor-wrap {
            position: relative;
            height: 200px;

            // transition: all 0.2s ease-in-out;
            button {
                transition-property: color, border-color, opacity;
            }
        }

        .editor-wrap.expanded {
            position: fixed;
            top: 5vh;
            left: calc(50% - 500px);
            width: 1000px;
            height: 90vh;
            z-index: 2000;
            border-radius: 2px;
            box-shadow: 0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d;
        }

        .editor-wrap:not(.expanded) {
            button {
                opacity: 1;
                top: -28px;
                right: 0px;
            }
        }

        .editor {
            height: 100%;
            width: 100%;
            border: 1px solid #d9d9d9;
            border-radius: 2px;
            overflow: hidden;
        }

        .expand-btn {
            position: absolute;
            top: 8px;
            right: 12px;
            z-index: 10001;
            opacity: 0.6;
        }

        .expand-btn:hover {
            opacity: 1;
        }
    `]
})
export class PropsCodeEvalComponent extends PropsBase implements OnChanges {
    isExpanded = signal(false);
    editor?: editor.ICodeEditor | editor.IEditor;


    toggleExpand() {
        this.isExpanded.set(!this.isExpanded());
        setTimeout(() => this.editor?.layout(), 50);
    }

    editorOpt = {
        language: 'python',
        minimap: { enabled: false },
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        // lineDecorationsWidth: 0
    }

    onEditorInit(e: editor.ICodeEditor | editor.IEditor) {
        this.editor = e;
    }

    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId);
    }

    selectedVarForInsert: string = '';

    formatVarForCode(varId: string): string {
        return `args["${varId}"]`;
    }

    insertVariableToCode() {
        if (!this.selectedVarForInsert) return;
        const currentCode = this.config().code || '';
        const newCode = currentCode + (currentCode.endsWith('\n') || currentCode === '' ? '' : ' ') + this.selectedVarForInsert;
        this.updateConfig('code', newCode);
    }
}

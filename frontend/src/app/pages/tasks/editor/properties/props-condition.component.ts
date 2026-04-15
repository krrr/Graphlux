import { Component, Input, OnChanges, signal } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PropsBase } from './props-base';
import { COMMON_IMPORTS } from '../../../../shared-imports';

@Component({
    selector: 'app-condition-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, NzIconModule, ...COMMON_IMPORTS],
    template: `
        <ng-container *transloco="let t">
          <nz-form-item>
            <nz-form-label>{{ t('props.relation') }}</nz-form-label>
            <nz-form-control>
              <nz-select
                [ngModel]="config().relation || 'and'"
                (ngModelChange)="updateConfig('relation', $event)"
                name="relation"
              >
                <nz-option nzValue="and" nzLabel="AND"/>
                <nz-option nzValue="or" nzLabel="OR"/>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          @for (cond of config().conditions; track $index) {
            <div style="border: 1px solid #d9d9d9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>{{ t('props.condition') }} {{ $index + 1 }}</strong>
              <button nz-button nzType="text" nzDanger nzSize="small" (click)="removeCondition($index)" [attr.aria-label]="t('props.remove_condition')" [title]="t('props.remove_condition')"><span nz-icon nzType="delete"></span></button>
            </div>
            <nz-form-item style="margin-bottom: 8px;">
              <nz-form-label>{{ t('editor.name') }}</nz-form-label>
              <nz-form-control>
                <nz-select [ngModel]="cond.variable"
                  (ngModelChange)="updateCondition($index, 'variable', $event)"
                  name="cond_var_{{$index}}"
                >
                  @for (i of availableVariables; track i.value) {
                      <nz-option [nzValue]="i.value" [nzLabel]="i.label"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item style="margin-bottom: 8px;">
              <nz-form-label>{{ t('props.operator') }}</nz-form-label>
              <nz-form-control>
                <nz-select
                  [ngModel]="cond.operator"
                  (ngModelChange)="updateCondition($index, 'operator', $event)"
                  name="cond_op_{{$index}}"
                >
                  <nz-option nzValue="<" nzLabel="<"/>
                  <nz-option nzValue=">" nzLabel=">"/>
                  <nz-option nzValue="==" nzLabel="=="/>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item style="margin-bottom: 0;">
              <nz-form-label>{{ t('props.target') }}</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [ngModel]="cond.target"
                  (ngModelChange)="updateCondition($index, 'target', $event)"
                  name="cond_thresh_{{$index}}"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
          }

          <button nz-button nzType="dashed" nzBlock (click)="addCondition()" class="add-btn">
            <span nz-icon nzType="plus"></span> {{ t('props.add_condition') }}
          </button>
        </ng-container>
    `,
    styles: [`
      .add-btn {
        margin-bottom: 12px;
      }
    `]
})
export class PropsConditionComponent extends PropsBase implements OnChanges {
    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId);
    }
    
    addCondition() {
        const conditions = this.config().conditions ? [...this.config().conditions] : [];
        conditions.push({});
        this.updateConfig('conditions', conditions);
    }

    removeCondition(index: number) {
        if (this.config().conditions) {
            const conditions = [...this.config().conditions];
            conditions.splice(index, 1);
            this.updateConfig('conditions', conditions);
        }
    }

    updateCondition(index: number, field: string, value: any) {
        if (this.config().conditions && this.config().conditions[index]) {
            const conditions = [...this.config().conditions];
            conditions[index] = { ...conditions[index], [field]: value };
            this.updateConfig('conditions', conditions);
        }
    }
}

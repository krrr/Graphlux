import { Component, Input, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
    selector: 'app-condition-props',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, NzIconModule],
    template: `
        <nz-form-item>
          <nz-form-label>Relation</nz-form-label>
          <nz-form-control>
            <nz-select
              [ngModel]="config().relation || 'and'"
              (ngModelChange)="updateConfig('relation', $event)"
              name="relation"
            >
              <nz-option nzValue="and" nzLabel="AND"></nz-option>
              <nz-option nzValue="or" nzLabel="OR"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>

        <div *ngFor="let cond of config().conditions; let i = index" style="border: 1px solid #d9d9d9; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>Condition {{ i + 1 }}</strong>
            <button nz-button nzType="text" nzDanger nzSize="small" (click)="removeCondition(i)"><span nz-icon nzType="delete"></span></button>
          </div>
          <nz-form-item style="margin-bottom: 8px;">
            <nz-form-label>Variable</nz-form-label>
            <nz-form-control>
              <nz-select [ngModel]="cond.variable"
                (ngModelChange)="updateCondition(i, 'variable', $event)"
                name="cond_var_{{i}}"
              >
                <nz-option *ngFor="let varName of availableVariables" [nzValue]="varName" [nzLabel]="varName"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item style="margin-bottom: 8px;">
            <nz-form-label>Operator</nz-form-label>
            <nz-form-control>
              <nz-select
                [ngModel]="cond.operator"
                (ngModelChange)="updateCondition(i, 'operator', $event)"
                name="cond_op_{{i}}"
              >
                <nz-option nzValue="<" nzLabel="<"></nz-option>
                <nz-option nzValue=">" nzLabel=">"></nz-option>
                <nz-option nzValue="==" nzLabel="=="></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item style="margin-bottom: 0;">
            <nz-form-label>Threshold (Number)</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                type="number"
                [ngModel]="cond.threshold"
                (ngModelChange)="updateCondition(i, 'threshold', $event)"
                name="cond_thresh_{{i}}"
              />
            </nz-form-control>
          </nz-form-item>
        </div>

        <button nz-button nzType="dashed" nzBlock (click)="addCondition()">
          <span nz-icon nzType="plus"></span>
          Add Condition
        </button>
    `
})
export class PropsConditionComponent implements OnInit {
    config = signal<any>({});
    @Input() nodeId!: string;
    editorService = inject(EditorService);

    ngOnInit(): void {
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }

    get availableVariables(): string[] {
        return this.editorService.getAvailableVariables(this.nodeId);
    }
    
    updateConfig(field: string, value: any) {
        this.editorService.updateNodeConfig(this.nodeId, field, value);
    }

    addCondition() {
        const conditions = this.config().conditions ? [...this.config().conditions] : [];
        conditions.push({ variable: 'compression_ratio', operator: '<', threshold: 0.8 });
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

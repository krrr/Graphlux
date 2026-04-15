import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';
import { ApiService } from '../../../../api.service';
import { COMMON_IMPORTS } from '../../../../shared-imports';

@Component({
    selector: 'app-props-call-task',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, COMMON_IMPORTS],
    template: `
    @if (config()) {
      <nz-form-item *transloco="let t">
        <nz-form-label>{{ t('props.task') }}</nz-form-label>
        <nz-form-control>
          <nz-select [ngModel]="config()?.['task_id']" (ngModelChange)="updateConfig('task_id', $event)">
            @for (i of availableTasks; track i.id) {
                <nz-option [nzValue]="i.id" [nzLabel]="i.name"/>
            }
          </nz-select>
        </nz-form-control>
      </nz-form-item>
    }
  `,
    styles: [],
})
export class PropsCallTaskComponent extends PropsBase implements OnInit {
    availableTasks: any[] = [];
    apiService = inject(ApiService);

    ngOnInit() {
        this.apiService.getTasks().subscribe(tasks => {
            this.availableTasks = tasks;
        });
    }
}
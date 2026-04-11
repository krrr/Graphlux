import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PropsBase } from './props-base';
import { ApiService } from '../../../../api.service';

@Component({
    selector: 'app-props-call-task',
    standalone: true,
    imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule],
    template: `
    <div *ngIf="config()">
      <nz-form-item>
        <nz-form-label>Task</nz-form-label>
        <nz-form-control>
          <nz-select [ngModel]="config()?.['task_id']" (ngModelChange)="updateConfig('task_id', $event)">
            @for (i of availableTasks; track i.id) {
                <nz-option [nzValue]="i.id" [nzLabel]="i.name"/>
            }
          </nz-select>
        </nz-form-control>
      </nz-form-item>
    </div>
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
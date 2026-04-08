import { Component, input, model, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { EditorService, NODE_INFO } from '../editor.service';
import { PropsMetadataReadComponent } from './props-metadata-read.component';
import { PropsConvertComponent } from './props-convert.component';
import { PropsCodeEvalComponent } from './props-code-eval.component';
import { PropsConditionComponent } from './props-condition.component';
import { PropsFileOperationComponent } from './props-file-operation.component';
import { PropsMetadataWriteComponent } from './props-metadata-write.component';
import { PropsCallTaskComponent } from './props-call-task.component';
import { PropsFinishComponent } from './props-finish.component';

@Component({
    selector: 'app-node-properties',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzButtonModule,
        NzFormModule,
        NzInputModule,
        NzIconModule,
        NzDividerModule,
        PropsMetadataReadComponent,
        PropsConvertComponent,
        PropsCodeEvalComponent,
        PropsConditionComponent,
        PropsFileOperationComponent,
        PropsMetadataWriteComponent,
        PropsCallTaskComponent,
        PropsFinishComponent
    ],
    template: `
    @if (node() && visible()) {
      <div class="property-editor" [animate.enter]="'panel-enter'" [animate.leave]="'panel-leave'">
        <div class="title-area">
          <div class="title">Node Properties</div>
          <button nz-button nzType="text" (click)="visible.set(false)" class="close-btn"
            aria-label="Close Properties Panel" title="Close Properties Panel">
            <span nz-icon nzType="close"></span>
          </button>
        </div>

        <div class="props-area">
          <div class="ant-form">
            <nz-form-item>
              <nz-form-label [nzSpan]="4" nzLabelAlign="left">Type</nz-form-label>
              <nz-form-control>
                {{ node().type }}
                <span nz-icon [nzType]="getNodeIcon(node().type)"></span>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label [nzSpan]="4" nzLabelAlign="left">Name</nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="node().label"
                  (ngModelChange)="updateNodeName(node().id, $event)" name="nodeName"
                  placeholder="Node Name" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <nz-divider [style.margin]="'12px 0'"></nz-divider>

          <div class="divider-title">Configuration</div>
          <div [ngSwitch]="node().type" class="ant-form">
            <app-read-input-props *ngSwitchCase="'MetadataReadNode'" [nodeId]="node().id" />
            <app-convert-props *ngSwitchCase="'ConvertNode'" [nodeId]="node().id" />
            <app-code-eval-props *ngSwitchCase="'CodeEvalNode'" [nodeId]="node().id" />
            <app-condition-props *ngSwitchCase="'ConditionNode'" [nodeId]="node().id" />
            <app-file-operation-props *ngSwitchCase="'FileOperationNode'" [nodeId]="node().id" />
            <app-metadata-write-props *ngSwitchCase="'MetadataWriteNode'" [nodeId]="node().id" />
            <app-props-call-task *ngSwitchCase="'CallTaskNode'" [nodeId]="node().id" />
            <app-finish-props *ngSwitchCase="'FinishNode'" [nodeId]="node().id" />
            <div *ngSwitchDefault>
              <i style="color: #6e6e6e">no properties.</i>
            </div>
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    .property-editor {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 380px;
      max-height: calc(100% - 32px);
      background-color: #ffffff;
      border-radius: 2px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10;
      border: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }

      &.panel-enter {
        animation: slideInRight 0.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
      }

      &.panel-leave {
        animation: slideOutRight 0.2s cubic-bezier(0.7, 0.3, 0.1, 1) forwards;
      }

      .title-area {
        padding: 8px;
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(0, 0, 0, .06);
        display: flex;
        .title {
          flex: 1;
          margin-left: 4px;
          font-weight: 500;
          font-size: 16px;
          line-height: 32px;
          user-select: none;
        }
      }

      .props-area {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        padding: 0 16px;
        padding-bottom: 12px;
        
        ::ng-deep .ant-form-item {
          margin-bottom: 8px;
        }
        
        .divider-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 8px;
        }
      }
    }
  `]
})
export class NodePropertiesComponent {
    node = input.required<any>();
    visible = model<boolean>(true);

    private editorService = inject(EditorService);

    getNodeIcon(type: string | undefined): string {
        if (!type) return 'question-circle';
        return NODE_INFO[type]?.icon || 'setting';
    }

    updateNodeName(nodeId: string, name: string) {
        this.editorService.updateNodeName(nodeId, name);
    }
}

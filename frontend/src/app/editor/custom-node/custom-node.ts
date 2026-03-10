import { Component, Input, ChangeDetectorRef, OnInit, OnChanges } from '@angular/core';
import { ClassicPreset } from 'rete';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

export const NODE_INFO: Record<string, { icon: string, color: string }> = {
  'StartNode': { icon: 'home', color: '#52c41a' },
  'FinishNode': { icon: 'check-circle', color: '#1890ff' },
  'ReadInputNode': { icon: 'folder-open', color: '#1890ff' },
  'ConvertNode': { icon: 'sync', color: '#52c41a' },
  'CalculateCompressionNode': { icon: 'percentage', color: '#722ed1' },
  'ConditionNode': { icon: 'branches', color: '#faad14' },
  'FileOperationNode': { icon: 'file-text', color: '#eb2f96' },
  'MetadataWriteNode': { icon: 'edit', color: '#13c2c2' },
  'FFmpegActionNode': { icon: 'video-camera', color: '#f5222d' },
};

@Component({
  selector: 'app-custom-node',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './custom-node.html',
  styleUrls: ['./custom-node.scss']
})
export class CustomNodeComponent implements OnChanges, OnInit {
  @Input() data!: ClassicPreset.Node & { selected?: boolean };
  @Input() emit!: (data: any) => void;
  @Input() rendered!: () => void;

  seed = 0;

  get iconType(): string {
    return NODE_INFO[this.data.label]?.icon || 'setting';
  }

  get iconColor(): string {
    return NODE_INFO[this.data.label]?.color || '#666';
  }

  get inputs() {
    return Object.keys(this.data.inputs).map(key => ({
      key,
      input: this.data.inputs[key]!
    }));
  }

  get customName(): string | undefined {
    return (this.data as any).customName;
  }

  get outputs() {
    return Object.keys(this.data.outputs).map(key => ({
      key,
      output: this.data.outputs[key]!
    }));
  }

  get configDisplayKeys() {
    const config = (this.data as any).customConfig || {};
    return Object.keys(config)
        .filter(key => config[key] !== undefined && config[key] !== null && config[key] !== '')
        .slice(0, 3); // show up to 3 properties
  }

  getConfigValue(key: string) {
    const config = (this.data as any).customConfig || {};
    let val = config[key];
    if (typeof val === 'object') {
        val = JSON.stringify(val);
    }
    if (String(val).length > 20) {
        return String(val).substring(0, 20) + '...';
    }
    return val;
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cdr.detectChanges();
  }

  ngOnChanges() {
    this.cdr.detectChanges();
    requestAnimationFrame(() => this.rendered());
  }
}

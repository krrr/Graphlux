import { Component, Input, ChangeDetectorRef, OnInit, OnChanges } from '@angular/core';
import { ClassicPreset } from 'rete';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-custom-node',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './custom-node.html',
  styleUrls: ['./custom-node.css']
})
export class CustomNodeComponent implements OnChanges, OnInit {
  @Input() data!: ClassicPreset.Node & { selected?: boolean };
  @Input() emit!: (data: any) => void;
  @Input() rendered!: () => void;

  seed = 0;

  get iconType(): string {
    switch (this.data.label) {
      case 'ReadInputNode': return 'folder-open';
      case 'ConvertNode': return 'sync';
      case 'CalculateCompressionNode': return 'percentage';
      case 'ConditionNode': return 'branches';
      case 'FileOperationNode': return 'file-text';
      case 'MetadataWriteNode': return 'edit';
      case 'FFmpegActionNode': return 'video-camera';
      default: return 'setting';
    }
  }

  get iconColor(): string {
    switch (this.data.label) {
      case 'ReadInputNode': return '#1890ff';
      case 'ConvertNode': return '#52c41a';
      case 'CalculateCompressionNode': return '#722ed1';
      case 'ConditionNode': return '#faad14';
      case 'FileOperationNode': return '#eb2f96';
      case 'MetadataWriteNode': return '#13c2c2';
      case 'FFmpegActionNode': return '#f5222d';
      default: return '#666';
    }
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

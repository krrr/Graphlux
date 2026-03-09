"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomNodeComponent = void 0;
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
@(0, core_1.Component)({
    selector: 'app-custom-node',
    standalone: true,
    imports: [common_1.CommonModule],
    templateUrl: './custom-node.html',
    styleUrls: ['./custom-node.css']
})
class CustomNodeComponent {
    cdr;
    @(0, core_1.Input)()
    data;
    @(0, core_1.Input)()
    emit;
    @(0, core_1.Input)()
    rendered;
    seed = 0;
    get iconClass() {
        switch (this.data.label) {
            case 'ReadInputNode': return 'anticon anticon-folder-open';
            case 'ConvertNode': return 'anticon anticon-sync';
            case 'CalculateCompressionNode': return 'anticon anticon-percentage';
            case 'ConditionNode': return 'anticon anticon-branches';
            case 'FileOperationNode': return 'anticon anticon-file-text';
            case 'MetadataWriteNode': return 'anticon anticon-edit';
            case 'FFmpegActionNode': return 'anticon anticon-video-camera';
            default: return 'anticon anticon-setting';
        }
    }
    get iconColor() {
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
            input: this.data.inputs[key]
        }));
    }
    get outputs() {
        return Object.keys(this.data.outputs).map(key => ({
            key,
            output: this.data.outputs[key]
        }));
    }
    constructor(cdr) {
        this.cdr = cdr;
    }
    ngOnInit() {
        this.cdr.detectChanges();
    }
    ngOnChanges() {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
    }
}
exports.CustomNodeComponent = CustomNodeComponent;

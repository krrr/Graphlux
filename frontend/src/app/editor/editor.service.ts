import { inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ClassicPreset, NodeEditor } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';


@Injectable({
    providedIn: 'root'
})
export class EditorService {
    editor!: NodeEditor<any>;
    area!: AreaPlugin<any, any>;
    nodeConfigs = signal<{ [id: string]: any }>({});
    message = inject(NzMessageService);

    patchNodeData(node: any, name: string, config: any) {
        node.label = name;
        (node as any).customConfig = config;
    }

    getNodeConfig(nodeId: string) {
        return this.nodeConfigs()[nodeId].config;
    }

    updateNodeConfig(nodeId: string, field: string, value: any) {
        this.nodeConfigs.update((configs) => ({
            ...configs,
            [nodeId]: {
                ...configs[nodeId],
                config: { ...configs[nodeId].config, [field]: value },
            },
        }));

        const node = this.editor.getNode(nodeId);
        if (node) {
            this.patchNodeData(node, this.nodeConfigs()[nodeId].name, this.nodeConfigs()[nodeId].config);
            this.area.update('node', nodeId);
        }
    }

    getAvailableVariables(nodeId: string): string[] {
        const variables = new Set<string>();
        const visited = new Set<string>();
        const queue = [nodeId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const connections = this.editor.getConnections().filter(c => c.target === currentId);
            for (const conn of connections) {
                const sourceNodeId = conn.source;
                queue.push(sourceNodeId);

                const sourceNode = this.editor.getNode(sourceNodeId) as any;
                if (sourceNode?.type === 'StartNode') {
                    variables.add('file.size');
                    variables.add('file.path');
                    variables.add('original_file_path');
                } else if (sourceNode?.type === 'CodeEvalNode') {
                    const sourceConfig = this.nodeConfigs()[sourceNodeId];
                    variables.add(sourceConfig?.config?.output_var || 'eval_result');
                } else {
                    const sourceConfig = this.nodeConfigs()[sourceNodeId];
                    if (sourceConfig?.config?.output_var) {
                        variables.add(sourceConfig.config.output_var);
                    }
                }
            }
        }
        return Array.from(variables);
    }

    async addNode(nodeType: string) {
        if (nodeType === 'StartNode' && this.editor.getNodes().some((n: any) => n.type === 'StartNode')) {
            console.error('Only one Start node is allowed');
            return;
        }

        const node = new TaskNode(nodeType, NODE_INFO[nodeType].label);

        if (nodeType !== 'StartNode') {
            node.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
        }

        if (nodeType === 'ConditionNode') {
            node.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
            node.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        } else if (nodeType !== 'FinishNode') {
            node.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        }

        await this.editor.addNode(node);

        this.nodeConfigs.update((configs) => ({
            ...configs,
            [node.id]: { name: NODE_INFO[nodeType].label, config: {} },
        }));
        this.patchNodeData(node, NODE_INFO[nodeType].label, {});

        const center = this.area.area.pointer;
        await this.area.translate(node.id, { x: center.x, y: center.y });
    }
}


export const NODE_INFO: Record<string, { icon: string; color: string, label: string }> = {
    StartNode: { icon: 'home', color: '#1890ff', label: 'Start' },
    FinishNode: { icon: 'check-circle', color: '#52c41a', label: 'Finish / Output' },
    MetadataReadNode: { icon: 'folder-open', color: '#c655df', label: 'Read Media Metadata' },
    ConvertNode: { icon: 'sync', color: '#f04951', label: 'Convert Format' },
    CodeEvalNode: { icon: 'code', color: '#945de1', label: 'Code Eval' },
    ConditionNode: { icon: 'branches', color: '#faad14', label: 'Condition Branch' },
    FileOperationNode: { icon: 'file-text', color: '#e1449b', label: 'File Operation (Move/Clean)' },
    MetadataWriteNode: { icon: 'edit', color: '#13c2c2', label: 'Write Media Metadata' },
    FFmpegActionNode: { icon: 'video-camera', color: '#c2dd2f', label: 'FFmpeg Action' },
};

export class TaskNode extends ClassicPreset.Node {
    type: string

    constructor(type: string, label: string) {
        super(label);
        this.type = type;
    }
}

export class TaskConnection<N extends TaskNode> extends ClassicPreset.Connection<N, N> {}
import { Injectable, signal } from '@angular/core';
import { NodeEditor } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';

@Injectable({
    providedIn: 'root'
})
export class EditorService {
    editor!: NodeEditor<any>;
    area!: AreaPlugin<any, any>;
    nodeConfigs = signal<{ [id: string]: any }>({});

    patchNodeData(node: any, name: string, config: any) {
        (node as any).customName = name;
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

                const sourceNode = this.editor.getNode(sourceNodeId);
                if (sourceNode?.label === 'StartNode') {
                    variables.add('file.size');
                    variables.add('file.path');
                    variables.add('original_file_path');
                } else if (sourceNode?.label === 'CodeEvalNode') {
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
}
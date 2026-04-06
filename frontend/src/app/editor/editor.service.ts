import { inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ClassicPreset, NodeEditor } from 'rete';
import { AreaExtensions, AreaPlugin } from 'rete-area-plugin';
import { Subject, Subscription } from 'rxjs';


export interface VariableInfo {
    value: string; // "node_id:var_name"
    label: string; // "Node Name > var_name"
}

@Injectable({
    providedIn: 'root'
})
export class EditorService {
    editor!: NodeEditor<any>;
    area!: AreaPlugin<any, any>;
    nodeConfigs = signal<{ [id: string]: any }>({});
    message = inject(NzMessageService);
    change$ = new Subject<void>();

    // History state
    undoStack = signal<string[]>([]);
    redoStack = signal<string[]>([]);
    private isApplyingSnapshot = false;

    constructor() {

    }

    async loadDag(taskDef: any, init = false) {
        await this.editor.clear();
        this.nodeConfigs.set({});

        const dagJson = taskDef.json_data;
        if (!dagJson || !dagJson.nodes) return;

        if (Object.keys(dagJson.nodes).length === 0) {
            // Empty DAG, create default Start node
            await this.addNode('StartNode');
            if (init) {
                this.clearUndoHistory();
            }
            return;
        }

        const nodeMap = new Map<string, any>();
        for (const [id, nodeData] of Object.entries<any>(dagJson.nodes)) {
            const node = new TaskNode(nodeData.type, nodeData.name);
            node.id = id;
            this.addNodeToConfig(node, nodeData.name, nodeData.config || {});
            nodeMap.set(id, node);
            await this.editor.addNode(node);
        }

        for (const edge of dagJson.edges) {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (sourceNode && targetNode) {
                const conn = new TaskConnection(sourceNode, edge.branch, targetNode, 'input');
                await this.editor.addConnection(conn);
            }
        }

        for (const node of Array.from(nodeMap.values())) {
            const nodeData = dagJson.nodes[node.id];
            if (nodeData?.position) {
                await this.area.translate(node.id, nodeData.position);
            }
        }

        if (init) {
            AreaExtensions.zoomAt(this.area, this.editor.getNodes());
            this.clearUndoHistory();
        }
    }

    private clearUndoHistory() {
        this.undoStack.set([JSON.stringify(this.serializeDag())]);
        this.redoStack.set([]);
    }

    serializeDag() {
        const nodes = this.editor.getNodes();
        const connections = this.editor.getConnections();
        const currentConfigs = this.nodeConfigs();

        const dagJson: any = { nodes: {}, edges: [], start_node: null };

        const startNodes = nodes.filter((n) => n.type === 'StartNode');
        if (startNodes.length > 0) {
            dagJson.start_node = startNodes[0].id;
        }

        nodes.forEach((node) => {
            const config = currentConfigs[node.id];
            const position = this.area.nodeViews.get(node.id)?.position || { x: 0, y: 0 };
            dagJson.nodes[node.id] = {
                type: node.type,
                name: node.label,
                config: config?.config || {},
                position: position,
            };
        });

        connections.forEach((conn) => {
            dagJson.edges.push({
                source: conn.source,
                target: conn.target,
                branch: conn.sourceOutput || 'default',
            });
        });

        return dagJson;
    }

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
        this.change$.next();
    }

    updateNodeName(nodeId: string, name: string) {
        this.nodeConfigs.update((configs) => ({
            ...configs,
            [nodeId]: { ...configs[nodeId], name },
        }));

        const node = this.editor.getNode(nodeId);
        if (node) {
            this.patchNodeData(node, name, this.nodeConfigs()[nodeId].config);
            this.area.update('node', nodeId);
        }
        this.change$.next();
    }

    getAvailableVariables(nodeId: string): VariableInfo[] {
        const variables: VariableInfo[] = [];
        const visited = new Set<string>();
        const queue = [nodeId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const connections = this.editor.getConnections().filter(c => c.target === currentId);
            for (const conn of connections) {
                const sourceId = conn.source;
                queue.push(sourceId);

                const sourceNode = this.editor.getNode(sourceId) as any;
                const sourceConfig = this.nodeConfigs()[sourceId];
                const nodeName = sourceConfig?.name || sourceNode?.label || sourceId;

                const addVar = (varName: string) => {
                    variables.push({
                        value: `${sourceId}:${varName}`,
                        label: `${nodeName} > ${varName}`
                    });
                };

                if (sourceNode?.type === 'StartNode') {
                    addVar('file');
                } else if (sourceNode?.type === 'CodeEvalNode') {
                    addVar(sourceConfig?.config?.output_var || 'eval_result');
                } else if (sourceNode?.type === 'MetadataReadNode') {
                    addVar('metadata');
                } else if (sourceNode?.type === 'ConvertNode' || sourceNode?.type === 'FileOperationNode' || sourceNode?.type === 'MetadataWriteNode') {
                    addVar('file');
                } else {
                    if (sourceConfig?.config?.output_var) {
                        addVar(sourceConfig.config.output_var);
                    }
                }
            }
        }
        return variables;
    }

    // Call this after a connection is added to automatically link input_file_var
    autoLinkVariable(connection: any) {
        const sourceId = connection.source;
        const targetId = connection.target;
        const targetNode = this.editor.getNode(targetId) as any;
        const sourceNode = this.editor.getNode(sourceId) as any;

        // If target node is a node that usually takes a file input
        const fileInputNodes = ['ConvertNode', 'CallTaskNode', 'MetadataReadNode', 'FileOperationNode'];
        const targetConfig = this.nodeConfigs()[targetId]?.config;

        if (fileInputNodes.includes(targetNode?.type)) {
            // Only auto-link if not already set or if it's the first connection
            if (!targetConfig?.input_file_var) {
                this.updateNodeConfig(targetId, 'input_file_var', `${sourceId}:file`);
            }
        } else if (targetNode?.type === 'MetadataWriteNode') {
            if (!targetConfig?.target_file_var) {
                this.updateNodeConfig(targetId, 'target_file_var', `${sourceId}:file`);
            }
        }
    }

    addNodeToConfig(node: TaskNode, name: string, config: any = {}) {
        this.nodeConfigs.update((configs) => ({
            ...configs,
            [node.id]: { name, config },
        }));
        this.patchNodeData(node, name, config);
        this.change$.next();
    }

    async addNode(nodeType: string) {
        if (nodeType === 'StartNode' && this.editor.getNodes().some((n: any) => n.type === 'StartNode')) {
            console.error('Only one Start node is allowed');
            return;
        }

        const node = new TaskNode(nodeType, NODE_INFO[nodeType].label);
        await this.editor.addNode(node);
        this.addNodeToConfig(node, node.label, {});

        const center = this.area.area.pointer;
        await this.area.translate(node.id, { x: center.x, y: center.y });
        this.change$.next();
    }

    takeSnapshot() {
        if (this.isApplyingSnapshot) return;
        const snapshot = JSON.stringify(this.serializeDag());
        const currentStack = this.undoStack();
        // Avoid duplicate snapshots
        if (currentStack.length > 0 && currentStack[currentStack.length - 1] === snapshot) return;

        this.undoStack.update(stack => [...stack, snapshot]);
        this.redoStack.set([]); // Clear redo stack on new action
    }

    async undo() {
        const stack = this.undoStack();
        if (stack.length <= 1) return; // Need at least 2 states to undo (initial + current)

        this.isApplyingSnapshot = true;
        const current = stack.pop()!;
        const previous = stack[stack.length - 1];

        this.undoStack.set([...stack]);
        this.redoStack.update(rs => [...rs, current]);

        await this.loadDag({ json_data: JSON.parse(previous) }, false);
        this.isApplyingSnapshot = false;
    }

    async redo() {
        const stack = this.redoStack();
        if (stack.length === 0) return;

        this.isApplyingSnapshot = true;
        const next = stack.pop()!;
        this.redoStack.set([...stack]);
        this.undoStack.update(us => [...us, next]);

        await this.loadDag({ json_data: JSON.parse(next) }, false);
        this.isApplyingSnapshot = false;
    }
}


export interface NodeInfo {
    icon: string;
    color: string;
    label: string;
    footerKeys?: string[];
    outputVar?: string | ((config: any) => string);
}

export const NODE_INFO: Record<string, NodeInfo> = {
    StartNode: {
        icon: 'home', color: '#1890ff', label: 'Start',
        outputVar: 'file'
    },
    FinishNode: {
        icon: 'check-circle', color: '#52c41a', label: 'Finish / Output',
        footerKeys: [],
        outputVar: (config) => config.result_var ? `result: ${config.result_var.split(':').pop()}` : 'no result'
    },
    MetadataReadNode: {
        icon: 'tag', color: '#c655df', label: 'Read Media Metadata',
        footerKeys: ['input_file_var', 'read_single_tag'],
        outputVar: 'metadata'
    },
    ConvertNode: {
        icon: 'sync', color: '#f04951', label: 'Convert Format',
        footerKeys: ['format', 'target_extension'],
        outputVar: 'file'
    },
    CodeEvalNode: {
        icon: 'code', color: '#945de1', label: 'Code Eval',
        footerKeys: [],
        outputVar: (config) => config.output_var || 'eval_result'
    },
    ConditionNode: {
        icon: 'icon:branches', color: '#faad14', label: 'Condition Branch',
        footerKeys: ['relation']
    },
    FileOperationNode: {
        icon: 'file-text', color: '#e1449b', label: 'File Operation',
        footerKeys: ['action', 'target_extension'],
        outputVar: 'file'
    },
    MetadataWriteNode: {
        icon: 'edit', color: '#13c2c2', label: 'Write Media Metadata',
        footerKeys: ['target_file_var'],
        outputVar: 'file'
    },
    CallTaskNode: {
        icon: 'function', color: '#c2dd2f', label: 'Call Task',
        footerKeys: ['task_id'],
        outputVar: 'result'
    },
};

export class TaskNode extends ClassicPreset.Node {
    type: string

    constructor(type: string, label: string) {
        super(label);
        this.type = type;

        if (type !== 'StartNode') {
            this.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
        }

        if (type === 'ConditionNode') {
            this.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
            this.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        } else if (type !== 'FinishNode') {
            this.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        }
    }
}

export class TaskConnection<N extends TaskNode> extends ClassicPreset.Connection<N, N> {}
import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, Injector, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { AutoArrangePlugin, Presets as ArrangePresets } from 'rete-auto-arrange-plugin';
import { AngularPlugin, Presets, AngularArea2D } from 'rete-angular-plugin/18';
import { CustomNodeComponent } from './custom-node/custom-node.component';
import { ApiService } from '../api.service';
import { Subscription } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzContextMenuService, NzDropdownMenuComponent, NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { COMMON_IMPORTS } from '../shared-imports';
import { CustomSocketComponent } from './custom-node/custom-socket.component';
import { CustomConnComponent } from './custom-node/custom-conn.component';
import { PropsMetadataReadComponent } from './properties/props-metadata-read.component';
import { PropsConvertComponent } from './properties/props-convert.component';
import { PropsCodeEvalComponent } from './properties/props-code-eval.component';
import { PropsConditionComponent } from './properties/props-condition.component';
import { PropsFileOperationComponent } from './properties/props-file-operation.component';
import { PropsMetadataWriteComponent } from './properties/props-metadata-write.component';
import { PropsFFmpegActionComponent } from './properties/props-ffmpeg-action.component';
import { EditorService, NODE_INFO, TaskConnection, TaskNode } from './editor.service';

type Schemes = GetSchemes<TaskNode, TaskConnection<TaskNode>>;
type AreaExtra = AngularArea2D<Schemes>;

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzButtonModule,
        NzDropdownModule,
        NzMenuModule,
        NzModalModule,
        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzCheckboxModule,
        ...COMMON_IMPORTS,
        PropsMetadataReadComponent,
        PropsConvertComponent,
        PropsCodeEvalComponent,
        PropsConditionComponent,
        PropsFileOperationComponent,
        PropsMetadataWriteComponent,
        PropsFFmpegActionComponent,
    ],
    providers: [EditorService],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements AfterViewInit, OnInit, OnDestroy {
    @ViewChild('rete') container!: ElementRef<HTMLElement>;
    @ViewChild('contextMenu') contextMenu!: NzDropdownMenuComponent;

    logs = signal<string[]>([]);
    private logSubscription: Subscription | undefined;
    private routeSub: Subscription | undefined;

    editor = new NodeEditor<Schemes>();
    area!: AreaPlugin<Schemes, AreaExtra>;
    selectedNode = signal<any>(null);
    isPropertyPanelVisible = signal(true);

    taskId = signal<number | null>(null);
    arrange!: AutoArrangePlugin<any>;
    zoomLevel = signal<string>('100%');

    isExecuteModalVisible = signal(false);
    isLogsModalVisible = signal(false);
    executeFilePath = signal('');

    availableNodes = ['FinishNode', 'MetadataReadNode', 'ConvertNode', 'CodeEvalNode', 'ConditionNode', 'FileOperationNode',
        'MetadataWriteNode', 'FFmpegActionNode'];
    NODE_INFO = NODE_INFO;

    getNodeIcon(type: string | undefined): string {
        if (!type) return 'question-circle';
        return NODE_INFO[type]?.icon || 'setting';
    }

    constructor(
        private apiService: ApiService,
        private injector: Injector,
        private route: ActivatedRoute,
        private message: NzMessageService,
        private nzContextMenuService: NzContextMenuService,
        public editorService: EditorService,
    ) {}

    ngOnInit() {
        this.apiService.connectLogsWebSocket();
        this.logSubscription = this.apiService.logs$.subscribe((log) => {
            this.logs.update((l) => [...l, log]);
        });

        this.routeSub = this.route.paramMap.subscribe((params) => {
            const idStr = params.get('taskId');
            if (idStr) {
                this.taskId.set(+idStr);
                this.loadTask();
            }
        });
    }

    loadTask() {
        const tid = this.taskId();
        if (!tid) return;
        this.apiService.getTask(tid).subscribe((task) => {
            if (task) {
                this.loadDag(task);
            }
        });
    }

    ngOnDestroy() {
        if (this.logSubscription) {
            this.logSubscription.unsubscribe();
        }
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }

    async ngAfterViewInit() {
        this.editorService.editor = this.editor;
        this.area = new AreaPlugin<Schemes, AreaExtra>(this.container.nativeElement);
        this.editorService.area = this.area;
        const connection = new ConnectionPlugin<Schemes, AreaExtra>();
        const render = new AngularPlugin<Schemes, AreaExtra>({ injector: this.injector });

        const selector = AreaExtensions.selector();
        const selectableNodes = AreaExtensions.selectableNodes(this.area, selector, {
            accumulating: AreaExtensions.accumulateOnCtrl(),
        });

        this.area.addPipe((context) => {
            if (context.type === 'nodepicked') {
                const nodeId = context.data.id;
                const node = this.editor.getNode(nodeId);
                if (node) {
                    this.selectedNode.set(node);
                    console.debug('selected node', node);
                    
                    this.isPropertyPanelVisible.set(true);
                    if (!this.editorService.nodeConfigs()[node.id]) {
                        this.editorService.nodeConfigs.update((configs) => ({
                            ...configs,
                            [node.id]: { name: node.label, config: {} },
                        }));
                    }
                }
                this.nzContextMenuService.close(); // necessary, don't know why
            } else if (context.type === 'contextmenu') {
                const { event, context: target } = context.data;
                event.preventDefault();
                event.stopPropagation();

                if (target !== 'root' && 'id' in target) {
                    // right click on node
                    const node = this.editor.getNode(target.id);
                    if (node) {
                        this.selectedNode.set(node);
                        this.isPropertyPanelVisible.set(true);
                        selectableNodes.select(node.id, false); // rete.js will cancel selected state, handle it
                    }
                } else if (target === 'root') {
                    this.selectedNode.set(null);
                    selector.unselectAll();
                }

                this.nzContextMenuService.create(event, this.contextMenu);
            }

            return context;
        });

        render.addPreset(
            Presets.classic.setup({
                customize: {
                    node(context) {
                        return CustomNodeComponent;
                    },
                    socket(context) {
                        return CustomSocketComponent;
                    },
                    connection(context) {
                        return CustomConnComponent;
                    },
                },
            }),
        );

        connection.addPreset(ConnectionPresets.classic.setup());

        // setup arrange
        this.arrange = new AutoArrangePlugin<any>();
        this.arrange.addPreset(ArrangePresets.classic.setup());

        this.editor.use(this.area);
        this.area.use(connection);
        this.area.use(render);
        this.area.use(this.arrange);

        this.area.addPipe((context) => {
            if (context.type === 'zoomed') {
                const scale = this.area.area.transform.k;
                this.zoomLevel.set(Math.round(scale * 100) + '%');
            }
            return context;
        });

        AreaExtensions.simpleNodesOrder(this.area);

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    zoomIn() {
        const currentZoom = this.area.area.transform.k;
        if (currentZoom < 2) {
            this.area.area.zoom(currentZoom * 1.2);
        }
    }

    zoomOut() {
        const currentZoom = this.area.area.transform.k;
        if (currentZoom > 0.2) {
            this.area.area.zoom(currentZoom / 1.2);
        }
    }

    zoomFit() {
        AreaExtensions.zoomAt(this.area, this.editor.getNodes());
    }

    async autoArrange() {
        await this.arrange.layout();
        this.zoomFit();
    }

    handleKeyDown(e: KeyboardEvent) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNode()) {
            // Prevent deletion if an input/textarea is currently focused
            if (['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) {
                return;
            }
            this.deleteSelectedNode();
        }
    }

    async cloneSelectedNode() {
        const node = this.selectedNode();
        if (!node) return;

        if (node.type === 'StartNode') {
            this.message.error('Cannot clone Start node (only one allowed)');
            return;
        }

        const newNodeType = node.type;
        const newNode = new TaskNode(newNodeType, node.label + ' (Copy)');

        if (newNodeType !== 'StartNode') {
            newNode.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
        }

        if (newNodeType === 'ConditionNode') {
            newNode.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
            newNode.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        } else if (newNodeType !== 'FinishNode') {
            newNode.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        }

        await this.editor.addNode(newNode);

        const config = this.editorService.nodeConfigs()[node.id] || { config: {} };
        this.editorService.nodeConfigs.update((configs) => ({
            ...configs,
            [newNode.id]: { name: node.label + ' (Copy)', config: JSON.parse(JSON.stringify(config.config)) },
        }));
        this.editorService.patchNodeData(newNode, node.label + ' (Copy)', config.config);

        const view = this.area.nodeViews.get(node.id);
        if (view) {
            await this.area.translate(newNode.id, { x: view.position.x + 50, y: view.position.y + 50 });
        }
    }

    async deleteSelectedNode() {
        const node = this.selectedNode();
        if (!node) return;

        if (node.type === 'StartNode') {
            this.message.error('Cannot delete Start node. It is required.');
            return;
        }

        const conns = this.editor.getConnections().filter((c) => c.source === node.id || c.target === node.id);
        for (const c of conns) {
            await this.editor.removeConnection(c.id);
        }

        await this.editor.removeNode(node.id);
        this.selectedNode.set(null);
    }

    async changeSelectedNodeType(newType: string) {
        const node = this.selectedNode();
        if (!node) return;

        if (node.type === 'StartNode' || newType === 'StartNode') {
            this.message.error('Cannot change to or from Start node');
            return;
        }

        const oldId = node.id;
        const view = this.area.nodeViews.get(oldId);
        const pos = view ? { x: view.position.x, y: view.position.y } : { x: 0, y: 0 };

        const newNode = new TaskNode(newType, NODE_INFO[newType].label);

        if (newType !== 'StartNode') {
            newNode.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
        }

        if (newType === 'ConditionNode') {
            newNode.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
            newNode.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        } else if (newType !== 'FinishNode') {
            newNode.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        }

        await this.editor.addNode(newNode);
        await this.area.translate(newNode.id, pos);

        const config = this.editorService.nodeConfigs()[oldId] || { config: {} };
        this.editorService.nodeConfigs.update((configs) => ({
            ...configs,
            [newNode.id]: { name: newNode.label, config: {} },
        }));
        this.editorService.patchNodeData(newNode, newNode.label, {});

        // reconnect edges where possible
        const conns = this.editor.getConnections().filter((c) => c.source === oldId || c.target === oldId);
        for (const c of conns) {
            if (c.source === oldId && newNode.outputs[c.sourceOutput]) {
                const targetNode = this.editor.getNode(c.target);
                if (targetNode) {
                    await this.editor.addConnection(
                        new ClassicPreset.Connection(newNode, c.sourceOutput as never, targetNode, c.targetInput as never),
                    );
                }
            } else if (c.target === oldId && newNode.inputs[c.targetInput]) {
                const sourceNode = this.editor.getNode(c.source);
                if (sourceNode) {
                    await this.editor.addConnection(
                        new ClassicPreset.Connection(sourceNode, c.sourceOutput as never, newNode, c.targetInput as never),
                    );
                }
            }
        }

        await this.deleteSelectedNode();
        this.selectedNode.set(newNode);
        this.isPropertyPanelVisible.set(true);
    }


    updateNodeName(nodeId: string, name: string) {
        this.editorService.nodeConfigs.update((configs) => ({
            ...configs,
            [nodeId]: { ...configs[nodeId], name },
        }));

        const node = this.editor.getNode(nodeId);
        if (node) {
            this.editorService.patchNodeData(node, name, this.editorService.nodeConfigs()[nodeId].config);
            this.area.update('node', nodeId);
        }
    }

    showExecuteModal() {
        this.isExecuteModalVisible.set(true);
    }

    handleExecuteCancel() {
        this.isExecuteModalVisible.set(false);
    }

    handleExecuteOk() {
        if (!this.executeFilePath()) {
            this.message.warning('Please enter a file path');
            return;
        }
        this.isExecuteModalVisible.set(false);
        this.executeDag();
    }

    executeDag() {
        const dag = this.serializeDag();
        this.logs.set([]);
        this.isLogsModalVisible.set(true);

        this.apiService.executeTask(dag, this.executeFilePath(), this.taskId() || undefined).subscribe({
            next: (res) => console.log('Execution response:', res),
            error: (err) => {
                console.error('Execution error:', err);
                this.message.error('Execution failed');
            },
        });
    }

    handleLogsClose() {
        this.isLogsModalVisible.set(false);
    }

    serializeDag() {
        const nodes = this.editor.getNodes();
        const connections = this.editor.getConnections();
        const currentConfigs = this.editorService.nodeConfigs();

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

    saveDag() {
        const taskId = this.taskId();
        if (!taskId) {
            this.message.error('No Task ID associated with this editor');
            return;
        }

        const dagJson = this.serializeDag();

        this.apiService.getTask(taskId).subscribe((currentTask) => {
            const payload = {
                name: currentTask.name,
                description: currentTask.description,
                json_data: dagJson,
            };

            this.apiService.updateTask(taskId, payload).subscribe(() => {
                this.message.success('Task Saved successfully');
            });
        });
    }

    async loadDag(taskDef: any) {
        await this.editor.clear();
        this.editorService.nodeConfigs.set({});
        this.selectedNode.set(null);

        const dagJson = taskDef.json_data;
        if (!dagJson || !dagJson.nodes) return;

        if (Object.keys(dagJson.nodes).length === 0) {
            // Empty DAG, create default Start node
            await this.editorService.addNode('StartNode');
            return;
        }

        const nodeMap = new Map<string, any>();
        const newConfigs: { [id: string]: any } = {};

        for (const [id, nodeData] of Object.entries<any>(dagJson.nodes)) {
            const node = new TaskNode(nodeData.type, nodeData.name);
            node.id = id;

            if (nodeData.type !== 'StartNode') {
                node.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
            }

            if (nodeData.type === 'ConditionNode') {
                node.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
                node.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
            } else if (nodeData.type !== 'FinishNode') {
                node.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
            }

            newConfigs[node.id] = { name: nodeData.name, config: nodeData.config || {} };
            this.editorService.patchNodeData(node, nodeData.name, nodeData.config || {});
            nodeMap.set(id, node);
            await this.editor.addNode(node);
        }

        this.editorService.nodeConfigs.set(newConfigs);

        for (const edge of dagJson.edges) {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (sourceNode && targetNode) {
                const conn = new TaskConnection(sourceNode, edge.branch, targetNode, 'input');
                await this.editor.addConnection(conn);
            }
        }

        let x = 0;
        for (const node of Array.from(nodeMap.values())) {
            const nodeData = dagJson.nodes[node.id];
            if (nodeData?.position) {
                await this.area.translate(node.id, nodeData.position);
            } else {
                await this.area.translate(node.id, { x: x, y: 0 });
                x += 260;
            }
        }

        AreaExtensions.zoomAt(this.area, this.editor.getNodes());
    }
}

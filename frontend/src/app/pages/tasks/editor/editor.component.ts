import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, Injector, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { AutoArrangePlugin, Presets as ArrangePresets } from 'rete-auto-arrange-plugin';
import { AngularPlugin, Presets, AngularArea2D } from 'rete-angular-plugin/18';
import { getDOMSocketPosition } from 'rete-render-utils'
import { CustomNodeComponent } from './custom-node/custom-node.component';
import { ApiService } from '../../../api.service';
import { lastValueFrom, Subscription, Subject, debounceTime } from 'rxjs';
import { NzContextMenuService, NzDropdownMenuComponent, NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { COMMON_IMPORTS } from '../../../shared-imports';
import { CustomSocketComponent } from './custom-node/custom-socket.component';
import { CustomConnComponent } from './custom-node/custom-conn.component';
import { EditorService, NODE_INFO, TaskConnection, TaskNode } from './editor.service';
import { FileDialogComponent } from '../../../components/file-dialog/file-dialog.component';
import { NodePropertiesComponent } from './properties/node-properties.component';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { TranslocoService } from '@jsverse/transloco';


type Schemes = GetSchemes<TaskNode, TaskConnection<TaskNode>>;
type AreaExtra = AngularArea2D<Schemes>;


@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [
        ...COMMON_IMPORTS,
        FormsModule,
        NzDropdownModule,
        NzModalModule,
        NzFormModule,
        NzSelectModule,
        NzCheckboxModule,
        NzDividerModule,
        FileDialogComponent,
        RouterLink,
        NodePropertiesComponent,
        NzSpaceModule,
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
    private changeSub: Subscription | undefined;
    private movementSubject = new Subject<void>();
    private movementSub: Subscription | undefined;

    editor = new NodeEditor<Schemes>();
    area!: AreaPlugin<Schemes, AreaExtra>;
    selectedNode = signal<any>(null);
    isPropertyPanelVisible = signal(true);

    task = signal<any>(null);
    taskId?: number;
    arrange!: AutoArrangePlugin<any>;
    zoomLevel = signal<number>(100);

    isExecuteModalVisible = signal(false);
    isLogsModalVisible = signal(false);
    isFileDialogVisible = false;
    executeFilePath = signal('');
    private readonly keydownListener = this.handleKeyDown.bind(this);

    availableNodes = ['FinishNode', 'MetadataReadNode', 'ConvertNode', 'CodeEvalNode', 'ConditionNode', 'FileOperationNode',
        'MetadataWriteNode', 'CallTaskNode'];
    NODE_INFO = NODE_INFO;

    constructor(
        private apiService: ApiService,
        private injector: Injector,
        private route: ActivatedRoute,
        private message: NzMessageService,
        private modal: NzModalService,
        private nzContextMenuService: NzContextMenuService,
        public editorService: EditorService,
        private translocoService: TranslocoService,
    ) { }

    ngOnInit() {
        this.logSubscription = this.apiService.logs$.subscribe((data) => {
            const msg = typeof data === 'string' ? data : data.message;
            this.logs.update((l) => [...l, msg]);
        });

        this.routeSub = this.route.paramMap.subscribe((params) => {
            const idStr = params.get('taskId');
            if (idStr) {
                this.taskId = +idStr;
                this.loadTask();
            }
        });

        // Snapshots on config changes and movement (debounced)
        this.changeSub = this.editorService.change$.pipe(debounceTime(400)).subscribe(() => {
            this.editorService.takeSnapshot();
        });

        // Debounce movement snapshots (using same stream or separate)
        this.movementSub = this.movementSubject.pipe(debounceTime(400)).subscribe(() => {
            this.editorService.takeSnapshot();
        });
    }


    loadTask() {
        const tid = this.taskId;
        if (!tid) return;
        this.apiService.getTask(tid).subscribe((task) => {
            this.task.set(task);
            this.editorService.loadDag(task, true);
            this.selectedNode.set(null);
        });
    }

    ngOnDestroy() {
        if (this.logSubscription) {
            this.logSubscription.unsubscribe();
        }
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
        if (this.movementSub) {
            this.movementSub.unsubscribe();
        }
        if (this.changeSub) {
            this.changeSub.unsubscribe();
        }
        this.apiService.disconnectLogsWebSocket();
        document.removeEventListener('keydown', this.keydownListener);
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
                // remove space between socket and svg
                socketPositionWatcher: getDOMSocketPosition({
                    offset({ x, y }, nodeId, side, key) {
                        return {
                            x: x,
                            y: y
                        }
                    },
                })
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
                this.zoomLevel.set(Math.round(scale * 100));
            } else if (context.type === 'connectioncreated') {
                this.editorService.autoLinkVariable(context.data);
            }
            return context;
        });

        // History handling
        this.editor.addPipe((context) => {
            if (['nodecreated', 'noderemoved', 'connectioncreated', 'connectionremoved'].includes(context.type)) {
                this.editorService.takeSnapshot();
            }
            return context;
        });

        this.area.addPipe((context) => {
            if (context.type === 'translated') {
                this.movementSubject.next();
            }
            return context;
        });

        AreaExtensions.simpleNodesOrder(this.area);

        document.addEventListener('keydown', this.keydownListener);
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
        // auto arrange requires fixed size
        for (let i of this.editor.getNodes()) {
            (i as any).width = 220;  // fixed for simplicity
            (i as any).height = 140;
        }
        await this.arrange.layout();
        for (let i of this.editor.getNodes()) {
            delete (i as any).width;
            delete (i as any).height;
        }
        this.zoomFit();
        // snapshot taken via translated events or manually if layout doesn't trigger them
        this.editorService.takeSnapshot();
    }

    handleKeyDown(e: KeyboardEvent) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNode()) {
            // Prevent deletion if an input/textarea is currently focused
            if (['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) {
                return;
            }
            this.deleteSelectedNode();
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                this.editorService.undo();
            } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
                e.preventDefault();
                this.editorService.redo();
            }
        }
    }

    async cloneSelectedNode() {
        const node = this.selectedNode();
        if (!node) return;

        if (node.type === 'StartNode') {
            this.message.error(this.translocoService.translate('editor.msg_clone_start_node'));
            return;
        }

        const newNode = new TaskNode(node.type, node.label + this.translocoService.translate('editor.copy_suffix'));
        await this.editor.addNode(newNode);

        const config = this.editorService.nodeConfigs()[node.id]?.config || {};
        this.editorService.addNodeToConfig(newNode, newNode.label, JSON.parse(JSON.stringify(config)));

        const view = this.area.nodeViews.get(node.id);
        if (view) {
            await this.area.translate(newNode.id, { x: view.position.x + 50, y: view.position.y + 50 });
        }
        // Snapshots are taken automatically via Rete and Service events
    }

    async deleteSelectedNode() {
        const node = this.selectedNode();
        if (!node) return;

        if (node.type === 'StartNode') {
            this.message.error(this.translocoService.translate('editor.msg_delete_start_node'));
            return;
        }

        const conns = this.editor.getConnections().filter((c) => c.source === node.id || c.target === node.id);
        for (const c of conns) {
            await this.editor.removeConnection(c.id);
        }

        await this.editor.removeNode(node.id);
        setTimeout(() => this.selectedNode.set(null), 250);  // wait context menu animation
    }

    async changeSelectedNodeType(newType: string) {
        const node = this.selectedNode();
        if (!node) return;

        if (node.type === 'StartNode' || newType === 'StartNode') {
            this.message.error(this.translocoService.translate('editor.msg_change_start_node'));
            return;
        }

        const oldId = node.id;
        const view = this.area.nodeViews.get(oldId);
        const pos = view ? { x: view.position.x, y: view.position.y } : { x: 0, y: 0 };

        const newNode = new TaskNode(newType, NODE_INFO[newType].label);
        await this.editor.addNode(newNode);
        await this.area.translate(newNode.id, pos);
        this.editorService.addNodeToConfig(newNode, newNode.label, {});

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


    showExecuteModal() {
        this.isExecuteModalVisible.set(true);
    }

    handleExecuteCancel() {
        this.isExecuteModalVisible.set(false);
    }

    handleExecuteOk() {
        if (!this.executeFilePath()) {
            this.message.warning(this.translocoService.translate('editor.msg_enter_file_path'));
            return;
        }
        this.isExecuteModalVisible.set(false);
        this.executeDag();
    }

    executeDag() {
        const dag = this.editorService.serializeDag();
        this.logs.set([]);
        this.isLogsModalVisible.set(true);
        this.apiService.connectLogsWebSocket();

        this.apiService.executeTask(dag, this.executeFilePath(), this.taskId).subscribe({
            next: (res) => console.log('Execution response:', res),
            error: (err) => {
                console.error('Execution error:', err);
                this.message.error(this.translocoService.translate('editor.msg_execution_failed'));
            },
        });
    }

    handleLogsClose() {
        this.isLogsModalVisible.set(false);
        this.apiService.disconnectLogsWebSocket();
    }

    async saveDag() {
        if (!this.taskId) {
            this.message.error(this.translocoService.translate('editor.msg_no_task_id'));
            return;
        }

        const dagJson = this.editorService.serializeDag();
        try {
            await lastValueFrom(this.apiService.updateTask(this.taskId, { json_data: dagJson }))
            this.message.success(this.translocoService.translate('editor.msg_task_saved'));
        } catch (e: any) {
            this.message.error(e.error.detail);
        }
    }

    openFileDialog() {
        this.isFileDialogVisible = true;
    }
}

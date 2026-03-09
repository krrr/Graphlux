import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, Injector, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { AutoArrangePlugin, Presets as ArrangePresets } from 'rete-auto-arrange-plugin';
import { AngularPlugin, Presets, AngularArea2D } from 'rete-angular-plugin/18';
import { CustomNodeComponent } from './custom-node/custom-node';
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

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
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
    ...COMMON_IMPORTS
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
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
  nodeConfigs = signal<{ [id: string]: any }>({});

  taskId = signal<number | null>(null);
  arrange!: AutoArrangePlugin<any>;
  zoomLevel = signal<string>('100%');

  isExecuteModalVisible = signal(false);
  isLogsModalVisible = signal(false);
  executeFilePath = signal('');

  availableNodes = [
    { type: 'ReadInputNode', label: 'Read Input Metadata' },
    { type: 'ConvertNode', label: 'Convert Format' },
    { type: 'CalculateCompressionNode', label: 'Calculate Compression' },
    { type: 'ConditionNode', label: 'Condition Branch' },
    { type: 'FileOperationNode', label: 'File Operation (Move/Clean)' },
    { type: 'MetadataWriteNode', label: 'Write Metadata' },
    { type: 'FFmpegActionNode', label: 'FFmpeg Action' }
  ];

  constructor(
    private apiService: ApiService,
    private injector: Injector,
    private route: ActivatedRoute,
    private message: NzMessageService,
    private nzContextMenuService: NzContextMenuService
  ) {}

  ngOnInit() {
    this.apiService.connectLogsWebSocket();
    this.logSubscription = this.apiService.logs$.subscribe(log => {
      this.logs.update(l => [...l, log]);
    });

    this.routeSub = this.route.paramMap.subscribe(params => {
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
    this.apiService.getTask(tid).subscribe(task => {
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
    this.area = new AreaPlugin<Schemes, AreaExtra>(this.container.nativeElement);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>();
    const render = new AngularPlugin<Schemes, AreaExtra>({ injector: this.injector });

    const selector = AreaExtensions.selector();
    AreaExtensions.selectableNodes(this.area, selector, {
      accumulating: AreaExtensions.accumulateOnCtrl()
    });

    this.area.addPipe(context => {
      if (context.type === 'nodepicked') {
        const nodeId = context.data.id;
        const node = this.editor.getNode(nodeId);
        if (node) {
          this.selectedNode.set(node);
          if (!this.nodeConfigs()[node.id]) {
            this.nodeConfigs.update(configs => ({
              ...configs,
              [node.id]: { name: node.label, config: {} }
            }));
          }
        }
      }

      if (context.type === 'contextmenu') {
        const { event, context: target } = context.data;
        event.preventDefault();
        event.stopPropagation();

        if (target !== 'root' && 'id' in target && this.editor.getNode(target.id)) {
          this.selectedNode.set(target);
        } else {
          this.selectedNode.set(null);
        }
        this.nzContextMenuService.create(event, this.contextMenu);
      }
      
      return context;
    });

    render.addPreset(Presets.classic.setup({
      customize: {
        node(context) {
          return CustomNodeComponent;
        }
      }
    }));

    connection.addPreset(ConnectionPresets.classic.setup());

    this.arrange = new AutoArrangePlugin<any>();
    this.arrange.addPreset(ArrangePresets.classic.setup());

    this.editor.use(this.area);
    this.area.use(connection);
    this.area.use(render);
    this.area.use(this.arrange as any);

    this.area.addPipe(context => {
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
      this.area.area.zoom(currentZoom * 1.2, this.area.area.pointer.x, this.area.area.pointer.y);
    }
  }

  zoomOut() {
    const currentZoom = this.area.area.transform.k;
    if (currentZoom > 0.2) {
      this.area.area.zoom(currentZoom / 1.2, this.area.area.pointer.x, this.area.area.pointer.y);
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

    const newNodeType = node.label;
    const newNode = new ClassicPreset.Node(newNodeType);
    newNode.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));

    if (newNodeType === 'ConditionNode') {
      newNode.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
      newNode.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    } else {
      newNode.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    }

    if (newNodeType === 'ReadInputNode') {
      newNode.removeInput('input');
    }

    await this.editor.addNode(newNode);

    const config = this.nodeConfigs()[node.id] || { config: {} };
    this.nodeConfigs.update(configs => ({
      ...configs,
      [newNode.id]: { name: config.name + ' (Copy)', config: JSON.parse(JSON.stringify(config.config)) }
    }));

    const view = this.area.nodeViews.get(node.id);
    if (view) {
      await this.area.translate(newNode.id, { x: view.position.x + 50, y: view.position.y + 50 });
    }
  }

  async deleteSelectedNode() {
    const node = this.selectedNode();
    if (!node) return;

    const conns = this.editor.getConnections().filter(c => c.source === node.id || c.target === node.id);
    for (const c of conns) {
      await this.editor.removeConnection(c.id);
    }

    await this.editor.removeNode(node.id);
    this.selectedNode.set(null);
  }

  async changeSelectedNodeType(newType: string) {
    const node = this.selectedNode();
    if (!node) return;

    const oldId = node.id;
    const view = this.area.nodeViews.get(oldId);
    const pos = view ? { x: view.position.x, y: view.position.y } : { x: 0, y: 0 };

    const newNode = new ClassicPreset.Node(newType);
    newNode.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));

    if (newType === 'ConditionNode') {
      newNode.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
      newNode.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    } else {
      newNode.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    }

    if (newType === 'ReadInputNode') {
      newNode.removeInput('input');
    }

    await this.editor.addNode(newNode);
    await this.area.translate(newNode.id, pos);

    const config = this.nodeConfigs()[oldId] || { config: {} };
    this.nodeConfigs.update(configs => ({
      ...configs,
      [newNode.id]: { name: newNode.label, config: {} }
    }));
    this.patchNodeData(newNode, newNode.label, {});

    // reconnect edges where possible
    const conns = this.editor.getConnections().filter(c => c.source === oldId || c.target === oldId);
    for (const c of conns) {
      if (c.source === oldId && newNode.outputs[c.sourceOutput]) {
        const targetNode = this.editor.getNode(c.target);
        if (targetNode) {
          await this.editor.addConnection(new ClassicPreset.Connection(newNode, c.sourceOutput as never, targetNode, c.targetInput as never));
        }
      } else if (c.target === oldId && newNode.inputs[c.targetInput]) {
        const sourceNode = this.editor.getNode(c.source);
        if (sourceNode) {
          await this.editor.addConnection(new ClassicPreset.Connection(sourceNode, c.sourceOutput as never, newNode, c.targetInput as never));
        }
      }
    }

    await this.deleteSelectedNode();
    this.selectedNode.set(newNode);
  }

  patchNodeData(node: any, name: string, config: any) {
    (node as any).customName = name;
    (node as any).customConfig = config;
  }

  async addNode(nodeType: string) {
    const node = new ClassicPreset.Node(nodeType);
    
    node.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));

    if (nodeType === 'ConditionNode') {
      node.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
      node.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    } else {
      node.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    }

    if (nodeType === 'ReadInputNode') {
      node.removeInput('input');
    }

    await this.editor.addNode(node);

    this.nodeConfigs.update(configs => ({
      ...configs,
      [node.id]: { name: node.label, config: {} }
    }));
    this.patchNodeData(node, node.label, {});

    const center = this.area.area.pointer;
    await this.area.translate(node.id, { x: center.x, y: center.y });
  }

  updateNodeName(nodeId: string, name: string) {
    this.nodeConfigs.update(configs => ({
      ...configs,
      [nodeId]: { ...configs[nodeId], name }
    }));

    const node = this.editor.getNode(nodeId);
    if (node) {
        this.patchNodeData(node, name, this.nodeConfigs()[nodeId].config);
        this.area.update('node', nodeId);
    }
  }

  updateNodeConfig(nodeId: string, field: string, value: any) {
    this.nodeConfigs.update(configs => ({
      ...configs,
      [nodeId]: {
        ...configs[nodeId],
        config: { ...configs[nodeId].config, [field]: value }
      }
    }));

    const node = this.editor.getNode(nodeId);
    if (node) {
        this.patchNodeData(node, this.nodeConfigs()[nodeId].name, this.nodeConfigs()[nodeId].config);
        this.area.update('node', nodeId);
    }
  }

  updateArgs(jsonString: string, nodeId: string) {
    try {
      const args = JSON.parse(jsonString);
      this.updateNodeConfig(nodeId, 'args', args);
    } catch (e) {
      // Ignore invalid JSON during typing
    }
  }

  updateTags(jsonString: string, nodeId: string) {
    try {
      const tags = JSON.parse(jsonString);
      this.updateNodeConfig(nodeId, 'tags', tags);
    } catch (e) {
       // Ignore
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
      }
    });
  }

  handleLogsClose() {
    this.isLogsModalVisible.set(false);
  }

  serializeDag() {
    const nodes = this.editor.getNodes();
    const connections = this.editor.getConnections();
    const currentConfigs = this.nodeConfigs();

    const dagJson: any = { nodes: {}, edges: [], start_node: null };

    const readNodes = nodes.filter(n => n.label === 'ReadInputNode');
    if (readNodes.length > 0) {
      dagJson.start_node = readNodes[0].id;
    } else if (nodes.length > 0) {
      dagJson.start_node = nodes[0].id;
    }

    nodes.forEach(node => {
      const config = currentConfigs[node.id];
      dagJson.nodes[node.id] = {
        type: node.label,
        name: config?.name || node.label,
        config: config?.config || {}
      };
    });

    connections.forEach(conn => {
      dagJson.edges.push({
        source: conn.source,
        target: conn.target,
        branch: conn.sourceOutput || 'default'
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

    this.apiService.getTask(taskId).subscribe(currentTask => {
      const payload = {
        name: currentTask.name,
        description: currentTask.description,
        json_data: dagJson
      };

      this.apiService.updateTask(taskId, payload).subscribe(() => {
        this.message.success('Task Saved successfully');
      });
    });
  }

  async loadDag(taskDef: any) {
    await this.editor.clear();
    this.nodeConfigs.set({});
    this.selectedNode.set(null);

    const dagJson = taskDef.json_data;
    if (!dagJson || !dagJson.nodes) return;

    const nodeMap = new Map<string, any>();
    const newConfigs: { [id: string]: any } = {};

    for (const [id, nodeData] of Object.entries<any>(dagJson.nodes)) {
      const node = new ClassicPreset.Node(nodeData.type);
      node.id = id;

      if (nodeData.type !== 'ReadInputNode') {
        node.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
      }

      if (nodeData.type === 'ConditionNode') {
        node.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        node.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
      } else {
        node.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
      }

      newConfigs[node.id] = { name: nodeData.name, config: nodeData.config || {} };
      this.patchNodeData(node, nodeData.name, nodeData.config || {});
      nodeMap.set(id, node);
      await this.editor.addNode(node);
    }

    this.nodeConfigs.set(newConfigs);

    for (const edge of dagJson.edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (sourceNode && targetNode) {
        const conn = new ClassicPreset.Connection(sourceNode, edge.branch, targetNode, 'input');
        await this.editor.addConnection(conn);
      }
    }

    let x = 0;
    for (const node of Array.from(nodeMap.values())) {
      await this.area.translate(node.id, { x: x, y: 0 });
      x += 250;
    }

    setTimeout(() => {
      AreaExtensions.zoomAt(this.area, this.editor.getNodes());
    }, 100);
  }
}

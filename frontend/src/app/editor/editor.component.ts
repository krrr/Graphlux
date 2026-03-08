import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { AngularPlugin, Presets, AngularArea2D } from 'rete-angular-plugin/18';
import { ApiService } from '../api.service';
import { Subscription } from 'rxjs';

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
type AreaExtra = AngularArea2D<Schemes>;

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements AfterViewInit, OnInit {
  @ViewChild('rete') container!: ElementRef<HTMLElement>;
  logs: string[] = [];
  private logSubscription: Subscription | undefined;
  
  editor = new NodeEditor<Schemes>();
  area!: AreaPlugin<Schemes, AreaExtra>;
  selectedNode: any = null;
  nodeConfigs: { [id: string]: any } = {};

  savedDags: any[] = [];
  selectedDagId: number | null = null;

  availableNodes = [
    { type: 'ReadInputNode', label: 'Read Input Metadata' },
    { type: 'ConvertNode', label: 'Convert Format' },
    { type: 'CalculateCompressionNode', label: 'Calculate Compression' },
    { type: 'ConditionNode', label: 'Condition Branch' },
    { type: 'FileOperationNode', label: 'File Operation (Move/Clean)' },
    { type: 'MetadataWriteNode', label: 'Write Metadata' },
    { type: 'FFmpegActionNode', label: 'FFmpeg Action' }
  ];

  constructor(private apiService: ApiService, private injector: Injector) {}

  ngOnInit() {
    this.apiService.connectLogsWebSocket();
    this.logSubscription = this.apiService.logs$.subscribe(log => {
      this.logs.push(log);
    });
    this.loadDagsList();
  }

  loadDagsList() {
    this.apiService.getDags().subscribe(dags => {
      this.savedDags = dags;
    });
  }

  ngOnDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
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
          this.selectedNode = node;
          if (!this.nodeConfigs[node.id]) {
            this.nodeConfigs[node.id] = { name: node.label, config: {} };
          }
        }
      } else if (context.type === 'pointerdown') {
         // Optionally clear selection if clicked outside, but selectableNodes handles part of this
         // For simplicity, keep selected until another is clicked
      }
      return context;
    });

    render.addPreset(Presets.classic.setup());
    connection.addPreset(ConnectionPresets.classic.setup());

    this.editor.use(this.area);
    this.area.use(connection);
    this.area.use(render);

    AreaExtensions.simpleNodesOrder(this.area);

    const n1 = new ClassicPreset.Node('ReadInputNode');
    n1.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    await this.editor.addNode(n1);

    const n2 = new ClassicPreset.Node('ConvertNode');
    n2.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
    n2.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    await this.editor.addNode(n2);

    const n3 = new ClassicPreset.Node('CalculateCompressionNode');
    n3.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
    n3.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    await this.editor.addNode(n3);

    const n4 = new ClassicPreset.Node('ConditionNode');
    n4.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
    n4.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    n4.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    await this.editor.addNode(n4);

    await this.editor.addConnection(new ClassicPreset.Connection(n1, 'default', n2, 'input'));
    await this.editor.addConnection(new ClassicPreset.Connection(n2, 'default', n3, 'input'));
    await this.editor.addConnection(new ClassicPreset.Connection(n3, 'default', n4, 'input'));

    await this.area.translate(n1.id, { x: 0, y: 0 });
    await this.area.translate(n2.id, { x: 250, y: 0 });
    await this.area.translate(n3.id, { x: 500, y: 0 });
    await this.area.translate(n4.id, { x: 750, y: 0 });

    setTimeout(() => {
      AreaExtensions.zoomAt(this.area, this.editor.getNodes());
    }, 100);
  }

  async addNode(nodeType: string) {
    const node = new ClassicPreset.Node(nodeType);
    
    // Add default ports based on node type
    node.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));

    if (nodeType === 'ConditionNode') {
      node.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
      node.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    } else {
      node.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
    }

    if (nodeType === 'ReadInputNode') {
      node.removeInput('input'); // Start node usually doesn't need input
    }

    await this.editor.addNode(node);

    // Initialize config entry
    this.nodeConfigs[node.id] = { name: node.label, config: {} };

    // Place node at center of view
    const center = this.area.area.pointer;
    await this.area.translate(node.id, { x: center.x, y: center.y });
  }

  updateArgs(jsonString: string, nodeId: string) {
    try {
      this.nodeConfigs[nodeId].config.args = JSON.parse(jsonString);
    } catch (e) {
      // Handle invalid JSON gracefully during typing
    }
  }

  updateTags(jsonString: string, nodeId: string) {
    try {
      this.nodeConfigs[nodeId].config.tags = JSON.parse(jsonString);
    } catch (e) {
       // Handle invalid JSON
    }
  }

  executeDag() {
    const dag = this.serializeDag();
    const mockFilePath = "tests/test.jpg"; // Path relative to backend root
    this.apiService.executeDag(dag, mockFilePath).subscribe({
      next: (res) => console.log('Execution response:', res),
      error: (err) => console.error('Execution error:', err)
    });
  }

  serializeDag() {
    const nodes = this.editor.getNodes();
    const connections = this.editor.getConnections();

    const dagJson: any = { nodes: {}, edges: [], start_node: null };

    // Determine start node (node with no inputs or explicitly ReadInputNode)
    const readNodes = nodes.filter(n => n.label === 'ReadInputNode');
    if (readNodes.length > 0) {
      dagJson.start_node = readNodes[0].id;
    } else if (nodes.length > 0) {
      dagJson.start_node = nodes[0].id;
    }

    nodes.forEach(node => {
      const config = this.nodeConfigs[node.id];
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
    const dagJson = this.serializeDag();
    let name = prompt("Enter DAG Name:", "My New DAG");
    if (!name) return;

    const payload = {
      name: name,
      description: "",
      json_data: dagJson
    };

    if (this.selectedDagId) {
      // Update
      this.apiService.updateDag(this.selectedDagId, payload).subscribe(() => {
        alert('DAG Updated successfully');
        this.loadDagsList();
      });
    } else {
      // Create
      this.apiService.createDag(payload).subscribe(res => {
        alert('DAG Saved successfully');
        this.selectedDagId = res.id;
        this.loadDagsList();
      });
    }
  }

  async loadDag() {
    if (!this.selectedDagId) return;

    this.apiService.getDag(this.selectedDagId).subscribe(async dagDef => {
      await this.editor.clear();
      this.nodeConfigs = {};
      this.selectedNode = null;

      const dagJson = dagDef.json_data;
      if (!dagJson || !dagJson.nodes) return;

      const nodeMap = new Map<string, any>();

      // Reconstruct nodes
      for (const [id, nodeData] of Object.entries<any>(dagJson.nodes)) {
        const node = new ClassicPreset.Node(nodeData.type);
        node.id = id;

        // Setup inputs/outputs
        if (nodeData.type !== 'ReadInputNode') {
          node.addInput('input', new ClassicPreset.Input(new ClassicPreset.Socket('Data')));
        }

        if (nodeData.type === 'ConditionNode') {
          node.addOutput('true_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
          node.addOutput('false_branch', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        } else {
          node.addOutput('default', new ClassicPreset.Output(new ClassicPreset.Socket('Data')));
        }

        this.nodeConfigs[node.id] = { name: nodeData.name, config: nodeData.config || {} };
        nodeMap.set(id, node);
        await this.editor.addNode(node);
      }

      // Reconstruct edges
      for (const edge of dagJson.edges) {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (sourceNode && targetNode) {
          const conn = new ClassicPreset.Connection(sourceNode, edge.branch, targetNode, 'input');
          await this.editor.addConnection(conn);
        }
      }

      // Basic layout (in real app, you'd want to save coordinates or use an auto-layout plugin)
      let x = 0;
      for (const node of Array.from(nodeMap.values())) {
        await this.area.translate(node.id, { x: x, y: 0 });
        x += 250;
      }

      setTimeout(() => {
        AreaExtensions.zoomAt(this.area, this.editor.getNodes());
      }, 100);
    });
  }
}

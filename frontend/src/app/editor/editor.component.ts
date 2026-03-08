import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements AfterViewInit, OnInit {
  @ViewChild('rete') container!: ElementRef<HTMLElement>;
  logs: string[] = [];
  private logSubscription: Subscription | undefined;
  
  editor = new NodeEditor<Schemes>();

  constructor(private apiService: ApiService, private injector: Injector) {}

  ngOnInit() {
    this.apiService.connectLogsWebSocket();
    this.logSubscription = this.apiService.logs$.subscribe(log => {
      this.logs.push(log);
    });
  }

  ngOnDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
  }

  async ngAfterViewInit() {
    const area = new AreaPlugin<Schemes, AreaExtra>(this.container.nativeElement);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>();
    const render = new AngularPlugin<Schemes, AreaExtra>({ injector: this.injector });

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
      accumulating: AreaExtensions.accumulateOnCtrl()
    });

    render.addPreset(Presets.classic.setup());
    connection.addPreset(ConnectionPresets.classic.setup());

    this.editor.use(area);
    area.use(connection);
    area.use(render);

    AreaExtensions.simpleNodesOrder(area);

    const a = new ClassicPreset.Node('ReadInputNode');
    a.addOutput('a', new ClassicPreset.Output(new ClassicPreset.Socket('Number')));
    await this.editor.addNode(a);

    const b = new ClassicPreset.Node('FFmpegActionNode');
    b.addInput('b', new ClassicPreset.Input(new ClassicPreset.Socket('Number')));
    await this.editor.addNode(b);

    await this.editor.addConnection(new ClassicPreset.Connection(a, 'a', b, 'b'));

    await area.translate(a.id, { x: 0, y: 0 });
    await area.translate(b.id, { x: 270, y: 0 });

    setTimeout(() => {
      AreaExtensions.zoomAt(area, this.editor.getNodes());
    }, 100);
  }

  executeDag() {
    // Basic mock of retrieving JSON DAG for Scenario 2 from editor data
    // In a full application, this would serialize the Rete.js editor nodes
    const dag = {
      "start_node": "node_1",
      "nodes": {
        "node_1": {"type": "ReadInputNode", "name": "Read MP4", "config": {}},
        "node_2": {"type": "FFmpegActionNode", "name": "Streamline Audio", "config": {
            "args": "-map 0:v -map 0:a:0 -c:v copy -c:a aac -b:a 128k",
            "extension": ".mp4"
        }}
      },
      "edges": [
          {"source": "node_1", "target": "node_2", "branch": "default"}
      ]
    };
    
    const mockFilePath = "dummy.mp4"; // Should come from a file picker or input
    this.apiService.executeDag(dag, mockFilePath).subscribe({
      next: (res) => console.log('Execution response:', res),
      error: (err) => console.error('Execution error:', err)
    });
  }
}

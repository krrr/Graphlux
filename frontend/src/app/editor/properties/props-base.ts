import { Directive, inject, Input, signal } from "@angular/core";
import { EditorService } from "../editor.service";


@Directive()
export abstract class PropsBase {
    @Input() nodeId!: string;
    config = signal<any>({});
    editorService = inject(EditorService);

    ngOnChanges(): void {
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }

    updateConfig(field: string, value: any) {
        this.editorService.updateNodeConfig(this.nodeId, field, value);
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }
}
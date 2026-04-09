import { Directive, SimpleChanges, inject, Input, signal } from "@angular/core";
import { EditorService } from "../editor.service";


@Directive()
export abstract class PropsBase {
    @Input() nodeId!: string;
    config = signal<any>({});
    editorService = inject(EditorService);

    ngOnChanges(changes: SimpleChanges): void {
        this.config.set(this.editorService.getNodeConfig(this.nodeId));
    }

    updateConfig(field: string, value: any) {
        this.editorService.updateNodeConfig(this.nodeId, field, value);
        this.config.update((configs) => ({
            ...configs,
            [field]: value
        }));
    }
}
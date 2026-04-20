import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzListModule } from 'ng-zorro-antd/list';
import { ApiService } from '../../api.service';
import { COMMON_IMPORTS } from '../../shared-imports';
import { lastValueFrom } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
}

@Component({
    selector: 'app-file-dialog',
    standalone: true,
    imports: [NzModalModule, NzListModule, ...COMMON_IMPORTS, TranslocoModule ],
    templateUrl: './file-dialog.component.html',
    styleUrls: ['./file-dialog.component.scss'],
})
export class FileDialogComponent implements OnInit {
    @Input() mode: 'file' | 'folder' = 'folder';
    @Input() isVisible = false;
    @Input() currentPath: string | null = null;

    @Output() isVisibleChange = new EventEmitter<boolean>();
    @Output() fileSelected = new EventEmitter<string>();

    items = signal<FileItem[]>([]);
    loading = signal(false);
    selectedPath = signal<string | null>(null);

    apiService = inject(ApiService);
    translocoService = inject(TranslocoService);

    ngOnInit(): void {
        if (this.isVisible) {
            this.loadDirectory(this.currentPath || undefined);
        }
    }

    ngOnChanges(changes: any) {
        if (changes.isVisible && changes.isVisible.currentValue === true) {
            this.loadDirectory(this.currentPath || undefined);
            this.selectedPath.set(null);
        }
    }

    async loadDirectory(path?: string) {
        this.loading.set(true);
        try {
            var data = await lastValueFrom(this.apiService.listDirectory(path));
        } catch (err) {
            console.error('Failed to load directory', err);
            // Fallback to roots on error
            this.loadDirectory(undefined);
            return;
        } finally {
            this.loading.set(false);
        }

        if (this.mode === 'folder') {
            this.items.set(data.filter((item) => item.is_dir));
        } else {
            this.items.set(data);
        }
        if (path) {
            this.currentPath = path;
        } else {
            // For roots
            this.currentPath = null;
        }
        this.selectedPath.set(null);
    }

    goUp() {
        if (!this.currentPath) return;

        // Remove trailing slash for path processing
        let p = this.currentPath;
        if (p.endsWith('/') || p.endsWith('\\')) {
            p = p.substring(0, p.length - 1);
        }

        const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
        if (lastSlash > 0) {
            let nextPath = p.substring(0, lastSlash);
            // If navigating up from C:\Windows leaves just "C:", add a slash
            if (nextPath.match(/^[a-zA-Z]:$/)) {
                nextPath += '\\';
            }
            this.loadDirectory(nextPath);
        } else if (lastSlash === 0) {
            // Unix root
            this.loadDirectory('/');
        } else {
            // Windows drive root or unknown, go to roots
            this.loadDirectory(undefined);
        }
    }

    onItemDoubleClick(item: FileItem) {
        if (item.is_dir) {
            this.loadDirectory(item.path);
        }
    }

    onItemClick(item: FileItem) {
        this.selectedPath.set(item.path);
    }

    handleOk(): void {
        let pathToEmit = this.selectedPath();
        if (!pathToEmit && this.mode === 'folder' && this.currentPath) {
            pathToEmit = this.currentPath;
        }

        if (pathToEmit) {
            this.fileSelected.emit(pathToEmit);
        }

        this.isVisible = false;
        this.isVisibleChange.emit(this.isVisible);
    }

    handleCancel(): void {
        this.isVisible = false;
        this.isVisibleChange.emit(this.isVisible);
    }

    onPathInputChange(path: string) {
        if (!path) {
            this.currentPath = this.translocoService.translate('file_dialog.system_roots');
        } else {
            this.currentPath = path;
        }
        this.selectedPath.set(path);
        this.loadDirectory(path).then(() => {
            console.log(this.items());
            
        });
    }
}

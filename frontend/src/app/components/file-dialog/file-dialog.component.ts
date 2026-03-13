import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ApiService } from '../../api.service';

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
}

@Component({
    selector: 'app-file-dialog',
    standalone: true,
    imports: [CommonModule, NzModalModule, NzListModule, NzButtonModule, NzIconModule, NzInputModule],
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

    constructor(private apiService: ApiService) {}

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

    loadDirectory(path?: string) {
        this.loading.set(true);
        this.apiService.listDirectory(path).subscribe({
            next: (data) => {
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
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load directory', err);
                this.loading.set(false);
                // Fallback to roots on error
                this.loadDirectory(undefined);
            },
        });
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
}

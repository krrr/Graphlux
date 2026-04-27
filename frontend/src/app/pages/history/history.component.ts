import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { COMMON_IMPORTS } from '../../shared-imports';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { TranslocoService } from '@jsverse/transloco';
import { Task } from '../../interfaces/task.interface';
import { Folder } from '../../interfaces/folder.interface';
import { lastValueFrom, Subscription } from 'rxjs';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { LogViewerComponent } from '../../components/log-viewer/log-viewer.component';

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzSelectModule,
        NzTableModule,
        NzTagModule,
        NzTooltipModule,
        NzBadgeModule,
        NzModalModule,
        NzSpaceModule,
        NzRadioModule,
        LogViewerComponent,
        ...COMMON_IMPORTS
    ],
    templateUrl: './history.component.html',
    styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
    apiService = inject(ApiService);
    private modal = inject(NzModalService);
    private translocoService = inject(TranslocoService);

    viewMode = signal<'history' | 'logs'>('history');

    tasks = toSignal(this.apiService.getTasks(), { initialValue: [] as Task[] });
    taskMap = computed(() => new Map(this.tasks().map((task) => [task.id, task])));
    folders = toSignal(this.apiService.getFolders(), { initialValue: [] as Folder[] });
    folderMap = computed(() => new Map(this.folders().map((folder) => [folder.id, folder])));
    items = signal<any[]>([]);
    total = signal(0);
    loading = signal(false);
    pageIndex = signal(1);
    pageSize = signal(20);

    filterTaskId = signal<number | null>(null);
    filterFolderId = signal<number | null>(null);

    // Log viewer
    logLevel = signal<string | null>(null);
    logViewer = viewChild<LogViewerComponent>("logViewer");

    ngOnInit() {
        this.loadHistory();
    }

    onViewModeChange(mode: 'history' | 'logs') {
        if (mode === 'history') {
            this.loadHistory(1);
        }
    }

    loadHistory(page: number = this.pageIndex()) {
        this.pageIndex.set(page);
        this.loading.set(true);
        this.apiService.getHistory(this.filterTaskId() || undefined, this.filterFolderId() || undefined,
            this.pageIndex(), this.pageSize()).subscribe({
                next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    clearHistory() {
        this.modal.confirm({
            nzTitle: this.translocoService.translate('history.clear_confirm'),
            nzOkDanger: true,
            nzOnOk: async () => {
                this.loading.set(true);
                try {
                    await lastValueFrom(this.apiService.clearHistory());
                    this.loadHistory(1);
                } finally {
                    this.loading.set(false);
                }
            }
        });
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'success': return 'success';
            case 'failed': return 'error';
            case 'running': return 'processing';
            default: return 'default';
        }
    }

    basename(path: string): string {
        if (!path) return '';
        return path.split(/[\\\/]/).pop() || '';
    }

    formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

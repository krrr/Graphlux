import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { COMMON_IMPORTS } from '../../shared-imports';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableFilterList, NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { TranslocoService } from '@jsverse/transloco';
import { Task } from '../../interfaces/task.interface';
import { isEqual } from 'lodash-es';
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
    pageSize = signal(15);

    currentFilters: { taskId?: number; folderId?: number; sizeMode?: string } = {};

    tableFilters: NzTableFilterList = [
        { text: this.translocoService.translate('history.size_decreased'), value: 'decreased', byDefault: false },
        { text: this.translocoService.translate('history.size_increased'), value: 'increased' },
        { text: this.translocoService.translate('history.size_none'), value: 'none' }
    ]
    taskFilters = computed<NzTableFilterList>(() => this.tasks().map(t => ({ text: t.name, value: t.id })));
    folderFilters = computed<NzTableFilterList>(() => this.folders().map(f => ({ text: f.name, value: f.id })));

    // Log viewer
    logLevel = signal<string | null>(null);
    logViewer = viewChild<LogViewerComponent>("logViewer");
    errorTpl = viewChild<TemplateRef<{ $implicit: any }>>('errorTpl');

    ngOnInit() {
        // loadData will be called by onQueryParamsChange on init
    }

    onViewModeChange(mode: 'history' | 'logs') {
        if (mode === 'history') {
            this.pageIndex.set(1);
        }
    }

    onQueryParamsChange(params: NzTableQueryParams): void {
        const { pageSize, pageIndex, filter } = params;
        this.pageSize.set(pageSize);
        
        let newFilters = {
            sizeMode: filter.find(f => f.key === 'size')?.value || undefined,
            taskId: filter.find(f => f.key === 'task')?.value || undefined,
            folderId: filter.find(f => f.key === 'folder')?.value || undefined
        };
        
        if (!isEqual(newFilters, this.currentFilters)) {
            this.pageIndex.set(1); // reset to first page if filters changed
        } else {
            this.pageIndex.set(pageIndex);
        }
        this.currentFilters = newFilters;
        
        this.loadHistory();
    }

    loadHistory() {
        this.loading.set(true);
        this.apiService.getHistory(
            this.currentFilters.taskId, 
            this.currentFilters.folderId,
            this.pageIndex(), 
            this.pageSize(), 
            this.currentFilters.sizeMode
        ).subscribe({
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
                    this.items.set([]);
                    this.total.set(0);
                    this.pageIndex.set(1);
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

    formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message: string) {
        let parsed: any = [{time: 0, message: 'Failed parsing message', level: 'ERROR'}];
        try {
            parsed = JSON.parse(message);
        } catch { }

        let comp = this.modal.create({
            nzTitle: this.translocoService.translate('history.error_detail'),
            nzContent: this.errorTpl(),
            nzData: parsed,
            nzWidth: 900,
            nzFooter: [{label: this.translocoService.translate('common.close'), key: 'close', onClick: () => comp.close()}],
            nzMaskClosable: true
        });
    }
}

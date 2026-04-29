import { Component, computed, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { LogMessage } from '../../interfaces/log-message.interface';
import { Subscription } from 'rxjs';
import { ApiService } from '../../api.service';
import { COMMON_IMPORTS } from '../../shared-imports';

@Component({
    selector: 'app-log-viewer',
    standalone: true,
    imports: [...COMMON_IMPORTS],
    templateUrl: './log-viewer.component.html',
    styleUrls: ['./log-viewer.component.scss']
})
export class LogViewerComponent implements OnInit, OnDestroy {
    apiService = inject(ApiService);
    private logSub?: Subscription;
    rawLogs = signal<LogMessage[]>([]);
    logLevel = input<string | null>('ALL');
    

    filteredLogs = computed(() => {
        const level = this.logLevel();
        const logs = this.rawLogs();
        if (level == null || level === 'ALL') return logs;
        
        const minPriority = LEVEL_PRIORITY[level] ?? 0;
        return logs.filter(l => (LEVEL_PRIORITY[l.level] ?? 0) >= minPriority);
    });


    constructor() {
        // Automatically scroll to bottom whenever logs change
        effect(() => {
            this.filteredLogs();
            this.scrollToBottom();
        });
    }

    ngOnInit(): void {
        this.connectLogs();
    }

    ngOnDestroy() {
        this.disconnectLogs();
    }

    private scrollToBottom() {
        // Auto scroll to bottom (using setTimeout to wait for DOM update)
        setTimeout(() => {
            const viewer = document.querySelector('.log-viewer');
            if (viewer) {
                viewer.scrollTop = viewer.scrollHeight;
            }
        }, 0);
    }

    connectLogs() {
        this.apiService.getLogHistory().subscribe(history => {
            this.rawLogs.set(history);
            this.scrollToBottom();
        });

        this.apiService.connectLogsWebSocket();
        this.logSub = this.apiService.logs$.subscribe(data => {
            this.rawLogs.update(logs => [...logs, data].slice(-1000));
            this.scrollToBottom();
        });
    }

    disconnectLogs() {
        if (this.logSub) {
            this.logSub.unsubscribe();
            this.logSub = undefined;
        }
        this.apiService.disconnectLogsWebSocket();
    }

    clearLogs() {
        this.apiService.clearLogs().subscribe(() => {
            this.rawLogs.set([]);
        });
    }

}


    const LEVEL_PRIORITY: Record<string, number> = {
        'DEBUG': 0,
        'INFO': 1,
        'WARNING': 2,
        'ERROR': 3,
    };
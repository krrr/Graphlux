import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop'
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Folder } from './interfaces/folder.interface';
import { Task } from './interfaces/task.interface';

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    private socket: WebSocket | null = null;
    public logs$ = new Subject<any>();
    private http = inject(HttpClient);
    public appInfo = toSignal(this.getAppInfo());

    constructor() {}

    executeTask(task: any, filePath: string, taskId?: number) {
        return this.http.post<any>('/api/execute', { task, task_id: taskId, file_path: filePath });
    }

    getTasks() {
        return this.http.get<Task[]>('/api/tasks');
    }

    getTask(id: number) {
        return this.http.get<Task>(`/api/tasks/${id}`);
    }

    createTask(task: any) {
        return this.http.post<Task>('/api/tasks', task);
    }

    updateTask(id: number, task: any) {
        return this.http.put<Task>(`/api/tasks/${id}`, task);
    }

    deleteTask(id: number) {
        return this.http.delete<any>(`/api/tasks/${id}`);
    }

    getFolders() {
        return this.http.get<Folder[]>('/api/folders');
    }

    createFolder(folder: any) {
        return this.http.post<Folder>('/api/folders', folder);
    }

    updateFolder(id: number, folder: any) {
        return this.http.put<Folder>(`/api/folders/${id}`, folder);
    }

    deleteFolder(id: number) {
        return this.http.delete<any>(`/api/folders/${id}`);
    }

    getHistory(task_id?: number, folder_id?: number, page?: number, page_size?: number) {
        return this.http.get<{ total: number; items: any[] }>('/api/history', {params:
            filterEmptyAttr({ task_id, folder_id, page, page_size})});
    }

    clearHistory() {
        return this.http.delete<any>('/api/history');
    }

    getLogHistory(): Observable<any[]> {
        return this.http.get<any[]>('/api/logs/history');
    }

    getSettings(): Observable<any> {
        return this.http.get<any>('/api/settings');
    }

    getAppInfo() {
        return this.http.get<{ version: string; is_packaged: boolean }>('/api/info');
    }

    updateSettings(settings: any): Observable<any> {
        return this.http.put('/api/settings', settings);
    }

    listDirectory(path?: string, showHidden: boolean = false): Observable<any[]> {
        let url = '/api/fs/list';
        let params: string[] = [];
        if (path) params.push(`path=${encodeURIComponent(path)}`);
        if (showHidden) params.push(`showHidden=true`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        return this.http.get<any[]>(url);
    }

    connectLogsWebSocket(): void {
        if (this.socket) {
            this.socket.close();
        }
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/logs`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.logs$.next(data);
            } catch (e) {
                console.error('Error parsing log message:', e);
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onclose = () => {
            console.log('WebSocket connection closed.');
        };
    }

    disconnectLogsWebSocket(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}


function filterEmptyAttr(obj: { [key: string]: any }) {
    let ret: { [key: string]: any } = {};
    for (let key in obj) {
        if (obj[key] != null) {
            ret[key] = obj[key];
        }
    }

    return ret;
}
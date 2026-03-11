import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    private socket: WebSocket | null = null;
    public logs$ = new Subject<string>();

    constructor(private http: HttpClient) {}

    executeTask(task: any, filePath: string, taskId?: number): Observable<any> {
        return this.http.post('/api/execute', { task, task_id: taskId, file_path: filePath });
    }

    getTasks(): Observable<any[]> {
        return this.http.get<any[]>('/api/tasks');
    }

    getTask(id: number): Observable<any> {
        return this.http.get<any>(`/api/tasks/${id}`);
    }

    createTask(task: any): Observable<any> {
        return this.http.post('/api/tasks', task);
    }

    updateTask(id: number, task: any): Observable<any> {
        return this.http.put(`/api/tasks/${id}`, task);
    }

    deleteTask(id: number): Observable<any> {
        return this.http.delete(`/api/tasks/${id}`);
    }

    getFolders(): Observable<any[]> {
        return this.http.get<any[]>('/api/folders');
    }

    createFolder(folder: any): Observable<any> {
        return this.http.post('/api/folders', folder);
    }

    updateFolder(id: number, folder: any): Observable<any> {
        return this.http.put(`/api/folders/${id}`, folder);
    }

    deleteFolder(id: number): Observable<any> {
        return this.http.delete(`/api/folders/${id}`);
    }

    getSettings(): Observable<any> {
        return this.http.get<any>('/api/settings');
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
        const wsUrl = `ws://${window.location.host}/api/logs`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onmessage = (event) => {
            this.logs$.next(event.data);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onclose = () => {
            console.log('WebSocket connection closed.');
        };
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private socket: WebSocket | null = null;
  public logs$ = new Subject<string>();

  constructor(private http: HttpClient) {}

  executeDag(dag: any, filePath: string, dagId?: number): Observable<any> {
    return this.http.post('/api/execute', { dag, dag_id: dagId, file_path: filePath });
  }

  getDags(): Observable<any[]> {
    return this.http.get<any[]>('/api/dags');
  }

  getDag(id: number): Observable<any> {
    return this.http.get<any>(`/api/dags/${id}`);
  }

  createDag(dag: any): Observable<any> {
    return this.http.post('/api/dags', dag);
  }

  updateDag(id: number, dag: any): Observable<any> {
    return this.http.put(`/api/dags/${id}`, dag);
  }

  deleteDag(id: number): Observable<any> {
    return this.http.delete(`/api/dags/${id}`);
  }

  getTasks(): Observable<any[]> {
    return this.http.get<any[]>('/api/tasks');
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

  getSettings(): Observable<any> {
    return this.http.get<any>('/api/settings');
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.put('/api/settings', settings);
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

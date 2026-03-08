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

  executeDag(dag: any, filePath: string): Observable<any> {
    return this.http.post('/api/execute', { dag, file_path: filePath });
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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { LogViewerComponent } from './log-viewer.component';
import { ApiService } from '../../api.service';
import { COMMON_TEST_PROVIDERS } from '../../test-shared';

describe('LogViewerComponent', () => {
    let component: LogViewerComponent;
    let fixture: ComponentFixture<LogViewerComponent>;
    let apiServiceSpy: any;
    let logsSubject: Subject<any>;

    beforeEach(async () => {
        logsSubject = new Subject<any>();
        apiServiceSpy = {
            getLogHistory: vi.fn().mockReturnValue(of([])),
            connectLogsWebSocket: vi.fn(),
            disconnectLogsWebSocket: vi.fn(),
            clearLogs: vi.fn().mockReturnValue(of(null)),
            logs$: logsSubject.asObservable()
        };

        await TestBed.configureTestingModule({
            imports: [LogViewerComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ApiService, useValue: apiServiceSpy },
                ...COMMON_TEST_PROVIDERS
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LogViewerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should connect to logs on init', () => {
        expect(apiServiceSpy.getLogHistory).toHaveBeenCalled();
        expect(apiServiceSpy.connectLogsWebSocket).toHaveBeenCalled();
    });

    it('should update logs when new message arrives', () => {
        const logObj = { time: '2026-04-26T12:34:56.789Z', level: 'INFO', message: 'Test message' };
        logsSubject.next(logObj);

        expect(component.rawLogs().length).toBe(1);
        expect(component.rawLogs()[0].message).toBe('Test message');
    });

    it('should filter logs by level', () => {
        fixture.componentRef.setInput('logLevel', 'ERROR');
        fixture.detectChanges();

        logsSubject.next({ time: '2026-04-26T12:00:00Z', level: 'INFO', message: 'info msg' });
        logsSubject.next({ time: '2026-04-26T12:00:01Z', level: 'ERROR', message: 'error msg' });

        expect(component.filteredLogs().length).toBe(1);
        expect(component.filteredLogs()[0].level).toBe('ERROR');
    });

    it('should clear logs', () => {
        logsSubject.next({ time: '2026-04-26T12:00:00Z', level: 'INFO', message: 'info msg' });
        expect(component.rawLogs().length).toBe(1);

        component.clearLogs();
        expect(component.rawLogs().length).toBe(0);
    });

    it('should disconnect on destroy', () => {
        component.ngOnDestroy();
        expect(apiServiceSpy.disconnectLogsWebSocket).toHaveBeenCalled();
    });
});

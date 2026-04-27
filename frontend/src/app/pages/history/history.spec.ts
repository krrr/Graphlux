import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { HistoryComponent } from './history.component';
import { ApiService } from '../../api.service';
import { COMMON_TEST_PROVIDERS, getTranslocoModule } from '../../test-shared';

describe('HistoryComponent', () => {
    let component: HistoryComponent;
    let fixture: ComponentFixture<HistoryComponent>;
    let apiServiceSpy: any;

    const mockHistory = {
        total: 1,
        items: [
            {
                id: 1,
                task_id: 1,
                folder_id: 1,
                input_path: '/test/file.jpg',
                input_size: 1024,
                output_size: 512,
                status: 'success',
                start_time: '2026-04-26T12:00:00'
            }
        ]
    };

    const mockTasks = [{ id: 1, name: 'Task 1' }];
    const mockFolders = [{ id: 1, name: 'Folder 1' }];

    beforeEach(async () => {
        apiServiceSpy = {
            getHistory: vi.fn().mockReturnValue(of(mockHistory)),
            getTasks: vi.fn().mockReturnValue(of(mockTasks)),
            getFolders: vi.fn().mockReturnValue(of(mockFolders)),
            clearHistory: vi.fn().mockReturnValue(of({})),
            getLogHistory: vi.fn().mockReturnValue(of([])),
            connectLogsWebSocket: vi.fn(),
            disconnectLogsWebSocket: vi.fn(),
            logs$: of()
        };

        await TestBed.configureTestingModule({
            imports: [HistoryComponent, NoopAnimationsModule, getTranslocoModule()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: ApiService, useValue: apiServiceSpy },
                ...COMMON_TEST_PROVIDERS
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(HistoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load history on init', () => {
        expect(apiServiceSpy.getHistory).toHaveBeenCalled();
        expect(component.items()).toEqual(mockHistory.items);
    });

    it('should switch between history and logs mode', () => {
        expect(component.viewMode()).toBe('history');
        
        component.viewMode.set('logs');
        component.onViewModeChange('logs');
        expect(component.viewMode()).toBe('logs');

        component.viewMode.set('history');
        component.onViewModeChange('history');
        expect(component.viewMode()).toBe('history');
    });

    it('should filter history', () => {
        component.filterTaskId.set(1);
        component.loadHistory(1);
        expect(apiServiceSpy.getHistory).toHaveBeenCalledWith(1, undefined, 1, component.pageSize());

        component.filterFolderId.set(2);
        component.loadHistory(1);
        expect(apiServiceSpy.getHistory).toHaveBeenCalledWith(1, 2, 1, component.pageSize());
    });
});

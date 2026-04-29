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
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

describe('HistoryComponent', () => {
    let component: HistoryComponent;
    let fixture: ComponentFixture<HistoryComponent>;
    let apiServiceSpy: any;
    let modalServiceSpy: any;

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

        modalServiceSpy = {
            confirm: vi.fn().mockImplementation((config) => {
                if (config.nzOnOk) {
                    config.nzOnOk();
                }
            })
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
        })
        .overrideComponent(HistoryComponent, {
            add: {
                providers: [
                    { provide: NzModalService, useValue: modalServiceSpy }
                ]
            }
        })
        .compileComponents();

        fixture = TestBed.createComponent(HistoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize tasks and folders', () => {
        expect(component.tasks()).toEqual(mockTasks);
        expect(component.folders()).toEqual(mockFolders);
        expect(component.taskMap().get(1)).toEqual(mockTasks[0]);
        expect(component.folderMap().get(1)).toEqual(mockFolders[0]);
    });

    it('should switch between history and logs mode', () => {
        expect(component.viewMode()).toBe('history');
        
        component.viewMode.set('logs');
        component.onViewModeChange('logs');
        expect(component.viewMode()).toBe('logs');

        component.viewMode.set('history');
        component.onViewModeChange('history');
        expect(component.viewMode()).toBe('history');
        expect(component.pageIndex()).toBe(1);
    });

    it('should handle onQueryParamsChange and load history', () => {
        const queryParams: NzTableQueryParams = {
            pageIndex: 2,
            pageSize: 10,
            sort: [],
            filter: [
                { key: 'size', value: 'decreased' },
                { key: 'task', value: 1 }
            ]
        };

        component.onQueryParamsChange(queryParams);

        expect(component.pageSize()).toBe(10);
        expect(component.pageIndex()).toBe(1); // Reset because filter changed
        expect(component.currentFilters.sizeMode).toBe('decreased');
        expect(component.currentFilters.taskId).toBe(1);
        expect(apiServiceSpy.getHistory).toHaveBeenCalled();
    });

    it('should not reset pageIndex if filters are the same', () => {
        component.currentFilters = { sizeMode: 'decreased', taskId: 1, folderId: undefined };
        const queryParams: NzTableQueryParams = {
            pageIndex: 3,
            pageSize: 15,
            sort: [],
            filter: [
                { key: 'size', value: 'decreased' },
                { key: 'task', value: 1 }
            ]
        };

        component.onQueryParamsChange(queryParams);
        expect(component.pageIndex()).toBe(3);
    });

    it('should load history and update signals', () => {
        component.loadHistory();
        expect(apiServiceSpy.getHistory).toHaveBeenCalled();
        expect(component.items()).toEqual(mockHistory.items);
        expect(component.total()).toBe(mockHistory.total);
    });

    it('should clear history after confirmation', async () => {
        component.clearHistory();
        
        expect(modalServiceSpy.confirm).toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(apiServiceSpy.clearHistory).toHaveBeenCalled();
            expect(component.pageIndex()).toBe(1);
        });
    });
});

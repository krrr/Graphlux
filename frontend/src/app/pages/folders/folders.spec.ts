import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NzMessageService } from 'ng-zorro-antd/message';

import { FoldersComponent } from './folders.component';
import { ApiService } from '../api.service';
import { createDefaultFolderForm, Folder, FolderForm } from '../interfaces/folder.interface';

describe('Folders', () => {
    let component: FoldersComponent;
    let fixture: ComponentFixture<FoldersComponent>;
    let apiServiceSpy: any;
    let messageServiceSpy: any;

    const mockFolders: Folder[] = [
        { id: 1, name: 'Folder 1', watch_folder: '/path1', status: 'active', tasks: [{ id: 1, name: 'Task 1' }], scan_interval: 60, real_time_watch: true },
        { id: 2, name: 'Folder 2', watch_folder: '/path2', status: 'paused', tasks: [{ id: 2, name: 'Task 2' }], scan_interval: 120, real_time_watch: false }
    ];

    const mockTasks = [
        { id: 1, name: 'Task 1' },
        { id: 2, name: 'Task 2' }
    ];

    beforeEach(async () => {
        apiServiceSpy = {
            getFolders: vi.fn().mockReturnValue(of(mockFolders)),
            getTasks: vi.fn().mockReturnValue(of(mockTasks)),
            createFolder: vi.fn().mockReturnValue(of({})),
            updateFolder: vi.fn().mockReturnValue(of({})),
            deleteFolder: vi.fn().mockReturnValue(of({})),
            listDirectory: vi.fn().mockReturnValue(of([]))
        };

        messageServiceSpy = {
            success: vi.fn(),
            warning: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [FoldersComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: ApiService, useValue: apiServiceSpy },
                { provide: NzMessageService, useValue: messageServiceSpy }
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(FoldersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load folders and tasks on init', () => {
        expect(apiServiceSpy.getFolders).toHaveBeenCalled();
        expect(apiServiceSpy.getTasks).toHaveBeenCalled();
        expect(component.folders()).toEqual(mockFolders);
        expect(component.tasks()).toEqual(mockTasks);
    });

    it('should show modal for creating new folder', () => {
        component.showModal();
        expect(component.isEditing()).toBe(false);
        expect(component.editingFolderId()).toBeNull();
        expect(component.isModalVisible()).toBe(true);
        expect(component.folderForm().task_ids).toEqual([]); 
    });

    it('should show modal for editing existing folder', () => {
        component.showModal(mockFolders[0]);
        expect(component.isEditing()).toBe(true);
        expect(component.editingFolderId()).toBe(1);
        expect(component.isModalVisible()).toBe(true);
        expect(component.folderForm().name).toBe('Folder 1');
    });

    it('should handle Ok to create folder', () => {
        component.showModal();
        const folderData = {
            name: 'New Folder',
            watch_folder: '/new/path',
            status: 'active' as const,
            task_ids: [1],
            scan_interval: 60,
            real_time_watch: true,
            filename_regex: ''
        } as FolderForm;
        component.folderForm.set(folderData);

        component.handleOk();

        const expectedPayload = {
            folder: {...folderData, task_ids: undefined},
            task_ids: folderData.task_ids
        };

        expect(apiServiceSpy.createFolder).toHaveBeenCalledWith(expectedPayload);
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Folder created');
        expect(component.isModalVisible()).toBe(false);
    });

    it('should handle Ok to update folder', () => {
        component.showModal(mockFolders[0]);
        component.handleOk();

        const currentForm = component.folderForm();
        const expectedPayload = {
            folder: { ...currentForm, task_ids: undefined },
            task_ids: currentForm.task_ids
        };

        expect(apiServiceSpy.updateFolder).toHaveBeenCalledWith(1, expectedPayload);
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Folder updated');
        expect(component.isModalVisible()).toBe(false);
    });

    it('should require mandatory fields on handleOk', () => {
        component.showModal();
        component.folderForm.set(createDefaultFolderForm());

        component.handleOk();

        expect(messageServiceSpy.warning).toHaveBeenCalledWith('Please fill all required fields (Name, Watch Folder, Task)');
        expect(apiServiceSpy.createFolder).not.toHaveBeenCalled();
    });

    it('should delete folder', () => {
        component.deleteFolder(1);
        expect(apiServiceSpy.deleteFolder).toHaveBeenCalledWith(1);
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Folder deleted');
    });

    it('should toggle folder status', () => {
        component.toggleFolderStatus(mockFolders[0]); // active -> paused
        expect(apiServiceSpy.updateFolder).toHaveBeenCalledWith(1, {
            folder: { ...mockFolders[0], status: 'paused' },
            task_ids: [1]
        });
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Folder paused');

        component.toggleFolderStatus(mockFolders[1]); // paused -> active
        expect(apiServiceSpy.updateFolder).toHaveBeenCalledWith(2, {
            folder: { ...mockFolders[1], status: 'active' },
            task_ids: [2]
        });
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Folder resumed');
    });
});

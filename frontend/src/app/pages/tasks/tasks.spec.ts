import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TasksComponent } from './tasks.component';
import { ApiService } from '../../api.service';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { EditOutline, DeleteOutline, PlusOutline, MoreOutline, FolderOutline } from '@ant-design/icons-angular/icons';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { COMMON_TEST_PROVIDERS, getTranslocoModule, messageServiceSpy } from '../../test-shared';

describe('TasksComponent', () => {
    let component: TasksComponent;
    let fixture: ComponentFixture<TasksComponent>;
    let apiServiceSpy: any;
    let modalServiceSpy: any;
    let routerSpy: any;

    const mockTasks = [
        { id: 1, name: 'Task 1', description: 'Desc 1', icon: '🪄', folders: [] },
        { id: 2, name: 'Task 2', description: 'Desc 2', icon: '⚙️', folders: [] }
    ];

    beforeEach(async () => {
        apiServiceSpy = {
            getTasks: vi.fn().mockReturnValue(of(mockTasks)),
            createTask: vi.fn().mockReturnValue(of({})),
            updateTask: vi.fn().mockReturnValue(of({})),
            deleteTask: vi.fn().mockReturnValue(of({}))
        };

        modalServiceSpy = {
            confirm: vi.fn()
        };

        routerSpy = {
            navigate: vi.fn(),
            events: of(new NavigationEnd(0, 'http://localhost', 'http://localhost')),
        };

        await TestBed.configureTestingModule({
            imports: [TasksComponent, NoopAnimationsModule, NzMenuModule, NzDropdownModule, getTranslocoModule()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                provideNzIcons([EditOutline, DeleteOutline, PlusOutline, MoreOutline, FolderOutline]),
                ...COMMON_TEST_PROVIDERS,
                { provide: ApiService, useValue: apiServiceSpy },
                { provide: Router, useValue: routerSpy }
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TasksComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load tasks on init', () => {
        expect(apiServiceSpy.getTasks).toHaveBeenCalled();
        expect(component.tasks()).toEqual(mockTasks);
    });

    it('should show modal for creating new task', () => {
        component.showModal();
        expect(component.isEditing()).toBe(false);
        expect(component.editingTaskId()).toBeNull();
        expect(component.isModalVisible()).toBe(true);
        expect(component.taskForm()).toEqual({ name: '', description: '', icon: '🪄' });
    });

    it('should show modal for editing existing task', () => {
        component.showModal(mockTasks[0]);
        expect(component.isEditing()).toBe(true);
        expect(component.editingTaskId()).toBe(1);
        expect(component.isModalVisible()).toBe(true);
        expect(component.taskForm().name).toBe('Task 1');
    });

    it('should handle Cancel', () => {
        component.isModalVisible.set(true);
        component.handleCancel();
        expect(component.isModalVisible()).toBe(false);
    });

    it('should handle Ok to create task', () => {
        component.showModal();
        component.updateForm('name', 'New Task');
        component.updateForm('description', 'New Desc');
        
        component.handleOk();

        const expectedPayload = {
            name: 'New Task',
            description: 'New Desc',
            icon: '🪄',
            json_data: { nodes: {}, edges: [], start_node: null },
        };

        expect(apiServiceSpy.createTask).toHaveBeenCalledWith(expectedPayload);
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Task created');
        expect(component.isModalVisible()).toBe(false);
    });

    it('should handle Ok to update task', () => {
        component.showModal(mockTasks[0]);
        component.updateForm('name', 'Updated Task');
        
        component.handleOk();

        expect(apiServiceSpy.updateTask).toHaveBeenCalledWith(1, { ...mockTasks[0], name: 'Updated Task' });
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Task updated');
        expect(component.isModalVisible()).toBe(false);
    });

    it('should require task name on handleOk', () => {
        component.showModal();
        component.updateForm('name', '');
        
        component.handleOk();

        expect(messageServiceSpy.warning).toHaveBeenCalledWith('Please fill the task name');
        expect(apiServiceSpy.createTask).not.toHaveBeenCalled();
    });

    it('should delete task', () => {
        component.deleteTask(1);
        expect(apiServiceSpy.deleteTask).toHaveBeenCalledWith(1);
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Task deleted');
        expect(apiServiceSpy.getTasks).toHaveBeenCalledTimes(2); // once on init, once after delete
    });

    it('should handle error when deleting task', () => {
        const errorResponse = { status: 400, error: { detail: 'Used by folder' } };
        apiServiceSpy.deleteTask.mockReturnValue(throwError(() => errorResponse));
        
        component.deleteTask(1);
        
        expect(messageServiceSpy.error).toHaveBeenCalledWith('Used by folder');
    });

    it('should navigate to editor', () => {
        component.openEditor(1);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/tasks', 1, 'editor']);
    });

    it('should update form field', () => {
        component.updateForm('icon', '🚀');
        expect(component.taskForm().icon).toBe('🚀');
    });
});

import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { COMMON_IMPORTS } from '../shared-imports';
import { NzTagComponent } from 'ng-zorro-antd/tag';

@Component({
    selector: 'app-tasks',
    standalone: true,
    imports: [
        FormsModule,
        NzCardModule,
        NzModalModule,
        NzFormModule,
        NzInputModule,
        NzIconModule,
        NzGridModule,
        NzDropDownModule,
        ...COMMON_IMPORTS,
        NzTagComponent,
    ],
    templateUrl: './tasks.html',
    styleUrls: ['./tasks.scss'],
})
export class TasksComponent implements OnInit {
    tasks = signal<any[]>([]);
    folders = signal<any[]>([]);

    isModalVisible = signal(false);
    isEditing = signal(false);
    editingTaskId = signal<number | null>(null);

    taskForm = signal({
        name: '',
        description: '',
    });

    constructor(
        private apiService: ApiService,
        private router: Router,
        private message: NzMessageService,
    ) {}

    ngOnInit() {
        this.loadTasks();
        this.loadFolders();
    }

    loadTasks() {
        this.apiService.getTasks().subscribe((tasks) => {
            this.tasks.set(tasks);
        });
    }

    loadFolders() {
        this.apiService.getFolders().subscribe((folders) => {
            this.folders.set(folders);
        });
    }

    getAssociatedFolders(taskId: number): any[] {
        return this.folders().filter((f) => f.task_id === taskId);
    }

    showModal(task?: any) {
        if (task) {
            this.isEditing.set(true);
            this.editingTaskId.set(task.id);
            this.taskForm.set({
                name: task.name,
                description: task.description || '',
            });
        } else {
            this.isEditing.set(false);
            this.editingTaskId.set(null);
            this.taskForm.set({ name: '', description: '' });
        }
        this.isModalVisible.set(true);
    }

    handleCancel() {
        this.isModalVisible.set(false);
    }

    handleOk() {
        const currentForm = this.taskForm();
        if (!currentForm.name) {
            this.message.warning('Please fill the task name');
            return;
        }

        if (this.isEditing() && this.editingTaskId()) {
            this.apiService.updateTask(this.editingTaskId()!, currentForm).subscribe(() => {
                this.message.success('Task updated');
                this.loadTasks();
                this.isModalVisible.set(false);
            });
        } else {
            const taskPayload = {
                name: currentForm.name,
                description: currentForm.description,
                json_data: { nodes: {}, edges: [], start_node: null },
            };

            this.apiService.createTask(taskPayload).subscribe(() => {
                this.message.success('Task created');
                this.loadTasks();
                this.isModalVisible.set(false);
            });
        }
    }

    deleteTask(id: number) {
        this.apiService.deleteTask(id).subscribe({
            next: () => {
                this.message.success('Task deleted');
                this.loadTasks();
            },
            error: (err) => {
                if (err.status === 400) {
                    this.message.error(err.error.detail || 'Cannot delete task used by folders');
                } else {
                    this.message.error('Failed to delete task');
                }
            },
        });
    }

    openEditor(taskId: number) {
        this.router.navigate(['/tasks', taskId, 'editor']);
    }

    updateForm(field: string, value: any) {
        this.taskForm.update((prev) => ({ ...prev, [field]: value }));
    }
}

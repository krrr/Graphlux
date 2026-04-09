import { Component, OnInit, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { Router } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { COMMON_IMPORTS } from '../../shared-imports';
import { FileDialogComponent } from '../../components/file-dialog/file-dialog.component';
import { Folder, FolderForm, createDefaultFolderForm } from '../../interfaces/folder.interface';
import { Task } from '../../interfaces/task.interface';
import { BehaviorSubject, switchMap } from 'rxjs';

@Component({
    selector: 'app-folders',
    standalone: true,
    imports: [
        FormsModule,
        NzTableModule,
        NzModalModule,
        NzFormModule,
        NzInputModule,
        NzPopconfirmModule,
        NzTagModule,
        NzDividerModule,
        NzSelectModule,
        NzCheckboxModule,
        NzTabsModule,
        NzEmptyModule,
        FileDialogComponent,
        ...COMMON_IMPORTS,
    ],
    templateUrl: './folders.component.html',
    styleUrls: ['./folders.component.scss'],
})
export class FoldersComponent implements OnInit {
    private apiService = inject(ApiService);
    private router = inject(Router);
    private message = inject(NzMessageService);

    private refreshFolders$ = new BehaviorSubject<void>(undefined);
    folders = toSignal(
        this.refreshFolders$.pipe(switchMap(() => this.apiService.getFolders())),
        { initialValue: [] as Folder[] }
    ); 
    tasks = signal<any[]>([]);

    isModalVisible = signal(false);
    isEditing = signal(false);
    editingFolderId = signal<number | null>(null);

    isFileDialogVisible = false;

    folderForm = signal<FolderForm>(createDefaultFolderForm());

    constructor() {}

    ngOnInit() {
        this.loadTasks();
    }

    loadTasks() {
        this.apiService.getTasks().subscribe((tasks) => {
            this.tasks.set(tasks);
        });
    }

    showModal(folder?: Folder) {
        if (folder) {
            this.isEditing.set(true);
            this.editingFolderId.set(folder.id!);
            this.folderForm.set({
                name: folder.name,
                watch_folder: folder.watch_folder,
                status: folder.status as 'active' | 'paused',
                task_ids: folder.tasks ? folder.tasks.map((t: Task) => t.id!) : [],
                scan_interval: folder.scan_interval !== undefined ? folder.scan_interval : 60,
                real_time_watch: folder.real_time_watch !== undefined ? folder.real_time_watch : true,
                filename_regex: folder.filename_regex || '',
            });
        } else {
            this.isEditing.set(false);
            this.editingFolderId.set(null);
            this.folderForm.set(createDefaultFolderForm());
        }
        this.isModalVisible.set(true);
    }

    handleCancel() {
        this.isModalVisible.set(false);
    }

    handleOk() {
        const currentForm = this.folderForm();
        if (!currentForm.name || !currentForm.watch_folder || !currentForm.task_ids.length) {
            this.message.warning('Please fill all required fields (Name, Watch Folder, Task)');
            return;
        }

        const payload = {
            folder: { ...currentForm, task_ids: undefined },
            task_ids: currentForm.task_ids
        };
        console.debug('update folder', payload.folder);
        

        if (this.isEditing() && this.editingFolderId()) {
            this.apiService.updateFolder(this.editingFolderId()!, payload).subscribe(() => {
                this.message.success('Folder updated');
                this.refreshFolders$.next();
                this.isModalVisible.set(false);
            });
        } else {
            this.apiService.createFolder(payload).subscribe(() => {
                this.message.success('Folder created');
                this.refreshFolders$.next();
                this.isModalVisible.set(false);
            });
        }
    }

    deleteFolder(id: number) {
        this.apiService.deleteFolder(id).subscribe(() => {
            this.message.success('Folder deleted');
                this.refreshFolders$.next();
        });
    }

    toggleFolderStatus(folder: Folder) {
        const newStatus = folder.status === 'active' ? 'paused' : 'active';
        const payload = {
            folder: { ...folder, tasks: undefined, status: newStatus},
            task_ids: folder.tasks ? folder.tasks.map(t => t.id) : []
        };
        console.log(payload);
        
        this.apiService.updateFolder(folder.id!, payload).subscribe(() => {
            this.message.success(`Folder ${newStatus === 'active' ? 'resumed' : 'paused'}`);
            this.refreshFolders$.next();
        });
    }

    updateForm(field: string, value: any) {
        this.folderForm.update((prev) => ({ ...prev, [field]: value }));
    }

    openFileDialog() {
        this.isFileDialogVisible = true;
    }
}

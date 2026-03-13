import { Routes } from '@angular/router';
import { EditorComponent } from './editor/editor.component';
import { TasksComponent } from './tasks/tasks.component';
import { FoldersComponent } from './folders/folders.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
    { path: '', redirectTo: '/tasks', pathMatch: 'full' },
    { path: 'tasks', component: TasksComponent },
    { path: 'tasks/:taskId/editor', component: EditorComponent },
    { path: 'folders', component: FoldersComponent },
    { path: 'settings', component: SettingsComponent },
];

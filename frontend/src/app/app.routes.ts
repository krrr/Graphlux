import { CanDeactivateFn, Routes } from '@angular/router';
import { EditorComponent } from './pages/tasks/editor/editor.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { FoldersComponent } from './pages/folders/folders.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { HistoryComponent } from './pages/history/history.component';

export const canDeactivateEditor: CanDeactivateFn<EditorComponent> = (component: EditorComponent) => {
    return component.canDeactivate();
};

export const routes: Routes = [
    { path: '', redirectTo: '/tasks', pathMatch: 'full' },
    { path: 'tasks', component: TasksComponent },
    { path: 'tasks/:taskId/editor', component: EditorComponent, canDeactivate: [canDeactivateEditor] },
    { path: 'folders', component: FoldersComponent },
    { path: 'history', component: HistoryComponent },
    { path: 'settings', component: SettingsComponent },
];

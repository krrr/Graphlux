import { Routes } from '@angular/router';
import { EditorComponent } from './editor/editor.component';
import { TasksComponent } from './tasks/tasks';
import { SettingsComponent } from './settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: '/editor', pathMatch: 'full' },
  { path: 'editor', component: EditorComponent },
  { path: 'tasks', component: TasksComponent },
  { path: 'settings', component: SettingsComponent }
];

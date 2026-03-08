import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <div class="app-layout">
      <nav class="sidebar">
        <h2>CyberHamster</h2>
        <ul>
          <li><a routerLink="/editor" routerLinkActive="active">DAG Editor</a></li>
          <li><a routerLink="/tasks" routerLinkActive="active">Tasks</a></li>
          <li><a routerLink="/settings" routerLinkActive="active">Settings</a></li>
        </ul>
      </nav>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      font-family: Arial, sans-serif;
    }
    .sidebar {
      width: 200px;
      background-color: #2c3e50;
      color: white;
      padding: 20px;
    }
    .sidebar h2 {
      margin-top: 0;
      margin-bottom: 30px;
    }
    .sidebar ul {
      list-style-type: none;
      padding: 0;
    }
    .sidebar li {
      margin-bottom: 10px;
    }
    .sidebar a {
      color: #ecf0f1;
      text-decoration: none;
      display: block;
      padding: 10px;
      border-radius: 4px;
    }
    .sidebar a:hover, .sidebar a.active {
      background-color: #34495e;
    }
    .content {
      flex-grow: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AppComponent {
  title = 'frontend';
}

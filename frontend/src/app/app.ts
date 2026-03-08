import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { COMMON_IMPORTS } from './shared-imports';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NzLayoutModule, ...COMMON_IMPORTS],
  template: `
    <nz-layout class="app-layout">
      <nz-sider nzWidth="200px">
        <div class="logo">
          <h2>CyberHamster</h2>
        </div>
        <ul nz-menu nzTheme="dark" nzMode="inline">
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/tasks">Tasks</a>
          </li>
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/folders">Folders</a>
          </li>
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/settings">Settings</a>
          </li>
        </ul>
      </nz-sider>
      <nz-layout>
        <nz-content>
          <div class="inner-content">
            <router-outlet></router-outlet>
          </div>
        </nz-content>
      </nz-layout>
    </nz-layout>
  `,
  styles: [`
    .app-layout {
      height: 100vh;
    }
    .logo {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .logo h2 {
      margin: 0;
      color: white;
      font-size: 18px;
    }
    .inner-content {
      padding: 24px;
      background: #fff;
      height: 100%;
      overflow-y: auto;
    }
    nz-content {
      background: #f0f2f5;
    }
  `]
})
export class AppComponent {
  title = 'frontend';
}

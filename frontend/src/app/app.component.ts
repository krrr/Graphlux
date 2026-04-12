import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { COMMON_IMPORTS } from './shared-imports';
import { ApiService } from './api.service';


@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, NzLayoutModule, ...COMMON_IMPORTS],
    template: `
        <nz-layout class="app-layout">
            <nz-sider nzWidth="200px" nzTheme="light">
                <div class="logo">
                    <img src="favicon.svg" alt="Logo" style="height: 32px; margin-right: 8px;" />
                    <h2>CyberHamster</h2>
                </div>
                <ul nz-menu nzMode="inline">
                    <li nz-menu-item nzMatchRouter>
                        <a routerLink="/tasks"><nz-icon nzType="apartment" /> Tasks</a>
                    </li>
                    <li nz-menu-item nzMatchRouter>
                        <a routerLink="/folders"><nz-icon nzType="folder-open" /> Folders</a>
                    </li>
                    <li nz-menu-item nzMatchRouter>
                        <a routerLink="/settings"><nz-icon nzType="setting" /> Settings</a>
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
            width: 100vw;
            background: hsl(260deg 22.22% 96.47%);
        }
        nz-sider {
            border-right: 1px solid var(--border-color-split);
            ::ng-deep .ant-menu-root {
                border-right: none;
            }
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
            font-size: 18px;
        }
        .inner-content {
            height: 100%;
            overflow: hidden;
        }
        nz-layout {
            background: transparent;
        }
        nz-content {
        }
    `],
})
export class AppComponent implements OnInit {
    apiService = inject(ApiService);

    ngOnInit() {
        this.apiService.appInfo();  // preload, trigger manually
    }
}

import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { COMMON_IMPORTS } from './shared-imports';
import { ApiService } from './api.service';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';


@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, NzLayoutModule, ...COMMON_IMPORTS],
    template: `
        <nz-layout class="app-layout" *transloco="let t">
            <nz-sider nzWidth="200px" [nzTheme]="themeService.isDark() ? 'dark' : 'light'">
                <div class="logo-div">
                    <img src="favicon.svg" alt="Logo" style="height: 32px; margin-right: 8px;" />
                    <h2>Graphlux</h2>
                </div>
                <ul nz-menu nzMode="inline" [nzTheme]="themeService.isDark() ? 'dark' : 'light'">
                    <li nz-menu-item nzMatchRouter>
                        <a routerLink="/tasks"><nz-icon nzType="apartment" /> {{ t('menu.tasks') }}</a>
                    </li>
                    <li nz-menu-item nzMatchRouter>
                        <a routerLink="/folders"><nz-icon nzType="folder-open" /> {{ t('menu.folders') }}</a>
                    </li>
                    <li nz-menu-item nzMatchRouter>
                        <a routerLink="/settings"><nz-icon nzType="setting" /> {{ t('menu.settings') }}</a>
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
            transition: background 0.3s;
        }
        nz-sider {
            border-right: 1px solid var(--border-color-split);
            box-shadow: 2px 0px 4px rgba(0, 0, 0, 0.02);
            ::ng-deep .ant-menu-root {
                border-right: none;
            }
        }
        .logo-div {
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
            border-bottom: 1px solid var(--border-color-split);
            margin-bottom: 8px;
            h2 {
                margin: 0;
                margin-left: 4px;
                font-size: 18px;
            }
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
    langService = inject(LanguageService);
    themeService = inject(ThemeService);

    ngOnInit() {
        this.langService.init();
        this.themeService.loadTheme(true);
        this.apiService.getSettings().subscribe(s => {
            if (s && s.theme) {
                this.themeService.setTheme(s.theme, false);
            }
        });
        this.apiService.appInfo();  // preload, trigger manually
    }
}

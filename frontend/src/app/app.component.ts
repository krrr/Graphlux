import { Component, inject, OnInit, signal, effect } from '@angular/core';
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
            <nz-sider nzCollapsible [nzCollapsed]="isCollapsed()" [nzTrigger]="null" nzWidth="200px"
            [nzTheme]="themeService.isDark() ? 'dark' : 'light'">
                <div class="logo-div" [class.collapsed]="isCollapsed()">
                    <div class="logo-content">
                        <img src="favicon.svg" alt="Logo" style="height: 32px; margin-right: 8px;" />
                        <h2>Graphlux</h2>
                    </div>
                    <div class="flex1">
                    </div>
                    <button nz-button nzType="text" nzSize="small" class="collapse-trigger" (click)="isCollapsed.set(!isCollapsed())">
                        <nz-icon [nzType]="isCollapsed() ? 'icon:sidebar-show' : 'icon:sidebar-hide'" />
                    </button>
                </div>
                <ul nz-menu nzMode="inline" [nzTheme]="themeService.isDark() ? 'dark' : 'light'">
                    <li nz-menu-item nzMatchRouter routerLink="/tasks">
                        <nz-icon nzType="icon:task" />
                        <span> {{ t('menu.tasks') }}</span>
                    </li>
                    <li nz-menu-item nzMatchRouter routerLink="/folders">
                        <nz-icon nzType="folder-open" />
                        <span> {{ t('menu.folders') }}</span>
                    </li>
                    <li nz-menu-item nzMatchRouter routerLink="/history">
                        <nz-icon nzType="history" />
                        <span> {{ t('menu.history') }}</span>
                    </li>
                    <li nz-menu-item nzMatchRouter routerLink="/settings">
                        <nz-icon nzType="setting" />
                        <span > {{ t('menu.settings') }}</span>
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
        }
        nz-sider {
            border-right: 1px solid var(--border-color-split);
            box-shadow: 2px 0px 4px rgba(0, 0, 0, 0.02);
            ::ng-deep .ant-menu-root {
                border-right: none;
            }
            background-image: url('public/kanban.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: bottom;
            // transition: background-color 0s;
        }
        .ant-layout-sider-collapsed {
            background-image: none;      
        }
        .logo-div {
            margin-left: 24px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-color-split);
            margin-bottom: 8px;
            transition: padding 0.3s;

            &.collapsed {
                h2 {
                    display: none;
                }
                .collapse-trigger {
                    opacity: 0.2;
                    margin-right: 0;
                }
                .collapse-trigger:hover {
                    opacity: 0.8;
                }
            }

            .logo-content {
                display: flex;
                align-items: center;
                overflow: hidden;
                white-space: nowrap;
                h2 {
                    margin: 0;
                    margin-left: 4px;
                    font-size: 18px;
                }
            }

            .collapse-trigger {
                margin-right: 6px;
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
    isCollapsed = signal(localStorage.getItem('siderCollapsed') === 'true');

    constructor() {
        effect(() => {
            localStorage.setItem('siderCollapsed', String(this.isCollapsed()));
        });
    }

    ngOnInit() {
        this.langService.init();
        this.themeService.loadTheme(true);
        this.apiService.refreshAppInfo().then(() => {
            if (this.apiService.appInfo()?.settings.theme) {
                this.themeService.setTheme(this.apiService.appInfo()?.settings.theme, false);
            }
        });
    }
}

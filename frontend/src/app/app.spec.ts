import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { ActivatedRoute } from '@angular/router';
import { getTranslocoModule } from './test-shared';
import { FolderOpenOutline, HistoryOutline, SettingOutline } from '@ant-design/icons-angular/icons';
import { ApiService } from './api.service';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('App', () => {
    beforeEach(async () => {
        const apiServiceSpy = {
            getSettings: vi.fn().mockReturnValue(of({ theme: 'light' })),
            appInfo: vi.fn().mockReturnValue(of({ version: '1.0.0', is_packaged: false })),
        };

        const themeServiceSpy = {
            isDark: vi.fn().mockReturnValue(false),
            loadTheme: vi.fn(),
            setTheme: vi.fn(),
        };

        const languageServiceSpy = {
            init: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [AppComponent, getTranslocoModule()],
            providers: [
                provideNzIcons([HistoryOutline, FolderOpenOutline, SettingOutline, {name: 'icon:task', icon: '<svg></svg>'}]),
                {
                    provide: ActivatedRoute,
                    useValue: {},
                },
                { provide: ApiService, useValue: apiServiceSpy },
                { provide: ThemeService, useValue: themeServiceSpy },
                { provide: LanguageService, useValue: languageServiceSpy },
            ],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should render title', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h2')?.textContent).toContain('Graphlux');
    });
});

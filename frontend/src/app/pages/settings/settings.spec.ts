import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { SettingsComponent } from './settings.component';
import { ApiService } from '../../api.service';
import { COMMON_TEST_PROVIDERS, getTranslocoModule, messageServiceSpy } from '../../test-shared';

describe('Settings', () => {
    let component: SettingsComponent;
    let fixture: ComponentFixture<SettingsComponent>;
    let apiServiceSpy: any;

    beforeEach(async () => {
        apiServiceSpy = {
            getSettings: vi.fn().mockReturnValue(of({
                ffmpeg_path: '/usr/bin/ffmpeg',
                imagemagick_path: '/usr/bin/magick'
            })),
            appInfo: vi.fn().mockReturnValue(of({
                is_packaged: false
            })),
            updateSettings: vi.fn().mockReturnValue(of({}))
        };


        await TestBed.configureTestingModule({
            imports: [SettingsComponent, NoopAnimationsModule, getTranslocoModule()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ApiService, useValue: apiServiceSpy },
                ...COMMON_TEST_PROVIDERS
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load settings on init', () => {
        expect(apiServiceSpy.getSettings).toHaveBeenCalled();
        expect(component.settings()).toEqual(expect.objectContaining({
            ffmpeg_path: '/usr/bin/ffmpeg',
            imagemagick_path: '/usr/bin/magick',
            host: '127.0.0.1'
        }));
    });

    it('should save settings', () => {
        component.saveSettings();
        expect(apiServiceSpy.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
            ffmpeg_path: '/usr/bin/ffmpeg',
            imagemagick_path: '/usr/bin/magick',
            host: null
        }));
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Settings saved successfully!');
    });

    it('should update field', () => {
        component.updateField('ffmpeg_path', '/custom/ffmpeg');
        expect(component.settings().ffmpeg_path).toBe('/custom/ffmpeg');
    });
});

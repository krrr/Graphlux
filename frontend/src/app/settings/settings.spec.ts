import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NzMessageService } from 'ng-zorro-antd/message';

import { SettingsComponent } from './settings.component';
import { ApiService } from '../api.service';

describe('Settings', () => {
    let component: SettingsComponent;
    let fixture: ComponentFixture<SettingsComponent>;
    let apiServiceSpy: any;
    let messageServiceSpy: any;

    beforeEach(async () => {
        apiServiceSpy = {
            getSettings: vi.fn().mockReturnValue(of({
                ffmpeg_path: '/usr/bin/ffmpeg',
                imagemagick_path: '/usr/bin/magick'
            })),
            updateSettings: vi.fn().mockReturnValue(of({}))
        };

        messageServiceSpy = {
            success: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [SettingsComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ApiService, useValue: apiServiceSpy },
                { provide: NzMessageService, useValue: messageServiceSpy }
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
        expect(component.settings()).toEqual({
            ffmpeg_path: '/usr/bin/ffmpeg',
            imagemagick_path: '/usr/bin/magick'
        });
    });

    it('should save settings', () => {
        component.saveSettings();
        expect(apiServiceSpy.updateSettings).toHaveBeenCalledWith({
            ffmpeg_path: '/usr/bin/ffmpeg',
            imagemagick_path: '/usr/bin/magick'
        });
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Settings saved successfully!');
    });

    it('should update field', () => {
        component.updateField('ffmpeg_path', '/custom/ffmpeg');
        expect(component.settings().ffmpeg_path).toBe('/custom/ffmpeg');
    });
});

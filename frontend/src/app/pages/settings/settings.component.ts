import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { COMMON_IMPORTS } from '../../shared-imports';
import { LanguageService } from '../../services/language.service';
import { ThemeService, ThemeType } from '../../services/theme.service';
import { TranslocoService } from '@jsverse/transloco';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerComponent } from "ng-zorro-antd/divider";

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzSwitchModule,
    NzAlertModule,
    ...COMMON_IMPORTS,
    NzDividerComponent
],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
    settings = signal({
        ffmpeg_path: 'ffmpeg',
        imagemagick_path: 'magick',
        max_concurrent_tasks: 4,
        auto_start: false,
        theme: 'system' as ThemeType,
        host: LOCALHOST as string | null,
        port: 41001
    });
    allowRemoteAccess = signal(false);
    
    langService = inject(LanguageService);
    themeService = inject(ThemeService);
    translocoService = inject(TranslocoService);

    constructor(
        public apiService: ApiService,
        private message: NzMessageService,
    ) {}

    ngOnInit() {
        this.loadSettings();
    }

    loadSettings() {
        this.apiService.getSettings().subscribe((s) => {
            this.settings.set(s);
            
            if (s.host && s.host !== LOCALHOST) {
                this.allowRemoteAccess.set(true);
            } else {
                this.allowRemoteAccess.set(false);
                s.host = LOCALHOST;
            }
            if (s.theme) {
                this.themeService.setTheme(s.theme, false);
            }
        });
    }

    saveSettings() {
        let settings = this.settings();
        if (settings.host == LOCALHOST) {
            settings.host = null;
        }
        this.apiService.updateSettings(settings).subscribe(() => {
            this.message.success(this.translocoService.translate('settings.saved'));
            this.themeService.setTheme(this.settings().theme);
        });
    }

    updateField(field: string, value: any) {
        this.settings.update((s: any) => ({ ...s, [field]: value }));
    }

    toggleRemoteAccess(enabled: boolean) {
        this.settings.update((s: any) => ({
            ...s,
            host: enabled ? ('0.0.0.0') : LOCALHOST
        }));
    }
}

const LOCALHOST = '127.0.0.1';
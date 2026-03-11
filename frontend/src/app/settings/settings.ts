import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { COMMON_IMPORTS } from '../shared-imports';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [FormsModule, NzFormModule, NzInputModule, ...COMMON_IMPORTS],
    templateUrl: './settings.html',
    styleUrls: ['./settings.css'],
})
export class SettingsComponent implements OnInit {
    settings = signal({
        ffmpeg_path: 'ffmpeg',
        imagemagick_path: 'magick',
    });

    constructor(
        private apiService: ApiService,
        private message: NzMessageService,
    ) {}

    ngOnInit() {
        this.loadSettings();
    }

    loadSettings() {
        this.apiService.getSettings().subscribe((s) => {
            if (s) {
                this.settings.set(s);
            }
        });
    }

    saveSettings() {
        this.apiService.updateSettings(this.settings()).subscribe(() => {
            this.message.success('Settings saved successfully!');
        });
    }

    updateField(field: string, value: string) {
        this.settings.update((s) => ({ ...s, [field]: value }));
    }
}

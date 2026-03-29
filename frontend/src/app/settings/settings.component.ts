import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { COMMON_IMPORTS } from '../shared-imports';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [FormsModule, NzFormModule, NzInputModule, NzInputNumberModule, ...COMMON_IMPORTS],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
    settings = signal({
        ffmpeg_path: 'ffmpeg',
        imagemagick_path: 'magick',
        max_concurrent_tasks: 4,
        auto_start: false,
    });

    constructor(
        public apiService: ApiService,
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

    updateField(field: string, value: any) {
        this.settings.update((s: any) => ({ ...s, [field]: value }));
    }
}

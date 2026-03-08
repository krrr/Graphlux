import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  settings: any = {
    ffmpeg_path: 'ffmpeg',
    imagemagick_path: 'magick',
    exiftool_path: 'exiftool'
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.apiService.getSettings().subscribe(s => {
      if (s) {
        this.settings = s;
      }
    });
  }

  saveSettings() {
    this.apiService.updateSettings(this.settings).subscribe(() => {
      alert('Settings saved successfully!');
    });
  }
}

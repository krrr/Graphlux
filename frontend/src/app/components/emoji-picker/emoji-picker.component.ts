import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@Component({
    selector: 'app-emoji-picker',
    standalone: true,
    imports: [CommonModule, NzIconModule, NzTabsModule],
    templateUrl: './emoji-picker.component.html',
    styleUrls: ['./emoji-picker.component.scss'],
})
export class EmojiPickerComponent {
    @Output() emojiSelect = new EventEmitter<string>();

    // 定义常用 Emoji 的 Unicode 范围
    categories = [
        {
            name: 'Smileys',
            icon: 'smile',
            ranges: [[0x1f600, 0x1f64f]] // Emoticons
        },
        {
            name: 'Animals',
            icon: 'heart',
            ranges: [[0x1f400, 0x1f43d], [0x1f980, 0x1f9ae]] // Animals & Nature
        },
        {
            name: 'Food',
            icon: 'coffee',
            ranges: [[0x1f344, 0x1f37f], [0x1f950, 0x1f96f]] // Food & Drink
        },
        {
            name: 'Activities',
            icon: 'trophy',
            ranges: [[0x1f3a0, 0x1f3c4], [0x1f3cf, 0x1f3d3]] // Activities & Sports
        },
        {
            name: 'Travel',
            icon: 'car',
            ranges: [[0x1f680, 0x1f6c5], [0x1f300, 0x1f320]] // Travel & Places
        },
        {
            name: 'Objects',
            icon: 'bulb',
            ranges: [[0x1f4a0, 0x1f4ff], [0x1f380, 0x1f39f]] // Objects
        },
        {
            name: 'Symbols',
            icon: 'info-circle',
            ranges: [[0x2600, 0x26ff], [0x2700, 0x27bf]] // Symbols & Dingbats
        }
    ];

    getEmojis(ranges: number[][]): string[] {
        const emojis: string[] = [];
        for (const [start, end] of ranges) {
            for (let i = start; i <= end; i++) {
                const emoji = String.fromCodePoint(i);
                // 简单过滤：某些码点可能在旧系统上无法显示，或不是真正的 Emoji
                // 这里可以根据需要增加更复杂的正则过滤
                emojis.push(emoji);
            }
        }
        return emojis;
    }

    selectEmoji(emoji: string) {
        this.emojiSelect.emit(emoji);
    }
}

import { Component, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { inject } from '@angular/core';
import { EditorService, VariableInfo } from '../editor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PropsBase } from './props-base';

@Component({
    selector: 'app-convert-props',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzInputNumberModule,
        NzSwitchModule,
        NzTooltipModule,
        NzIconModule,
    ],
    template: `
        <nz-form-item>
            <nz-form-label>Input File Source</nz-form-label>
            <nz-form-control>
                <nz-select
                    [ngModel]="config().input_file_var"
                    (ngModelChange)="updateConfig('input_file_var', $event)"
                    nzPlaceHolder="Select source node"
                    name="input_file_var"
                >
                    @for (i of availableVariables; track i.value) {
                        <nz-option [nzValue]="i.value" [nzLabel]="i.label"></nz-option>
                    }
                </nz-select>
            </nz-form-control>
        </nz-form-item>

        <nz-form-item>
            <nz-form-label>Format</nz-form-label>
            <nz-form-control>
                <nz-select [ngModel]="config().format || 'custom'" (ngModelChange)="onFormatChange($event)" name="format">
                    <nz-option nzValue="custom" nzLabel="Custom"/>
                    <nz-option nzValue="webp" nzLabel="WebP"/>
                    <nz-option nzValue="jpg" nzLabel="JPG"/>
                    <nz-option nzValue="avif" nzLabel="AVIF"/>
                </nz-select>
            </nz-form-control>
        </nz-form-item>

        <!-- Preset Configuration -->
        @if ((config().format || 'custom') !== 'custom') {
            <nz-form-item>
                <nz-form-label nzTooltipTitle="Controls quantization loss (0-100)">
                    Quality
                </nz-form-label>
                <nz-form-control>
                    <nz-input-number
                        [ngModel]="config().preset_quality ?? 75"
                        (ngModelChange)="updatePreset('preset_quality', $event)"
                        [nzMin]="0"
                        [nzMax]="100"
                        [nzStep]="1"
                    ></nz-input-number>
                </nz-form-control>
            </nz-form-item>

            @if (config().format === 'avif') {
                <nz-form-item>
                    <nz-form-label nzTooltipTitle="Encoding effort (0-9). 6 or 7 recommended for balanced speed/size.">
                        Speed (Effort)
                    </nz-form-label>
                    <nz-form-control>
                        <nz-input-number
                            [ngModel]="config().preset_speed ?? 6"
                            (ngModelChange)="updatePreset('preset_speed', $event)"
                            [nzMin]="0"
                            [nzMax]="9"
                            [nzStep]="1"
                        ></nz-input-number>
                    </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                    <nz-form-label nzTooltipTitle="4:2:0 has best compatibility.">
                        Chroma Sampling
                    </nz-form-label>
                    <nz-form-control>
                        <nz-select [ngModel]="config().preset_chroma ?? '4:2:0'" (ngModelChange)="updatePreset('preset_chroma', $event)">
                            <nz-option nzValue="4:4:4" nzLabel="4:4:4"></nz-option>
                            <nz-option nzValue="4:2:2" nzLabel="4:2:2"></nz-option>
                            <nz-option nzValue="4:2:0" nzLabel="4:2:0"></nz-option>
                        </nz-select>
                    </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                    <nz-form-label nzTooltipTitle="Force lossless mode. Quality parameter is ignored.">
                        Lossless
                    </nz-form-label>
                    <nz-form-control>
                        <nz-switch
                            [ngModel]="config().preset_lossless ?? false"
                            (ngModelChange)="updatePreset('preset_lossless', $event)"
                        ></nz-switch>
                    </nz-form-control>
                </nz-form-item>
            }
        }

        <!-- Custom Configuration -->
        @if ((config().format || 'custom') === 'custom') {
            <nz-form-item>
                <nz-form-label>Tool</nz-form-label>
                <nz-form-control>
                    <nz-select [ngModel]="config().tool" (ngModelChange)="updateConfig('tool', $event)" name="tool">
                        <nz-option nzValue="imagemagick" nzLabel="ImageMagick"></nz-option>
                        <nz-option nzValue="ffmpeg" nzLabel="FFmpeg"></nz-option>
                    </nz-select>
                </nz-form-control>
            </nz-form-item>
            <nz-form-item>
                <nz-form-label>Target Extension</nz-form-label>
                <nz-form-control>
                    <input
                        nz-input
                        [ngModel]="config().target_extension"
                        (ngModelChange)="updateConfig('target_extension', $event)"
                        name="target_extension"
                        placeholder=".avif"
                    />
                </nz-form-control>
            </nz-form-item>
            <nz-form-item>
                <nz-form-label>Arguments</nz-form-label>
                <nz-form-control>
                    <input
                        nz-input
                        [(ngModel)]="localArgsString"
                        (ngModelChange)="onArgsChange($event)"
                        name="args"
                        placeholder='-quality 85'
                    />
                </nz-form-control>
            </nz-form-item>
        }
    `,
})
export class PropsConvertComponent extends PropsBase implements OnChanges {
    localArgsString = '';

    get availableVariables(): VariableInfo[] {
        return this.editorService.getAvailableVariables(this.nodeId).filter((v) => v.value.endsWith(':file'));
    }

    override ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
        this.syncLocalArgs();
    }

    onArgsChange(value: string) {
        const args = this.parseArgs(value);
        this.updateConfig('args', args);
    }

    private parseArgs(value: string): string[] {
        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
        const args = [];
        let match;
        while ((match = regex.exec(value)) !== null) {
            args.push(match[1] || match[2] || match[0]);
        }
        return args;
    }

    private joinArgs(args: string[]): string {
        return (args || []).map(arg => {
            if (arg.includes(' ') && !arg.startsWith('"') && !arg.startsWith("'")) {
                return `"${arg}"`;
            }
            return arg;
        }).join(' ');
    }

    private syncLocalArgs() {
        this.localArgsString = this.joinArgs(this.config().args || []);
    }

    onFormatChange(format: string) {
        this.updateConfig('format', format);
        this.syncPresetArgs();
    }

    updatePreset(field: string, value: any) {
        this.updateConfig(field, value);
        this.syncPresetArgs();
    }

    private syncPresetArgs() {
        const format = this.config().format || 'custom';
        if (format === 'custom') return;

        this.updateConfig('tool', 'imagemagick');

        const args: string[] = [];
        const q = this.config().preset_quality ?? 75;

        if (format === 'avif') {
            this.updateConfig('target_extension', '.avif');
            if (this.config().preset_lossless) {
                args.push('-define', 'heic:lossless=true');
            } else {
                args.push('-quality', String(q));
            }
            const speed = this.config().preset_speed ?? 6;
            args.push('-define', `heic:speed=${speed}`);
            const chroma = this.config().preset_chroma ?? '4:2:0';
            args.push('-define', `heic:chroma-sampling=${chroma}`);
        } else if (format === 'webp') {
            this.updateConfig('target_extension', '.webp');
            args.push('-quality', String(q));
        } else if (format === 'jpg') {
            this.updateConfig('target_extension', '.jpg');
            args.push('-quality', String(q));
        }
        this.updateConfig('args', args);
        this.syncLocalArgs();
    }
}
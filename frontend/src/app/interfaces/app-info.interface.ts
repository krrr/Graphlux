export interface AppInfo {
    version: string;
    is_packaged: boolean;
    settings: SystemConfig;
}

export interface SystemConfig {
    ffmpeg_path: string;
    imagemagick_path: string;
    max_concurrent_tasks: number;
    auto_start: boolean;
    theme: string;
    host: string | null;
    port: number;
    editor_bg: string;
}

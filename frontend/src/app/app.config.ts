import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';
import { IconDefinition } from '@ant-design/icons-angular';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
    SaveOutline,
    AlertFill,
    AlertOutline,
    MoreOutline,
    DeploymentUnitOutline,
    FileTextOutline,
    FolderOpenOutline,
    SyncOutline,
    PercentageOutline,
    BranchesOutline,
    EditOutline,
    VideoCameraOutline,
    SettingOutline,
    CopyOutline,
    DeleteOutline,
    LayoutOutline,
    PlayCircleOutline,
    MinusOutline,
    PlusOutline,
    FolderOutline,
    ArrowUpOutline,
    HomeOutline,
    ApartmentOutline,
} from '@ant-design/icons-angular/icons';

registerLocaleData(en);

const icons: IconDefinition[] = [
    SaveOutline,
    AlertOutline,
    AlertFill,
    MoreOutline,
    DeploymentUnitOutline,
    FileTextOutline,
    FolderOpenOutline,
    SyncOutline,
    PercentageOutline,
    BranchesOutline,
    EditOutline,
    VideoCameraOutline,
    SettingOutline,
    CopyOutline,
    DeleteOutline,
    LayoutOutline,
    PlayCircleOutline,
    MinusOutline,
    PlusOutline,
    FolderOutline,
    ArrowUpOutline,
    HomeOutline,
    ApartmentOutline,
];

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideAnimationsAsync(),
        provideNzI18n(en_US),
        importProvidersFrom(FormsModule),
        provideNzIcons(icons),
    ],
};

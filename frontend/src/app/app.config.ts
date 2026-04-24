import { ApplicationConfig, importProvidersFrom, isDevMode, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { en_US, zh_CN, provideNzI18n, NZ_I18N } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import zh from '@angular/common/locales/zh';
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
    TagOutline,
    BranchesOutline,
    EditOutline,
    VideoCameraOutline,
    SettingOutline,
    CopyOutline,
    DeleteOutline,
    LayoutOutline,
    PlayCircleOutline,
    PauseCircleOutline,
    MinusOutline,
    PlusOutline,
    FolderOutline,
    ArrowUpOutline,
    HomeOutline,
    ApartmentOutline,
    CodeOutline,
    InfoCircleOutline,
    BulbOutline,
    CarOutline,
    TrophyOutline,
    CoffeeOutline,
    HeartOutline,
    SmileOutline,
    FullscreenOutline,
    FullscreenExitOutline,
    UndoOutline,
    RedoOutline,
    FunctionOutline,
    BugOutline,
    ZoomInOutline,
    ZoomOutOutline,
    HistoryOutline,
    ReloadOutline,
    ArrowRightOutline,
    ClearOutline,
} from '@ant-design/icons-angular/icons';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';

registerLocaleData(en);
registerLocaleData(zh);

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
    TagOutline,
    BranchesOutline,
    EditOutline,
    VideoCameraOutline,
    SettingOutline,
    CopyOutline,
    DeleteOutline,
    LayoutOutline,
    PlayCircleOutline,
    PauseCircleOutline,
    MinusOutline,
    PlusOutline,
    FolderOutline,
    ArrowUpOutline,
    HomeOutline,
    ApartmentOutline,
    CodeOutline,
    InfoCircleOutline,
    BulbOutline,
    CarOutline,
    TrophyOutline,
    CoffeeOutline,
    HeartOutline,
    SmileOutline,
    FullscreenOutline,
    FullscreenExitOutline,
    UndoOutline,
    RedoOutline,
    FunctionOutline,
    BugOutline,
    ZoomInOutline,
    ZoomOutOutline,
    ReloadOutline,
    ArrowRightOutline,
    HistoryOutline,
    ClearOutline,
];

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideAnimationsAsync(),
        {
            provide: NZ_I18N,
            useFactory: () => {
                const transloco = inject(TranslocoService);
                const lang = transloco.getActiveLang();
                return lang === 'zh' ? zh_CN : en_US;
            }
        },
        importProvidersFrom(FormsModule),
        provideNzIcons(icons),
        provideTransloco({
            config: {
                availableLangs: ['en', 'zh'],
                defaultLang: 'en',
                reRenderOnLangChange: false,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader
        }),
    ],
};

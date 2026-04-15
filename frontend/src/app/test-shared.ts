  // 这里放每个测试几乎都会用到的基础 Mock
import { NzMessageService } from 'ng-zorro-antd/message';
import { vi } from 'vitest';
import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/zh.json';


export const messageServiceSpy = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
};

export const translocoServiceSpy = {
    translate: vi.fn((key: string) => key)
}

export const COMMON_TEST_PROVIDERS = [
    { provide: NzMessageService, useValue: messageServiceSpy },
];


export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: { en, es },
    translocoConfig: {
      availableLangs: ['en', 'zh'],
      defaultLang: 'en',
    },
    preloadLangs: true,
    ...options,
  });
}
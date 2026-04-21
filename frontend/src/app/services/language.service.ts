import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { NzI18nService, en_US, zh_CN } from 'ng-zorro-antd/i18n';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translocoService = inject(TranslocoService);
  private nzI18nService = inject(NzI18nService);

  init() {
    const savedLang = localStorage.getItem('lang') || 'en';
    this.setLanguage(savedLang);

    this.translocoService.langChanges$.subscribe(lang => {
      if (lang === 'zh') {
        this.nzI18nService.setLocale(zh_CN);
      } else {
        this.nzI18nService.setLocale(en_US);
      }
      localStorage.setItem('lang', lang);
    });
  }

  setLanguage(lang: string) {
    this.translocoService.setActiveLang(lang);
  }

  get currentLang() {
    return this.translocoService.getActiveLang();
  }
}

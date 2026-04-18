import { Injectable, Renderer2, RendererFactory2, Inject, signal, computed } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeType = 'default' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _currentTheme = signal<ThemeType>('system');
  public currentTheme = this._currentTheme.asReadonly();
  
  // 计算属性：当前是否真正处于深色模式
  public isDark = computed(() => {
    const theme = this._currentTheme();
    if (theme === 'system') {
      return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;  // unit test has no matchMedia
    }
    return theme === 'dark';
  });

  private renderer: Renderer2;

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  private getStoredTheme(): ThemeType {
    return (localStorage.getItem('theme') as ThemeType) || 'system';
  }

  loadTheme(firstLoad = false): void {
    if (firstLoad) {
      this._currentTheme.set(this.getStoredTheme());
      this.watchSystemTheme();
    }
    
    const themePreference = this._currentTheme();
    let actualTheme: 'default' | 'dark';
    
    if (themePreference === 'system') {
      if (!window.matchMedia) {  // unit test
        actualTheme = 'default';
      } else {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
      }
    } else {
      actualTheme = themePreference as 'default' | 'dark';
    }

    this.updateTheme(actualTheme);
  }

  setTheme(theme: ThemeType, saveToLocal = true): void {
    this._currentTheme.set(theme);
    if (saveToLocal) {
      localStorage.setItem('theme', theme);
    }
    this.loadTheme();
  }

  private updateTheme(theme: 'default' | 'dark'): void {
    const head = this.document.getElementsByTagName('head')[0];
    const themeLink = this.document.getElementById('client-theme') as HTMLLinkElement;

    if (themeLink) {
      themeLink.href = `${theme}.css`;
    } else {
      const style = this.renderer.createElement('link');
      this.renderer.setAttribute(style, 'id', 'client-theme');
      this.renderer.setAttribute(style, 'rel', 'stylesheet');
      this.renderer.setAttribute(style, 'href', `${theme}.css`);
      this.renderer.appendChild(head, style);
    }

    if (theme === 'dark') {
      this.renderer.addClass(this.document.documentElement, 'dark');
      this.renderer.removeClass(this.document.documentElement, 'default');
    } else {
      this.renderer.addClass(this.document.documentElement, 'default');
      this.renderer.removeClass(this.document.documentElement, 'dark');
    }
  }

  private watchSystemTheme(): void {
    if (!window.matchMedia) {  // unit test
      return;
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this._currentTheme() === 'system') {
        this.updateTheme(e.matches ? 'dark' : 'default');
      }
    });
  }
}

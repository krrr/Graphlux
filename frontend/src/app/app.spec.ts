import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { ActivatedRoute } from '@angular/router';
import { getTranslocoModule } from './test-shared';
import { ApartmentOutline, FolderOpenOutline, SettingOutline } from '@ant-design/icons-angular/icons';

describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent, getTranslocoModule()],
            providers: [
                provideNzIcons([ApartmentOutline, FolderOpenOutline, SettingOutline]),
                {
                    provide: ActivatedRoute,
                    useValue: {},
                },
            ],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should render title', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h2')?.textContent).toContain('Graphlux');
    });
});

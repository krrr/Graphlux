import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { FoldersComponent } from './folders.component';

describe('Folders', () => {
    let component: FoldersComponent;
    let fixture: ComponentFixture<FoldersComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FoldersComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(FoldersComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

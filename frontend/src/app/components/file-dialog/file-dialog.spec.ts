import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileDialogComponent } from './file-dialog.component';

describe('FileDialogComponent', () => {
    let component: FileDialogComponent;
    let fixture: ComponentFixture<FileDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FileDialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(FileDialogComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

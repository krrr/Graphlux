import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FileDialogComponent } from './file-dialog.component';
import { ApiService } from '../../api.service';

describe('FileDialogComponent', () => {
    let component: FileDialogComponent;
    let fixture: ComponentFixture<FileDialogComponent>;
    let apiServiceSpy: any;

    const mockFiles = [
        { name: 'dir1', path: '/dir1', is_dir: true },
        { name: 'file1.txt', path: '/file1.txt', is_dir: false }
    ];

    beforeEach(async () => {
        apiServiceSpy = {
            listDirectory: vi.fn().mockReturnValue(of(mockFiles))
        };

        await TestBed.configureTestingModule({
            imports: [FileDialogComponent],
            providers: [
                { provide: ApiService, useValue: apiServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FileDialogComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load directory and filter by mode', async () => {
        component.mode = 'folder';
        await component.loadDirectory('/test');

        expect(apiServiceSpy.listDirectory).toHaveBeenCalledWith('/test');
        expect(component.items().length).toBe(1);
        expect(component.items()[0].name).toBe('dir1');

        component.mode = 'file';
        await component.loadDirectory('/test');

        expect(component.items().length).toBe(2);
    });

    it('should handle item click and double click', async () => {
        const item = mockFiles[0];
        component.onItemClick(item);
        expect(component.selectedPath()).toBe('/dir1');

        await component.onItemDoubleClick(item);
        expect(apiServiceSpy.listDirectory).toHaveBeenCalledWith('/dir1');
    });

    it('should go up to parent directory', async () => {
        component.currentPath = '/a/b/c';
        await component.goUp();
        expect(apiServiceSpy.listDirectory).toHaveBeenCalledWith('/a/b');
    });
});

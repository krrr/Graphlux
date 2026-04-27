import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ApiService } from '../../../api.service';
import { EditorService } from './editor.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { COMMON_TEST_PROVIDERS, getTranslocoModule, messageServiceSpy } from '../../../test-shared';

import { EditorComponent } from './editor.component';

// We override the component's template and some properties so we don't have to deal with DOM and Rete.js initialization
// which heavily relies on `HTMLElement` and actual browser rendering that can be brittle in jsdom.

describe('EditorComponent', () => {
    let component: EditorComponent;
    let fixture: ComponentFixture<EditorComponent>;
    let apiServiceSpy: any;

    beforeEach(async () => {
        apiServiceSpy = {
            getTask: vi.fn().mockReturnValue(of({ name: 'Task', description: 'Desc' })),
            updateTask: vi.fn().mockReturnValue(of({})),
            executeTask: vi.fn().mockReturnValue(of({})),
            getLogHistory: vi.fn().mockReturnValue(of([])),
            connectLogsWebSocket: vi.fn(),
            disconnectLogsWebSocket: vi.fn(),
            logs$: of()
        };

        await TestBed.configureTestingModule({
            imports: [EditorComponent, NoopAnimationsModule, getTranslocoModule()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ApiService, useValue: apiServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(new Map([['taskId', '1']])) }
                },
                EditorService,
                ...COMMON_TEST_PROVIDERS
            ],
        })
        .overrideComponent(EditorComponent, {
            set: {
                template: '<div>Mock Template</div>' // Override template to prevent actual rendering
            }
        })
        .compileComponents();

        fixture = TestBed.createComponent(EditorComponent);
        component = fixture.componentInstance;

        // Mock the internal signals and properties so we don't trigger rete logic
        component.taskId = 1;
        component.executeFilePath.set('/test/path');

        // Mock serializeDag because it needs Rete editor
        component.editorService.serializeDag = vi.fn().mockReturnValue({ nodes: {}, edges: [], start_node: null }) as any;

        // Prevent ngAfterViewInit from running which requires Rete
        component.ngAfterViewInit = async () => {};
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should save DAG', async () => {
        await component.saveDag();
        expect(apiServiceSpy.updateTask).toHaveBeenCalledWith(1, {
            json_data: { nodes: {}, edges: [], start_node: null }
        });
        expect(messageServiceSpy.success).toHaveBeenCalledWith('Task saved successfully');
    });

    it('should execute DAG', () => {
        const setLogsModalSpy = vi.spyOn(component.isLogsModalVisible, 'set');

        component.executeDag();

        expect(setLogsModalSpy).toHaveBeenCalledWith(true);
        expect(apiServiceSpy.executeTask).toHaveBeenCalledWith({ nodes: {}, edges: [], start_node: null }, '/test/path', 1);
    });

    it('should handle execution error', async () => {
        const { Observable } = await import('rxjs');
        apiServiceSpy.executeTask.mockReturnValue(new Observable((sub: any) => sub.error('Error')));

        component.executeDag();

        expect(messageServiceSpy.error).toHaveBeenCalledWith('Execution failed');
    });

    it('should unregister the same keydown listener on destroy', () => {
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

        component.ngOnDestroy();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', (component as any).keydownListener);
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassicPreset } from 'rete';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { IconDefinition } from '@ant-design/icons-angular';
import {
    FolderOpenOutline,
    SyncOutline,
    PercentageOutline,
    BranchesOutline,
    FileTextOutline,
    EditOutline,
    VideoCameraOutline,
    SettingOutline,
} from '@ant-design/icons-angular/icons';

import { CustomNodeComponent } from './custom-node.component';
import { TaskNode } from '../editor.service';
import { getTranslocoModule } from '../../../../test-shared';

const icons: IconDefinition[] = [
    FolderOpenOutline,
    SyncOutline,
    PercentageOutline,
    BranchesOutline,
    FileTextOutline,
    EditOutline,
    VideoCameraOutline,
    SettingOutline,
];

describe('CustomNodeComponent', () => {
    let component: CustomNodeComponent;
    let fixture: ComponentFixture<CustomNodeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CustomNodeComponent, NzIconModule.forRoot(icons), getTranslocoModule()],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(CustomNodeComponent);
        component = fixture.componentInstance;
        component.data = new TaskNode('MetadataReadNode', 'test');
        component.emit = () => {};
        component.rendered = () => {};
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

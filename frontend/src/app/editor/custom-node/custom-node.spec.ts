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

import { CustomNodeComponent } from './custom-node';

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
            imports: [CustomNodeComponent, NzIconModule.forRoot(icons)],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(CustomNodeComponent);
        component = fixture.componentInstance;
        component.data = new ClassicPreset.Node('ReadInputNode');
        component.emit = () => {};
        component.rendered = () => {};
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

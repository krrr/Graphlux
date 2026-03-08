import { Component } from '@angular/core';
import { EditorComponent } from './editor/editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EditorComponent],
  template: '<app-editor></app-editor>',
})
export class AppComponent {
  title = 'frontend';
}

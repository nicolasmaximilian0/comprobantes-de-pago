import { Component } from '@angular/core';
import { FormEntryComponent } from './form-entry/form-entry.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormEntryComponent],
  template: '<app-form-entry />',
  styles: [],
})
export class App { }

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditlessonComponent } from './editlesson.component';

describe('EditlessonComponent', () => {
  let component: EditlessonComponent;
  let fixture: ComponentFixture<EditlessonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditlessonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditlessonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatelessonComponent } from './createlesson.component';

describe('CreatelessonComponent', () => {
  let component: CreatelessonComponent;
  let fixture: ComponentFixture<CreatelessonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreatelessonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreatelessonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});

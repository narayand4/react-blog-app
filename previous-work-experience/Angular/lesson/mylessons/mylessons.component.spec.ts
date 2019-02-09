import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MylessonsComponent } from './mylessons.component';

describe('MylessonsComponent', () => {
  let component: MylessonsComponent;
  let fixture: ComponentFixture<MylessonsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MylessonsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MylessonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});

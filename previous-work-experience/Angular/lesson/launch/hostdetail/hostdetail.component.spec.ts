import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HostdetailComponent } from './hostdetail.component';

describe('HostdetailComponent', () => {
  let component: HostdetailComponent;
  let fixture: ComponentFixture<HostdetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HostdetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HostdetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});

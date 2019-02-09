import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TnheaderComponent } from './tnheader.component';

describe('TnheaderComponent', () => {
  let component: TnheaderComponent;
  let fixture: ComponentFixture<TnheaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TnheaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TnheaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});

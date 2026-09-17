import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { BackendService } from './core/backend.service';
import { signal } from '@angular/core';
describe('AppComponent', () => {
  it('ofrece acceso sin formulario de contraseña', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: BackendService,
          useValue: { identity: signal(false), restore: async () => {} },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acceder');
    expect(
      fixture.nativeElement.querySelector('input[type=password]'),
    ).toBeNull();
  });
});

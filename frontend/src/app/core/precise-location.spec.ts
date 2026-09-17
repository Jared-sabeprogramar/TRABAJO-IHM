import { fakeAsync, tick } from '@angular/core/testing';
import { preciseLocation } from './precise-location';

describe('Precise location acquisition', () => {
  let callback: PositionCallback;
  let error: PositionErrorCallback;
  let geo: Geolocation;
  let clear: jasmine.Spy;
  let update: jasmine.Spy;
  let finish: jasmine.Spy;
  const fix = (accuracy: number, latitude = -12, age = 0) => ({
    timestamp: Date.now() - age, coords: { latitude, longitude: -77, accuracy },
  } as GeolocationPosition);
  beforeEach(() => {
    clear = jasmine.createSpy('clearWatch');
    update = jasmine.createSpy('update');
    finish = jasmine.createSpy('finish');
    geo = {
      watchPosition: (ok: PositionCallback, fail: PositionErrorCallback, options: PositionOptions) => {
        callback = ok; error = fail;
        expect(options.enableHighAccuracy).toBeTrue();
        expect(options.maximumAge).toBe(0);
        return 7;
      }, clearWatch: clear,
    } as unknown as Geolocation;
  });
  it('retains the best fresh fix and stops at ten metres or better', fakeAsync(() => {
    preciseLocation(geo, update, finish);
    callback(fix(300)); callback(fix(40, -12.001)); callback(fix(100));
    callback(fix(5, -12, 30000)); // Ignore a stale fix even if its accuracy is better.
    expect(update.calls.count()).toBe(2);
    callback(fix(8, -12.002));
    expect(update.calls.mostRecent().args[0].coords.latitude).toBe(-12.002);
    expect(clear).toHaveBeenCalledWith(7);
    expect(finish).toHaveBeenCalledTimes(1);
    tick(20000);
    expect(finish).toHaveBeenCalledTimes(1);
  }));
  it('keeps an approximate fix at the deadline without claiming better accuracy', fakeAsync(() => {
    preciseLocation(geo, update, finish);
    callback(fix(250)); tick(20000);
    expect(update.calls.mostRecent().args[0].coords.accuracy).toBe(250);
    expect(finish).toHaveBeenCalledWith(undefined);
    expect(clear).toHaveBeenCalledWith(7);
  }));
  it('stops on permission denial and reports missing location at the deadline', fakeAsync(() => {
    preciseLocation(geo, update, finish);
    error({ code: 1 } as GeolocationPositionError);
    expect(finish.calls.mostRecent().args[0]).toContain('Permite la ubicación precisa');
    preciseLocation(geo, update, finish);
    tick(20000);
    expect(finish.calls.mostRecent().args[0]).toContain('No se pudo obtener');
  }));
  it('cancellation prevents late fixes from overwriting manual coordinates', fakeAsync(() => {
    const stop = preciseLocation(geo, update, finish);
    stop(); callback(fix(5)); tick(20000);
    expect(clear).toHaveBeenCalledWith(7);
    expect(update).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  }));
});

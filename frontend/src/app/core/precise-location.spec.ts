import { beforeEach, afterEach, describe, it, expect, vi, type Mock } from 'vitest';
import { preciseLocation } from './precise-location';

describe('Precise location acquisition', () => {
  let callback: PositionCallback;
  let error: PositionErrorCallback;
  let geo: Geolocation;
  let clear: Mock;
  let update: Mock;
  let finish: Mock;
  const fix = (accuracy: number, latitude = -12, age = 0) => ({
    timestamp: Date.now() - age, coords: { latitude, longitude: -77, accuracy },
  } as GeolocationPosition);
  beforeEach(() => {
    vi.useFakeTimers();
    clear = vi.fn();
    update = vi.fn();
    finish = vi.fn();
    geo = {
      watchPosition: (ok: PositionCallback, fail: PositionErrorCallback, options: PositionOptions) => {
        callback = ok; error = fail;
        expect(options.enableHighAccuracy).toBe(true);
        expect(options.maximumAge).toBe(0);
        return 7;
      }, clearWatch: clear,
    } as unknown as Geolocation;
  });
  afterEach(() => vi.useRealTimers());
  it('retains the best fresh fix and stops at ten metres or better', () => {
    preciseLocation(geo, update, finish);
    callback(fix(300)); callback(fix(40, -12.001)); callback(fix(100));
    callback(fix(5, -12, 30000)); // Ignore a stale fix even if its accuracy is better.
    expect(update.mock.calls.length).toBe(2);
    callback(fix(8, -12.002));
    expect(update.mock.lastCall![0].coords.latitude).toBe(-12.002);
    expect(clear).toHaveBeenCalledWith(7);
    expect(finish).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20000);
    expect(finish).toHaveBeenCalledTimes(1);
  });
  it('keeps an approximate fix at the deadline without claiming better accuracy', () => {
    preciseLocation(geo, update, finish);
    callback(fix(250)); vi.advanceTimersByTime(20000);
    expect(update.mock.lastCall![0].coords.accuracy).toBe(250);
    expect(finish).toHaveBeenCalledWith(undefined);
    expect(clear).toHaveBeenCalledWith(7);
  });
  it('stops on permission denial and reports missing location at the deadline', () => {
    preciseLocation(geo, update, finish);
    error({ code: 1 } as GeolocationPositionError);
    expect(finish.mock.lastCall![0]).toContain('Permite la ubicación precisa');
    preciseLocation(geo, update, finish);
    vi.advanceTimersByTime(20000);
    expect(finish.mock.lastCall![0]).toContain('No se pudo obtener');
  });
  it('cancellation prevents late fixes from overwriting manual coordinates', () => {
    const stop = preciseLocation(geo, update, finish);
    stop(); callback(fix(5)); vi.advanceTimersByTime(20000);
    expect(clear).toHaveBeenCalledWith(7);
    expect(update).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});

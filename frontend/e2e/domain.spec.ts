import { test, expect } from '@playwright/test';
import { spokenDigits } from '../src/app/core/dictation';
import { reportStatus } from '../src/app/core/report-status';
test('dictado conserva ceros y combina palabras con dígitos', () => {
  expect(spokenDigits('cero cero uno dos 3 cuatro cinco seis')).toBe(
    '00123456',
  );
  expect(spokenDigits('01 234 567')).toBe('01234567');
});
test('sin reportes nunca se presenta como accesible', () => {
  expect(reportStatus(0).label).toBe('Sin información');
  expect(reportStatus(1).level).toBe('warning');
  expect(reportStatus(2).level).toBe('warning');
  expect(reportStatus(3).level).toBe('high');
});

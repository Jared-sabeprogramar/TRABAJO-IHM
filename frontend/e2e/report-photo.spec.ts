import { test, expect, Page } from '@playwright/test';

async function prepare(page: Page, denied = false) {
  await page.route('**/assets/config*.json', route => route.fulfill({ json: {
    supabaseUrl: 'http://127.0.0.1:54321', supabaseAnonKey: 'test-only-key',
  } }));
  await page.route('**/auth/v1/signup', route => route.fulfill({ json: {
    access_token: 'test-only-token', refresh_token: 'test-only-refresh', token_type: 'bearer',
    expires_in: 3600, user: { id: '00000000-0000-4000-a000-000000000005', aud: 'authenticated' },
  } }));
  await page.route('**/functions/v1/identify', route => route.fulfill({ json: { identified: true } }));
  await page.route('**/rest/v1/place_report_summary*', route => route.fulfill({ json: [] }));
  await page.addInitScript((denied) => {
    Object.defineProperty(navigator.geolocation, 'clearWatch', { value: () => {} });
    Object.defineProperty(navigator.geolocation, 'watchPosition', { value: (ok: Function, fail: Function) => {
      if (denied) fail({ code: 1 });
      else ok({ timestamp: Date.now(), coords: { latitude: -12.0464, longitude: -77.0428, accuracy: 8 } });
      return 1;
    } });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      if (denied) throw new DOMException('Denied', 'NotAllowedError');
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext('2d')!;
      context.fillStyle = 'white'; context.fillRect(0, 0, 640, 480);
      context.fillStyle = 'black'; context.fillRect(10, 50, 300, 100);
      const stream = canvas.captureStream(5);
      (window as any).testCameraStream = stream;
      return stream;
    } });
  }, denied);
  await page.goto('/acceder');
  await page.getByLabel('DNI', { exact: true }).fill('00000000');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('link', { name: 'Ir al mapa' }).click();
  await page.getByRole('button', { name: 'Reportar una barrera', exact: true }).click();
}

test('captura GPS y foto, espera confirmación y actualiza la advertencia', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  const submitted: any[] = [];
  const place = { id: 'photo-test', name: 'Barrera en mi ubicación', latitude: -12.0464,
    longitude: -77.0428, report_count: 1, categories: ['stairs'], last_report_at: new Date().toISOString() };
  await page.route('**/functions/v1/submit-report', async route => {
    submitted.push(route.request().postDataJSON());
    await page.route('**/rest/v1/place_report_summary*', r => r.fulfill({ json: [place] }));
    await route.fulfill({ status: 201, json: { place_id: place.id } });
  });
  await expect(page.getByLabel('Latitud', { exact: true })).toHaveValue('-12.0464');
  await expect(page.getByText('Precisión aproximada:', { exact: false })).toContainText('8 metros');
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Tomar foto', exact: true }).click();
  await expect(page.getByAltText('Foto del lugar que adjuntarás al reporte')).toBeVisible();
  expect(submitted).toHaveLength(0);
  expect(await page.evaluate(() => (window as any).testCameraStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBeTruthy();
  await page.getByLabel('¿Qué barrera encontraste?').selectOption('stairs');
  await page.getByRole('button', { name: 'Confirmar y enviar reporte' }).click();
  await expect(page.locator('.notice.success')).toContainText('Reporte registrado');
  expect(submitted).toHaveLength(1);
  expect(submitted[0].photo).toMatch(/^data:image\/jpeg;base64,/);
  expect(submitted[0].latitude).toBe(-12.0464);
  await expect(page.locator('.place-item')).toContainText('Escaleras sin alternativa');
  await expect(page.locator('.place-item')).toContainText('Barrera reportada');
});

test('permisos denegados conservan alternativas y no envían el reporte', async ({ page }) => {
  await prepare(page, true);
  await expect(page.getByText('No se permitió la cámara.', { exact: false })).toBeVisible();
  await expect(page.getByText('No se pudo obtener tu ubicación.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adjuntar foto', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Latitud', { exact: true })).toBeEditable();
  await page.getByRole('button', { name: 'Cerrar formulario' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('cerrar el formulario apaga la cámara', async ({ page }) => {
  await prepare(page);
  await expect(page.getByRole('button', { name: 'Tomar foto', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar formulario' }).click();
  expect(await page.evaluate(() => (window as any).testCameraStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBeTruthy();
});

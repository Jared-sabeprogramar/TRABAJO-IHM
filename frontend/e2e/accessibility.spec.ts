import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('lector, navegación, configuración y vista móvil accesibles', async ({
  page,
}) => {
  // This scenario explicitly verifies the fallback without a Maps key.
  await page.route('**/assets/config.local.json', async route => {
    const response = await route.fetch();
    const config = await response.json();
    delete config.googleMapsApiKey;
    await route.fulfill({ json: config });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'El mundo, a tu alcance.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Leer texto en voz alta' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Configuración de lectura' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Lenta', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Texto más grande' }).check();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('html')).toHaveClass('large-text');
  await page.getByRole('button', { name: 'Configuración de lectura' }).click();
  await page.getByRole('checkbox', { name: 'Texto más grande' }).uncheck();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: 'test-results/lector-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/lector-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole('link', { name: 'Acceder', exact: true }).click();
  await page.getByLabel('DNI', { exact: true }).fill('00123456');
  await expect(page.getByLabel('DNI', { exact: true })).toHaveValue('00123456');
  expect(await page.locator('input[type=password]').count()).toBe(0);
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Cada reporte abre un camino.' }),
  ).toBeVisible();
  await expect(page.locator('.map-placeholder')).toBeVisible();
  await expect(page.getByText('No pudimos mostrar el mapa en este momento. Puedes consultar los reportes y registrar una barrera.')).toBeVisible();
  await page
    .getByRole('button', { name: 'Reportar una barrera', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const mapResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(mapResults.violations).toEqual([]);
  expect(errors).toEqual([]);
});
test('OCR real de una imagen y controles de lectura', async ({ page }) => {
  await page.goto('/');
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 400;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1000, 400);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 65px Arial';
    ctx.fillText('SALIDA DE EMERGENCIA', 50, 200);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'cartel.png',
      mimeType: 'image/png',
      buffer: Buffer.from(data, 'base64'),
    });
  await page.getByRole('button', { name: 'Leer texto en voz alta' }).click();
  await expect(page.locator('.recognized-text')).toContainText(
    'SALIDA DE EMERGENCIA',
    { timeout: 120000 },
  );
  await expect(
    page.getByRole('button', { name: 'Repetir', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Detener', exact: true }).click();
  await page.getByRole('link', { name: 'Mis lecturas', exact: true }).click();
  await expect(page.locator('.history-entry')).toContainText(
    'SALIDA DE EMERGENCIA',
  );
});
test('permiso de cámara denegado muestra alternativa', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () =>
        Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('alert')).toContainText('Necesitamos permiso');
  await expect(
    page.getByRole('button', { name: 'Subir imagen' }),
  ).toBeEnabled();
});

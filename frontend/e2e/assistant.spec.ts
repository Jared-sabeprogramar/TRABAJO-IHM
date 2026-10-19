import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/v1/signup', r => r.fulfill({ json: {
    access_token: 'assistant-test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600,
    user: { id: '00000000-0000-4000-a000-000000000099', aud: 'authenticated' },
  } }));
  await page.route('**/functions/v1/identify', r => r.fulfill({ json: { identified: false } }));
  await page.route('**/functions/v1/assistant', async r => {
    const input = r.request().postDataJSON();
    await r.fulfill({ json: input.action === 'status' ? { mode: 'basic' } : { mode: 'basic', reply: 'La biblioteca tiene dos reportes comunitarios. Consulta el mapa.' } });
  });
});

test('navegación, conversación por texto y errores recuperables', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Asistente de inteligencia artificial', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Asistente de inteligencia artificial');
  await expect(page.getByRole('status').filter({ hasText: 'Modo básico' })).toBeVisible();
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  await page.getByLabel('Tu mensaje', { exact: true }).fill('¿Qué reportes tiene la biblioteca?');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('log')).toContainText('La biblioteca tiene dos reportes');
  await page.route('**/functions/v1/assistant', r => r.fulfill({ status: 503, json: { error: 'Servicio temporalmente no disponible' } }));
  await page.getByLabel('Tu mensaje', { exact: true }).fill('Otra pregunta');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('alert')).toContainText('Servicio temporalmente no disponible');
  await expect(page.getByRole('button', { name: 'Conversar por voz' })).toBeEnabled();
});

test('petición de ayuda abre selector sin llamar ni consultar a Gemini', async ({ page }) => {
  let chatRequests = 0;
  await page.route('**/functions/v1/assistant', async r => {
    if (r.request().postDataJSON().action !== 'status') chatRequests++;
    await r.fulfill({ json: { mode: 'basic' } });
  });
  await page.goto('/asistente');
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  await page.getByLabel('Tu mensaje', { exact: true }).fill('Llama a una ambulancia');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir marcador: SAMU 106' })).toHaveAttribute('href', 'tel:106');
  expect(chatRequests).toBe(0);
  await page.getByRole('button', { name: 'Cerrar sin llamar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('el círculo conversa por turnos y vuelve a escuchar al terminar la voz', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).testRecognitions = [];
    (window as any).testUtterances = [];
    (window as any).SpeechRecognition = class {
      onresult?: (event: any) => void;
      onend?: () => void;
      start() { (window as any).testRecognitions.push(this); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speak: (u: any) => (window as any).testUtterances.push(u), cancel: () => {}, pause: () => {}, resume: () => {},
    } });
  });
  const chats: any[] = [];
  await page.route('**/functions/v1/assistant', async r => {
    const input = r.request().postDataJSON();
    if (input.action !== 'status') chats.push(input);
    await r.fulfill({ json: input.action === 'status' ? { mode: 'gemini' } : { mode: 'gemini', reply: 'La biblioteca tiene dos reportes comunitarios.' } });
  });
  await page.goto('/asistente');
  await page.getByRole('button', { name: 'Conversar por voz' }).click();
  await expect(page.locator('#voice-status')).toHaveText('Te escucho');
  await page.evaluate(() => (window as any).testRecognitions[0].onresult({ results: [[{ transcript: 'Consulta la biblioteca' }]] }));
  await expect(page.locator('#voice-status')).toHaveText('Acces está hablando');
  await expect(page.locator('.voice-caption')).toContainText('La biblioteca tiene dos reportes');
  expect(await page.evaluate(() => (window as any).testRecognitions.length)).toBe(1);
  await page.evaluate(() => (window as any).testUtterances.at(-1).onend());
  await expect(page.locator('#voice-status')).toHaveText('Te escucho');
  expect(await page.evaluate(() => (window as any).testRecognitions.length)).toBe(2);
  await page.evaluate(() => (window as any).testRecognitions[1].onresult({ results: [[{ transcript: '¿Y qué barreras tiene?' }]] }));
  await expect(page.locator('#voice-status')).toHaveText('Acces está hablando');
  expect(chats).toHaveLength(2);
  expect(chats[1].messages.map((m: any) => m.role)).toEqual(['user', 'model', 'user']);
  await page.getByRole('button', { name: 'Finalizar conversación por voz', exact: true }).click();
  await expect(page.locator('#voice-status')).toHaveText('Toca el círculo para conversar');
  await expect(page.getByRole('button', { name: 'Conversar por voz' })).toHaveAttribute('aria-pressed', 'false');
});

test('denegar el micrófono detiene la conversación y conserva la opción de escribir', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).SpeechRecognition = class {
      onerror?: (event: any) => void;
      onend?: () => void;
      start() { setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 20); }
      abort() { this.onend?.(); }
    };
  });
  await page.goto('/asistente');
  await page.getByRole('button', { name: 'Conversar por voz' }).click();
  await expect(page.getByRole('alert')).toContainText('Permite el micrófono');
  await expect(page.getByRole('button', { name: 'Conversar por voz' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  await expect(page.getByLabel('Tu mensaje', { exact: true })).toBeVisible();
});

test('recorrido voluntario se guarda y comparte solo resumen con consentimiento', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.geolocation, 'watchPosition', { value: (ok: PositionCallback) => {
      const emit = (lat: number) => ok({ coords: { latitude: lat, longitude: -77.0428, accuracy: 8 } } as GeolocationPosition);
      setTimeout(() => emit(-12.0464), 50);
      setTimeout(() => emit(-12.0460), 150);
      return 99;
    } });
    Object.defineProperty(navigator.geolocation, 'clearWatch', { value: () => {} });
  });
  const inputs: any[] = [];
  await page.route('**/functions/v1/assistant', async r => {
    const input = r.request().postDataJSON(); inputs.push(input);
    await r.fulfill({ json: { mode: 'basic', reply: 'Recorrido registrado como referencia personal.' } });
  });
  await page.goto('/asistente');
  await page.getByRole('button', { name: 'Mis recorridos', exact: true }).click();
  await page.getByLabel('Nombre del recorrido').fill('Biblioteca');
  await expect(page.getByRole('button', { name: 'Iniciar recorrido' })).toBeDisabled();
  await page.getByLabel('Acepto registrar mi ubicación').check();
  await page.getByRole('button', { name: 'Iniciar recorrido' }).click();
  await expect(page.getByText('Registrando recorrido: 2 puntos GPS.')).toBeVisible();
  await page.getByRole('button', { name: 'Detener y guardar recorrido' }).click();
  await expect(page.locator('.assistant-journey')).toContainText('Biblioteca');
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  await page.getByLabel('Tu mensaje', { exact: true }).fill('Mis rutas');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('log')).toContainText('Recorrido registrado');
  expect(inputs.at(-1).routes).toEqual([]);
  await page.getByLabel('Usar los nombres, frecuencias y distancias').check();
  await page.getByLabel('Tu mensaje', { exact: true }).fill('Mis recorridos');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect.poll(() => inputs.at(-1).routes?.length).toBe(1);
  expect(inputs.at(-1).routes[0].name).toBe('Biblioteca');
  expect(inputs.at(-1).routes[0].points).toBeUndefined();
  await page.reload();
  await page.getByRole('button', { name: 'Mis recorridos', exact: true }).click();
  await expect(page.locator('.assistant-journey')).toContainText('Biblioteca');
  await page.getByRole('button', { name: 'Eliminar recorrido Biblioteca' }).click();
  await expect(page.locator('.assistant-journey')).toHaveCount(0);
});

require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const base = 'https://booking-prototipo-alojamientos.vercel.app';
(async () => {
  const contract = await (await fetch(base + '/api/openapi.json')).json();
  assert.equal(contract.info.version, '1.3.1');
  assert.deepEqual(contract.components.schemas.AdminUserCreate.properties.activo.enum, [true]);
  assert.ok(contract.paths['/api/v1/admin/erp/usuarios'].post.requestBody.content['application/json'].schema.$ref.endsWith('/AdminUserCreate'));
  const unauthorized = await fetch(base + '/api/v1/admin/erp/usuarios', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Administrador prueba', correo: 'verificacion@example.com', contrasena: 'SoloVerificacion2026!', rol: 'admin', activo: true }),
  });
  assert.equal(unauthorized.status, 401);
  console.log('OK Crear administrador exige autenticación y está definido en el contrato propio');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    await page.goto(base + '/login');
    await page.locator('input[name=email]').fill(process.env.ADMIN_EMAIL);
    await page.locator('input[name=password]').fill(process.env.ADMIN_PASSWORD);
    await page.locator('#login-form button[type=submit]').click();
    await expect(page).toHaveURL(base + '/admin', { timeout: 30000 });
    await page.locator('[data-tab=usuarios]').click();
    await page.getByRole('button', { name: '+ Crear administrador', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Crear administrador', exact: true })).toBeVisible();
    await expect(page.locator('#erp-form input[name=rol]')).toHaveValue('admin');
    await expect(page.locator('#erp-form select[name=rol]')).toHaveCount(0);
    await expect(page.locator('#erp-form input[name=contrasena]')).toHaveAttribute('required', '');
    await expect(page.locator('#erp-form input[name=activo]')).toHaveValue('true');
    await expect(page.locator('#erp-form select[name=activo]')).toHaveCount(0);
    fs.mkdirSync('artifacts', { recursive: true });
    await page.locator('#modal').screenshot({ path: 'artifacts/crear-administrador.png' });
    console.log('OK Administrador dispone del formulario dedicado con rol admin y contraseña obligatoria');
    await page.locator('#close-modal').click();
    await page.getByRole('button', { name: '+ Crear usuario', exact: true }).click();
    await expect(page.locator('#erp-form input[name=activo]')).toHaveValue('true');
    await expect(page.locator('#erp-form select[name=activo]')).toHaveCount(0);
    const response = await page.evaluate(async () => {
      const result = await fetch('/api/v1/admin/erp/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Usuario inactivo prueba', correo: 'inactivo-verificacion@example.com', rol: 'customer', activo: false, contrasena: 'SoloVerificacion2026!' }),
      });
      return result.status;
    });
    assert.equal(response, 400);
    console.log('OK Usuarios nuevos siempre activos y API rechaza crear una cuenta inactiva');
    console.log('OK Verificación del formulario completada sin crear cuentas en producción');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });

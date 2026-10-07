const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parse } = require('yaml');
const base = 'https://booking-prototipo-alojamientos.vercel.app';
(async () => {
  const response = await fetch(base + '/api/contrato.yaml', { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const yaml = await response.text();
  assert.equal(yaml, fs.readFileSync('contracts/kawsay-estancias-openapi.yaml', 'utf8'));
  const contract = parse(yaml);
  assert.equal(contract.info.version, '1.3.0');
  assert.ok(contract.info.title.includes('contrato propio'));
  console.log('OK YAML propio publicado: ' + Object.keys(contract.paths).length + ' rutas');
  const operational = await (await fetch(base + '/api/openapi.json')).json();
  assert.equal(operational.info.title, contract.info.title);
  assert.equal(operational['x-contract-source'], '/api/contrato.yaml');
  for (const path of Object.keys(contract.paths)) assert.ok(operational.paths['/api/v1' + path], path);
  assert.deepEqual(operational.components.schemas.Reservation, contract.components.schemas.Reservation);
  console.log('OK Swagger operativo utiliza las rutas y el esquema de reserva del contrato propio');
  for (const [path, body, field] of [
    ['search', {}, undefined],
    ['auth/register', { name: 'Juan123', email: 'contract-test@example.com', password: 'ClienteDemo2026!' }, '/name'],
  ]) {
    const result = await fetch(base + '/api/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Fingerprint': 'contract-check' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    assert.equal(result.status, 400);
    const problem = await result.json();
    assert.ok(Array.isArray(problem.errors) && problem.errors.length > 0);
    if (field) assert.ok(problem.errors.some(error => error.instancePath === field));
    console.log('OK ' + path + ' aplica validación AJV del contrato propio: HTTP 400');
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });

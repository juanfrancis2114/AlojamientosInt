import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const require = createRequire(import.meta.url);
const { apiContract, validateContract } = require('../../dist/modules/alojamientos/contract');
describe('Contrato propio de Kawsay Estancias', () => {
  it('declara los servidores y reglas del proyecto y resuelve todas sus referencias locales', () => {
    expect(apiContract.info.title).toContain('contrato propio');
    expect(apiContract.servers[0].url).toBe('/api/v1');
    function inspect(value) {
      if (!value || typeof value !== 'object') return;
      if (value.$ref) {
        expect(value.$ref.startsWith('#/')).toBe(true);
        const resolved = value.$ref.slice(2).split('/').reduce((node, key) => node?.[key], apiContract);
        expect(resolved, value.$ref).toBeDefined();
      }
      Object.values(value).forEach(inspect);
    }
    inspect(apiContract);
  });
  it('rechaza nombres con números y monedas distintas de USD usando el contrato propio', () => {
    expect(() => validateContract('RegisterRequest', { name: 'Juan123', email: 'juan@example.com', password: 'ClienteDemo2026!' })).toThrow('El cuerpo no cumple el contrato');
    expect(() => validateContract('RegisterRequest', { name: 'María José', email: 'juan@example.com', password: 'ClienteDemo2026!' })).not.toThrow();
    const body = { booker: { country: 'ec', platform: 'desktop' }, checkin: '2099-01-01', checkout: '2099-01-03', guests: { number_of_adults: 2, number_of_rooms: 1 }, currency: 'EUR' };
    expect(() => validateContract('SearchAccommodationRequest', body)).toThrow();
    expect(() => validateContract('SearchAccommodationRequest', { ...body, currency: 'USD' })).not.toThrow();
  });
  it('todos los esquemas son compilables y el código de reserva tiene formato propio', () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    ajv.addSchema({ $id: 'contract-test', components: apiContract.components });
    for (const name of Object.keys(apiContract.components.schemas)) {
      expect(() => ajv.compile({ $ref: 'contract-test#/components/schemas/' + name })).not.toThrow();
    }
    const code = ajv.compile(apiContract.components.schemas.Reservation.properties.locator);
    expect(code('BP-41A92454')).toBe(true);
    expect(code('sin-codigo')).toBe(false);
  });
});

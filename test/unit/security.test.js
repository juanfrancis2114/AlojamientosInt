import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { JwtAuth } = require('../../dist/modules/alojamientos/jwt-auth.js');
const { allowedOrigins } = require('../../dist/common/origins.js');
const { hashPassword } = require('../../dist/modules/alojamientos/seed.js');
const { AlojamientosService } = require('../../dist/modules/alojamientos/alojamientos.service.js');
const { sign } = require('jsonwebtoken');
const secret = 'unit-test-only-key-at-least-32-characters-long';
function jwt() {
  vi.stubEnv('JWT_SECRET', secret);
  return new JwtAuth();
}
afterEach(() => vi.unstubAllEnvs());
describe('JWT y contraseñas', () => {
  it('firma identidad, rol, emisor, audiencia, id y vencimiento', () => {
    const service = jwt();
    const token = service.issue({ id: 'cliente-1', role: 'customer' });
    const payload = service.verify(token);
    expect(token.split('.')).toHaveLength(3);
    expect(payload.sub).toBe('cliente-1');
    expect(payload.role).toBe('customer');
    expect(payload.jti).toBeTruthy();
    expect(payload.exp - payload.iat).toBe(3600);
  });
  it('rechaza modificación de privilegios en el payload', () => {
    const service = jwt();
    const parts = service.issue({ id: 'cliente', role: 'customer' }).split('.');
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    body.role = 'admin';
    parts[1] = Buffer.from(JSON.stringify(body)).toString('base64url');
    expect(() => service.verify(parts.join('.'))).toThrow('Token inválido');
  });
  it.each([
    ['vencido', { expiresIn: -1 }],
    ['otra audiencia', { audience: 'otra-app' }],
    ['otro emisor', { issuer: 'otro-emisor' }],
    ['algoritmo no permitido', { algorithm: 'HS512' }],
  ])('rechaza token %s', (_name, override) => {
    const service = jwt();
    const token = sign({ role: 'admin' }, secret, {
      subject: 'usuario',
      jwtid: 'test',
      algorithm: 'HS256',
      issuer: 'booking-prototipo',
      audience: 'booking-web',
      expiresIn: 3600,
      ...override,
    });
    expect(() => service.verify(token)).toThrow('Token inválido');
  });
  it('rechaza firma de otra clave y tokens malformados', () => {
    const service = jwt();
    expect(() => service.verify(sign({ sub: 'u' }, 'otra-clave'))).toThrow();
    expect(() => service.verify('no-es-jwt')).toThrow();
  });
  it('no permite un secreto débil en producción', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'corto');
    expect(() => new JwtAuth()).toThrow('JWT_SECRET');
  });
  it('usa una sal independiente por contraseña y deriva el mismo hash con la misma sal', () => {
    const first = hashPassword('ContraseñaDePrueba!');
    const second = hashPassword('ContraseñaDePrueba!');
    expect(first).not.toBe(second);
    expect(first).not.toContain('ContraseñaDePrueba');
    expect(hashPassword('ContraseñaDePrueba!', first.split(':')[0])).toBe(first);
  });
});
describe('Reglas de negocio', () => {
  const service = new AlojamientosService({}, {});
  it('rechaza fechas que parecen ISO pero no existen', () => {
    expect(() => service.dates('2099-02-30', '2099-03-03')).toThrow('Fechas inválidas');
  });
  it('rechaza salida anterior y estancias superiores a 90 noches', () => {
    expect(() => service.dates('2099-06-02', '2099-06-01')).toThrow();
    expect(() => service.dates('2099-01-01', '2099-06-01')).toThrow('Máximo 90');
  });
  it('al modificar excluye la reserva propia pero rechaza otra reserva coincidente', async () => {
    const input = { checkin: '2099-06-02', checkout: '2099-06-05' };
    const own = { id: 'propia', checkin: '2099-06-02', checkout: '2099-06-05' };
    const other = { id: 'otra', checkin: '2099-06-04', checkout: '2099-06-06' };
    const em = { findBy: vi.fn().mockResolvedValue([own]) };
    await expect(service.assertNoOverlap(em, 1, input, own.id)).resolves.toBeUndefined();
    em.findBy.mockResolvedValue([own, other]);
    await expect(service.assertNoOverlap(em, 1, input, own.id)).rejects.toThrow('ya está reservado');
    expect(em.findBy).toHaveBeenLastCalledWith('orders', { accommodationId: 1, status: 'CONFIRMED' });
  });
});
describe('CORS', () => {
  it('acepta únicamente orígenes exactos y no subdominios parecidos', () => {
    const origins = allowedOrigins({
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://booking.example',
      CORS_ORIGINS: 'https://cliente.example',
    });
    expect(origins.has('https://booking.example')).toBe(true);
    expect(origins.has('https://booking.example.atacante.test')).toBe(false);
    expect(origins.has('https://atacante.test')).toBe(false);
    expect(origins.has('http://localhost:5173')).toBe(false);
  });
  it('rechaza comodines y URLs con rutas', () => {
    expect(() => allowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow();
    expect(() =>
      allowedOrigins({ NODE_ENV: 'production', APP_ORIGIN: 'https://booking.example/admin' }),
    ).toThrow();
  });
});

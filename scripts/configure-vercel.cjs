const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { parse } = require('dotenv');
const values = parse(fs.readFileSync('.env'));
async function setSecret(name, value) {
  await new Promise((resolve, reject) => {
    // Values go through stdin, never through shell interpolation or process arguments.
    const child = spawn(process.execPath, ['node_modules/vercel/dist/index.js', 'env', 'add', name, 'production,preview', '--force', '--sensitive', '--yes'], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('No se pudo configurar ' + name + '. Revisa la sesión y el proyecto vinculado.')));
    child.stdin.end(value);
  });
  console.log(name + ': configurada como secreto en Vercel');
}
(async () => {
  if (!values.DATABASE_URL) throw new Error('Completa DATABASE_URL en .env con la conexión Supabase');
  const url = new URL(values.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.pooler.supabase.com') || url.port !== '6543') throw new Error('Usa la cadena oficial Transaction pooler de Supabase (puerto 6543)');
  if (values.DATABASE_SSL !== 'true') throw new Error('Configura DATABASE_SSL=true');
  if (!values.ADMIN_EMAIL || !values.ADMIN_PASSWORD || values.ADMIN_PASSWORD.length < 10 || values.ADMIN_PASSWORD === 'AdminDemo2026!') throw new Error('Elige ADMIN_EMAIL y una contraseña nueva de administración en .env');
  if (!fs.existsSync('.vercel/project.json')) throw new Error('Vincula el proyecto con npx vercel link');
  if (!values.JWT_SECRET || values.JWT_SECRET.length < 32) throw new Error('Configura JWT_SECRET privado de al menos 32 caracteres');
  const config = { DATABASE_URL: values.DATABASE_URL, DATABASE_SSL: 'true', NODE_ENV: 'production', ADMIN_EMAIL: values.ADMIN_EMAIL.toLowerCase().trim(), ADMIN_PASSWORD: values.ADMIN_PASSWORD, SEED_DEMO: values.SEED_DEMO || 'true' };
  if (values.DATABASE_CA) config.DATABASE_CA = values.DATABASE_CA;
  config.JWT_SECRET = values.JWT_SECRET;
  config.APP_ORIGIN = values.APP_ORIGIN || 'https://booking-prototipo-alojamientos.vercel.app';
  if (values.CORS_ORIGINS) config.CORS_ORIGINS = values.CORS_ORIGINS;
  for (const [name, value] of Object.entries(config)) await setSecret(name, value);
  console.log('Configuración completa. Ejecuta npm run db:migrate y npx vercel --prod.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });

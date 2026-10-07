require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true, ...(process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA.replace(/\\n/g, '\n') } : {}) } : false, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    const found = await client.query("SELECT to_regclass('public.transaction_lock') AS name");
    const spanish = await client.query("SELECT to_regclass('public.bloqueo_transacciones') AS name");
    if (!spanish.rows[0].name) {
      if (!found.rows[0].name) await client.query(fs.readFileSync('supabase/migrations/001_booking.sql', 'utf8'));
      await client.query(fs.readFileSync('supabase/migrations/002_nombres_espanol.sql', 'utf8'));
    }
    await client.query(fs.readFileSync('supabase/migrations/003_erp.sql', 'utf8'));
    await client.query(fs.readFileSync('supabase/migrations/004_estancias.sql', 'utf8'));
    await client.query(fs.readFileSync('supabase/migrations/005_galerias.sql', 'utf8'));
    await client.query(fs.readFileSync('supabase/migrations/006_bloqueo_reservas.sql', 'utf8'));
    await client.query(fs.readFileSync('supabase/migrations/007_validacion_nombres.sql', 'utf8'));
    console.log('Migraciones aplicadas: 28 tablas en español, ERP y galerías. Datos conservados.');
  } finally { await client.end(); }
})().catch(e => { console.error('No se aplicó la migración:', e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[URL oculta]')); process.exitCode = 1; });

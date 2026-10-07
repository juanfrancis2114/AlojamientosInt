require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const assert = require('node:assert/strict');
const { tables } = require('./spanish-schema.cjs');
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true, ca: process.env.DATABASE_CA.replace(/\\n/g, '\n') }, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    const result = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'");
    assert.deepEqual(result.rows.map(r => r.tablename).sort(), [...Object.values(tables),'categorias_gasto','gastos','perfiles_usuario','calendario_tarifas','facturas','detalles_factura','resenas_estancia'].sort());
    assert.ok(result.rows.every(r => r.rowsecurity));
    const fks = await client.query("SELECT count(*)::integer AS n FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public'");
    assert.equal(fks.rows[0].n, 31);
    console.log('Supabase real: 27 tablas en español, 31 relaciones y RLS verificados.');
    console.log(result.rows.map(r => r.tablename).sort().join(', '));
  } finally { await client.end(); }
})().catch(e => { console.error('Verificación incompleta:', e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[URL oculta]')); process.exitCode = 1; });

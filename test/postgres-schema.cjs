const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const pg = new PGlite();
  try {
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await pg.exec(fs.readFileSync('supabase/migrations/001_booking.sql', 'utf8'));
  await pg.exec("INSERT INTO cities (name,country) VALUES ('Quito','ec');");
  await pg.exec(fs.readFileSync('supabase/migrations/002_nombres_espanol.sql', 'utf8'));
  await pg.exec(fs.readFileSync('supabase/migrations/003_erp.sql', 'utf8'));
  await pg.exec(fs.readFileSync('supabase/migrations/003_erp.sql', 'utf8'));
  await pg.exec(fs.readFileSync('supabase/migrations/004_estancias.sql', 'utf8'));
  await pg.exec(fs.readFileSync('supabase/migrations/004_estancias.sql', 'utf8'));
  const tables = await pg.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'");
  assert.equal(tables.rows.length, 27);
  assert.ok(tables.rows.every(t => t.rowsecurity));
  const fks = await pg.query("SELECT count(*)::integer AS n FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public'");
  assert.equal(fks.rows[0].n, 31);
  assert.equal((await pg.query('SELECT nombre FROM ciudades')).rows[0].nombre, 'Quito');
  const expected = [...Object.values(require('../scripts/spanish-schema.cjs').tables),'categorias_gasto','gastos','perfiles_usuario','calendario_tarifas','facturas','detalles_factura','resenas_estancia'].sort();
  assert.deepEqual(tables.rows.map(t => t.tablename).sort(), expected);
  await assert.rejects(pg.exec("INSERT INTO usuarios (id,correo,nombre,hash_contrasena,rol,fecha_creacion) VALUES ('test','test@test.local','Test','hash','root','2026-10-05')"));
  await pg.exec('SET ROLE anon;');
  await assert.rejects(pg.query('SELECT * FROM usuarios'));
  for (const table of ['perfiles_usuario','calendario_tarifas','facturas','detalles_factura','resenas_estancia']) await assert.rejects(pg.query('SELECT * FROM '+table));
  await pg.exec('RESET ROLE;');
  console.log('PostgreSQL: 27 tablas, RLS, claves foráneas, restricciones y permisos verificados en PGlite.');
  } finally { await pg.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

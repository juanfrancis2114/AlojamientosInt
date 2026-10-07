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
  await pg.exec(fs.readFileSync('supabase/migrations/005_galerias.sql','utf8'));
  await pg.exec(fs.readFileSync('supabase/migrations/005_galerias.sql','utf8'));
  const tables=await pg.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'");
  assert.equal(tables.rows.length, 28);
  assert.ok(tables.rows.every(t => t.rowsecurity));
  const fks = await pg.query("SELECT count(*)::integer AS n FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public'");
  assert.equal(fks.rows[0].n, 32);
  assert.equal((await pg.query('SELECT nombre FROM ciudades')).rows[0].nombre, 'Quito');
  const expected = [...Object.values(require('../scripts/spanish-schema.cjs').tables),'categorias_gasto','gastos','perfiles_usuario','calendario_tarifas','facturas','detalles_factura','resenas_estancia','imagenes_alojamiento'].sort();
  assert.deepEqual(tables.rows.map(t => t.tablename).sort(), expected);
  await assert.rejects(pg.exec("INSERT INTO usuarios (id,correo,nombre,hash_contrasena,rol,fecha_creacion) VALUES ('test','test@test.local','Test','hash','root','2026-10-05')"));
  await pg.exec("INSERT INTO alojamientos(id,nombre,ciudad_id,destino,descripcion,direccion,tipo,imagen,publicado,fecha_creacion,fecha_actualizacion) VALUES(1,'Casa prueba',1,'Quito','Demo','Demo','Hotel','https://example.com/1.jpg',true,'2026-10-07','2026-10-07')");
  await pg.exec("INSERT INTO imagenes_alojamiento(id,alojamiento_id,orden,url,descripcion,licencia,fuente,licencia_url,fecha_creacion) VALUES('img1',1,1,'https://example.com/1.jpg','Portada','CC0','https://example.com','https://example.com','2026-10-07')");
  await assert.rejects(pg.exec("INSERT INTO imagenes_alojamiento(id,alojamiento_id,orden,url,descripcion,licencia,fuente,licencia_url,fecha_creacion) VALUES('img2',1,1,'https://example.com/2.jpg','Repetida','CC0','https://example.com','https://example.com','2026-10-07')"));
  await assert.rejects(pg.exec("INSERT INTO imagenes_alojamiento(id,alojamiento_id,orden,url,descripcion,licencia,fuente,licencia_url,fecha_creacion) VALUES('img3',1,5,'https://example.com/3.jpg','Fuera de rango','CC0','https://example.com','https://example.com','2026-10-07')"));
  await assert.rejects(pg.exec("DELETE FROM alojamientos WHERE id=1"));
  await pg.exec('SET ROLE anon;');
  await assert.rejects(pg.query('SELECT * FROM usuarios'));
  for (const table of ['perfiles_usuario','calendario_tarifas','facturas','detalles_factura','resenas_estancia','imagenes_alojamiento']) await assert.rejects(pg.query('SELECT * FROM '+table));
  await pg.exec('RESET ROLE;');
  console.log('PostgreSQL: 28 tablas, RLS, claves foráneas, restricciones y permisos verificados en PGlite.');
  } finally { await pg.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

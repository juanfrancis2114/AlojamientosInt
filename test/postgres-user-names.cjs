const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const pg = new PGlite();
  try {
    await pg.exec("CREATE TABLE usuarios(id text PRIMARY KEY, nombre text, activo boolean DEFAULT true); INSERT INTO usuarios VALUES('historico','Juan123',true)");
    const migration = fs.readFileSync('supabase/migrations/007_validacion_nombres.sql', 'utf8');
    await pg.exec(migration);
    await pg.exec(migration);
    for (const name of ['Juan123', '123', 'Ana!', 'A', ' ', 'a'.repeat(101), 'Juan  Pérez', '-Ana']) {
      await assert.rejects(pg.query('INSERT INTO usuarios(id,nombre) VALUES($1,$2)', [name, name]), e => e.code === '23514' && e.constraint === 'nombre_usuario_valido');
    }
    for (const name of ['María José', 'Íñigo Muñoz', "Ana O'Neill", 'Ana-María', 'Jose\u0301', '山田']) {
      await pg.query('INSERT INTO usuarios(id,nombre) VALUES($1,$2)', [name, name]);
    }
    await assert.rejects(pg.exec("UPDATE usuarios SET nombre='Ana456' WHERE id='María José'"), e => e.code === '23514');
    await pg.exec("UPDATE usuarios SET activo=false WHERE id='historico'");
    await pg.exec("UPDATE usuarios SET nombre='Juan Pérez' WHERE id='historico'");
    assert.equal((await pg.query("SELECT nombre FROM usuarios WHERE id='historico'")).rows[0].nombre, 'Juan Pérez');
    console.log('OK PostgreSQL: números, símbolos y longitud rechazados; tildes y corrección de cuentas existentes aceptadas');
  } finally { await pg.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

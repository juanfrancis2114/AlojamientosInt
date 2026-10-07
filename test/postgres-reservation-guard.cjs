const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`CREATE TABLE bloqueo_transacciones(id integer PRIMARY KEY); INSERT INTO bloqueo_transacciones VALUES(1);
      CREATE TABLE reservas(id text PRIMARY KEY, alojamiento_id integer, estado text, fecha_entrada text, fecha_salida text);
      INSERT INTO reservas VALUES('historica',1,'CONFIRMED','2099-06-02','2099-06-05');`);
    const migration = fs.readFileSync('supabase/migrations/006_bloqueo_reservas.sql', 'utf8');
    await pg.exec(migration);
    await pg.exec(migration);
    await pg.exec('DROP TRIGGER reservas_sin_solapamiento ON reservas');
    await pg.exec(require('../dist/modules/alojamientos/migration-reservas').migrationReservas);
    for (const [entry, exit] of [['2099-06-02','2099-06-05'], ['2099-06-01','2099-06-03'], ['2099-06-04','2099-06-06'], ['2099-06-01','2099-06-06']]) {
      await assert.rejects(pg.query("INSERT INTO reservas VALUES('duplicada',1,'CONFIRMED',$1,$2)", [entry, exit]), e => e.code === '23P01');
    }
    await pg.exec("UPDATE reservas SET fecha_entrada=fecha_entrada WHERE id='historica'");
    await pg.exec("INSERT INTO reservas VALUES('adyacente',1,'CONFIRMED','2099-06-05','2099-06-07')");
    await assert.rejects(pg.exec("UPDATE reservas SET fecha_entrada='2099-06-04' WHERE id='adyacente'"), e => e.code === '23P01');
    await pg.exec("INSERT INTO reservas VALUES('otro-alojamiento',2,'CONFIRMED','2099-06-02','2099-06-05')");
    await pg.exec("UPDATE reservas SET estado='CANCELLED' WHERE id='historica'");
    await pg.exec("INSERT INTO reservas VALUES('liberada',1,'CONFIRMED','2099-06-02','2099-06-05')");
    assert.equal((await pg.query('SELECT count(*)::integer AS n FROM reservas')).rows[0].n, 4);
    console.log('OK PostgreSQL: bloqueo total y parcial, modificación, salida libre, otro alojamiento y cancelación');
  } finally { await pg.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

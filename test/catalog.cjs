require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
process.env.DATABASE_URL = '';
process.env.VERCEL = '';
process.env.DATA_FILE = 'data/catalog-test-' + randomUUID() + '.sqlite';
process.env.ADMIN_PASSWORD = 'CatalogTest2026!';
const { Database } = require('../dist/modules/alojamientos/database');
const { seed } = require('../dist/modules/alojamientos/seed');
const { expandCatalog } = require('../dist/modules/alojamientos/expand-catalog');
const { curateCatalog } = require('../dist/modules/alojamientos/curate-catalog');
const { catalogTarget } = require('../dist/modules/alojamientos/catalog-policy');
(async () => {
  const db = new Database();
  try {
    await db.ready();
    await db.transaction(seed);
    const first = await db.transaction(expandCatalog);
    await db.transaction(curateCatalog);
    assert.equal(first.cantones, 222);
    const cities = await db.db.manager.find('cities'),
      hotels = await db.db.manager.find('accommodations');
    assert.equal(cities.length, 222);
    assert.equal(new Set(cities.map((c) => c.codigo)).size, 222);
    assert.equal(new Set(cities.map((c) => c.provincia)).size, 24);
    assert.equal(hotels.length, 270);
    assert.ok(cities.every((c) => hotels.filter((h) => h.cityId === c.id).length === catalogTarget(c.name)));
    assert.equal(new Set(hotels.map(h=>h.image)).size,270);
    assert.equal(new Set(hotels.map(h=>h.nombre)).size,270);
    assert.equal(new Set(hotels.map(h=>h.descripcion)).size,270);
    const repeat = await db.transaction(expandCatalog);
    assert.equal(repeat.ciudades_nuevas, 0);
    assert.equal(repeat.alojamientos_nuevos, 0);
    const city=cities.find(c=>catalogTarget(c.name)===1),sample=hotels.find(h=>h.cityId===city.id);
    const extra=await db.transaction(async em=>{
      const result=[];for(let i=0;i<2;i++){const {id:unused,...fields}=sample;const h=await em.save('accommodations',{...fields,nombre:'Excedente '+i});const room=await em.save('room_types',{accommodationId:h.id,nombre:'Prueba',capacidadAdultos:2,capacidadNinos:0,habitaciones:1});await em.save('rate_plans',{roomTypeId:room.id,precioPorNoche:10,currency:'USD',cancellation:'Demo'});result.push(h);}
      await em.save('availability_products',{id:randomUUID(),accommodationId:result[1].id,checkin:'2026-11-01',checkout:'2026-11-02',guests:{number_of_adults:1,number_of_rooms:1},total:10,expiresAt:'2026-11-01'});return result;
    });
    const cleanup=await db.transaction(curateCatalog);
    assert.equal(cleanup.eliminados_sin_historial,1);assert.equal(cleanup.archivados_con_historial,1);
    assert.equal(await db.db.manager.findOneBy('accommodations',{id:extra[0].id}),null);
    assert.equal((await db.db.manager.findOneBy('accommodations',{id:extra[1].id})).published,false);
    assert.equal(await db.db.manager.countBy('accommodations',{published:true}),270);
    console.log(
      'Catálogo nacional: 222 cantones, 24 provincias, 270 alojamientos; fotos, nombres y descripciones distintos; carga idempotente.',
    );
  } finally {
    await db.onModuleDestroy();
    if (fs.existsSync(process.env.DATA_FILE)) fs.unlinkSync(process.env.DATA_FILE);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

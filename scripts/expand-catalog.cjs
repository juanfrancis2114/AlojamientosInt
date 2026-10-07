require('reflect-metadata');
require('dotenv').config({ quiet: true });
const { Database } = require('../dist/modules/alojamientos/database');
const { seed } = require('../dist/modules/alojamientos/seed');
const { expandCatalog } = require('../dist/modules/alojamientos/expand-catalog');
const { curateCatalog } = require('../dist/modules/alojamientos/curate-catalog');
(async () => {
  const db = new Database();
  try {
    await db.ready();
    const result = await db.transaction(async (em) => {
      await seed(em);
      await expandCatalog(em);return curateCatalog(em);
    });
    console.log(JSON.stringify(result));
  } finally {
    await db.onModuleDestroy();
  }
})().catch((e) => {
  console.error(
    'No se amplió el catálogo:',
    e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[URL oculta]'),
  );
  process.exitCode = 1;
});

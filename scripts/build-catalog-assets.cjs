const fs=require('node:fs');
const photos=JSON.parse(fs.readFileSync('resources/fotos-alojamientos.json','utf8')).filter(require('./photo-is-suitable.cjs'));
if(photos.length<270)throw new Error('Se necesitan 270 fotografías adecuadas distintas');
fs.writeFileSync('src/modules/alojamientos/catalog-photos.ts','// Fotografías de Wikimedia Commons; créditos conservados en photos.caption.\nexport const catalogPhotos='+JSON.stringify(photos)+';\n');
const sql=fs.readFileSync('supabase/migrations/004_estancias.sql','utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
fs.writeFileSync('src/modules/alojamientos/migration-estancias.ts','// Generado desde 004_estancias.sql para la actualización controlada en nube.\nexport const migrationEstancias='+JSON.stringify(sql)+';\n');

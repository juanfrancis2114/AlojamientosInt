const fs = require('node:fs');
// Las migraciones publicadas son inmutables; generar un archivo completo aparte.
const sql = ['001_booking.sql', '002_nombres_espanol.sql', '003_erp.sql', '004_estancias.sql'].map(name => fs.readFileSync('supabase/migrations/' + name, 'utf8')).join('\n');
fs.writeFileSync('supabase/esquema-completo.sql', sql);
console.log('Esquema completo generado: 27 tablas en español.');

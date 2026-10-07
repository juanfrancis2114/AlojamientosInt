const fs = require('node:fs');
const { tables, columns } = require('./spanish-schema.cjs');
const original = fs.readFileSync('supabase/migrations/001_booking.sql', 'utf8');
let sql = '-- Renombrado sin eliminar datos: tablas y columnas en español.\nBEGIN;\n';
for (const [oldName, newName] of Object.entries(tables)) {
  sql += `ALTER TABLE "${oldName}" RENAME TO "${newName}";\n`;
  const body = original.match(new RegExp(`CREATE TABLE IF NOT EXISTS "${oldName}" \\(([\\s\\S]*?)\\n\\);`))[1];
  for (const match of body.matchAll(/^  "([^"]+)"/gm)) {
    const name = match[1];
    if (columns[name]) sql += `ALTER TABLE "${newName}" RENAME COLUMN "${name}" TO "${columns[name]}";\n`;
  }
}
sql += 'COMMIT;\n';
fs.writeFileSync('supabase/migrations/002_nombres_espanol.sql', sql);
fs.writeFileSync('src/modules/alojamientos/nombres-base.ts', '// Nombres físicos de PostgreSQL/SQL.js. Generado por scripts/generate-spanish-migration.cjs.\nexport const nombresTablas: Record<string, string> = ' + JSON.stringify(tables, null, 2) + ';\nexport const nombresColumnas: Record<string, string> = ' + JSON.stringify(columns, null, 2) + ';\n');

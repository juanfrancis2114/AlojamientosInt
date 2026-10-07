const fs = require('node:fs');
const { parse } = require('csv-parse/sync');
const rows = parse(fs.readFileSync('resources/ecuador-divisiones.csv', 'utf8'), { columns: true, comment: '#', skip_empty_lines: true });
const regions = { '01':'Sierra','02':'Sierra','03':'Sierra','04':'Sierra','05':'Sierra','06':'Sierra','07':'Costa','08':'Costa','09':'Costa','10':'Sierra','11':'Sierra','12':'Costa','13':'Costa','14':'Amazonía','15':'Amazonía','16':'Amazonía','17':'Sierra','18':'Sierra','19':'Amazonía','20':'Insular','21':'Amazonía','22':'Amazonía','23':'Costa','24':'Costa' };
const cities = rows.filter(r => r.level === '2' && /^EC\d{4}$/.test(r.id) && regions[r.id.slice(2,4)]).map(r => ({ code:r.id.slice(2), name:r['name.local'], province:r['parent.name.local'], region:regions[r.id.slice(2,4)], latitude:Number(r['geo.lat']), longitude:Number(r['geo.lon']) }));
if (!cities.some(c => c.code === '1413')) cities.push({ code:'1413', name:'Sevilla Don Bosco', province:'Morona Santiago', region:'Amazonía', latitude:-2.31605, longitude:-78.10128 });
if (cities.length !== 222 || new Set(cities.map(c => c.code)).size !== 222) throw new Error('El catálogo debe tener exactamente 222 cantones únicos, encontrados: ' + cities.length);
fs.writeFileSync('src/modules/alojamientos/ecuador-data.ts', '// Cantones: Open Admin Data (CC BY 4.0), actualizado con Sevilla Don Bosco según INEC 2026.\n// Coordenadas referenciales de los cantones, no ubicaciones exactas de hoteles.\nexport const ecuadorCities = ' + JSON.stringify(cities.sort((a,b)=>a.code.localeCompare(b.code)),null,2) + ';\n');
console.log('Catálogo generado: ' + cities.length + ' cantones en ' + new Set(cities.map(c=>c.province)).size + ' provincias.');

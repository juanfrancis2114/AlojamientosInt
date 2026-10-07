const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const { parse } = require('dotenv');
const path = '.env';
const content = fs.readFileSync(path, 'utf8');
const values = parse(content);
if (!values.JWT_SECRET) { fs.appendFileSync(path, '\nJWT_SECRET=' + randomBytes(48).toString('base64url') + '\n'); console.log('Secreto JWT generado en .env privado; no se imprime.'); }
else { if (values.JWT_SECRET.length < 32) throw new Error('El secreto JWT existente es demasiado corto'); console.log('Secreto JWT privado existente conservado.'); }
if (!values.APP_ORIGIN) fs.appendFileSync(path, 'APP_ORIGIN=https://booking-prototipo-alojamientos.vercel.app\n');

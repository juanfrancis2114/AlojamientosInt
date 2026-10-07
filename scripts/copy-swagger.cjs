const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve('public/swagger');
fs.mkdirSync(output, { recursive: true });
const source = path.dirname(require.resolve('swagger-ui-dist/package.json'));
for (const name of [
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'swagger-ui.css',
  'favicon-32x32.png',
]) {
  // Vercel conserva .mjs como archivo web, sin convertirlo a CommonJS.
  fs.copyFileSync(path.join(source, name), path.join(output, name.replace(/\.js$/, '.mjs')));
}
fs.writeFileSync(
  path.join(output, 'init.mjs'),
  `window.addEventListener('load',function(){window.ui=SwaggerUIBundle({url:'/api/openapi.json',dom_id:'#swagger-ui',deepLinking:true,filter:true,docExpansion:'list',withCredentials:true,persistAuthorization:false,tryItOutEnabled:true,presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:'BaseLayout'});});`,
);
fs.writeFileSync(
  path.join(output, 'index.html'),
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kawsay Estancias · Documentación API</title><link rel="icon" href="/swagger/favicon-32x32.png"><link rel="stylesheet" href="/swagger/swagger-ui.css"></head><body><header style="max-width:1460px;margin:24px auto;padding:0 20px;font:16px system-ui"><h1>Kawsay Estancias · API</h1><p>Abre un endpoint, pulsa <strong>Try it out</strong> (probar) y después <strong>Execute</strong> (ejecutar). Para las operaciones privadas, inicia sesión en el sitio o usa Authorize con un JWT.</p><a href="/admin">Volver a administración</a> · <a href="/api/openapi.json">Contrato OpenAPI JSON</a></header><div id="swagger-ui"></div><script src="/swagger/swagger-ui-bundle.mjs"></script><script src="/swagger/swagger-ui-standalone-preset.mjs"></script><script src="/swagger/init.mjs"></script></body></html>`,
);
console.log('Swagger UI: assets estáticos preparados.');

# Evidencias de la rúbrica RDA 1

Fecha de preparación: 5 de octubre de 2026.

| Criterio | Evidencia preparada | Estado verificable |
|---|---|---|
| Despliegue público operativo | `vercel.json`, migración, guía de despliegue, health | Verificado públicamente el 6 de octubre de 2026; 21 comprobaciones en producción |
| Administración funcional | CRUD, publicación/despublicación, reservas, navegación y auditoría | Implementado; pruebas API y revisión navegador |
| Marketplace funcional | Catálogo, destinos, búsqueda, filtros, disponibilidad, cotización y reserva | Implementado; pagos claramente simulados |
| API documentada | `/api/docs`, `/api/openapi.json`, contrato original | Implementado |
| Base de datos operativa | SQL.js local; migración PostgreSQL de 20 tablas | Supabase real comprobado: 20 tablas en español, 18 relaciones y RLS |
| Diseño API-first | Validación AJV usando esquemas originales | Implementado |
| Contratos futuros | `docs/integracion.md` y OpenAPI | Documentado; OAuth2 externo identificado como futuro |
| SOA/EDA preliminar | Outbox transaccional, eventos, suscripciones | Implementado diseño preliminar; envío externo no activo |
| Documentación técnica | Arquitectura, modelo, integración y despliegue | Entregada |
| Dominio del estudiante | `docs/defensa.md` y recorrido del código | Requiere preparación y defensa del estudiante |

## Registro del despliegue real

- URL pública: https://booking-prototipo-alojamientos.vercel.app.
- URL Swagger: https://booking-prototipo-alojamientos.vercel.app/api/docs.
- Proveedor de aplicación: Vercel.
- Proyecto de Vercel creado y vinculado: `booking-prototipo-alojamientos`; sesión autenticada. Despliegue de producción público y operativo.
- Proveedor de base de datos: Supabase PostgreSQL.
- Conexión Supabase: PostgreSQL mediante Transaction pooler y TLS con certificado raíz verificado; credenciales privadas configuradas.
- Acceso sin autenticación de Vercel: HTTP 200 comprobado mediante peticiones públicas sin cookies ni tokens de Vercel.
- Reserva persistente en nube: creada, consultada en otra petición y cancelada; estancia de prueba liberada.

El requisito de acceso público y base operativa se comprobó en la fecha indicada. Debe volver a verificarse antes de la defensa, porque la rúbrica exige disponibilidad durante la demostración.

## Validación reproducible

`npm run test:api` comprueba lógica de reservas, cupo, idempotencia, aislamiento de usuarios, permisos y CRUD en una base local aislada. `npm run test:postgres` aplica el SQL real en PostgreSQL embebido PGlite y verifica tablas, claves, restricciones y permisos; esto valida sintaxis y estructura, no conectividad con Supabase. `npm run test:browser` recorre la interfaz en Chrome local y produce capturas en `artifacts/`.

Resultados obtenidos durante la implementación:

- Compilación TypeScript: correcta.
- API: 63 comprobaciones superadas, incluyendo la matriz REST de las prácticas y persistencia tras reiniciar el servidor.
- PostgreSQL embebido: migración de 20 tablas y 18 claves foráneas aplicada; restricciones, RLS y denegación de acceso anon comprobadas.
- Chrome: catálogo, búsqueda, disponibilidad, autenticación, CRUD, reserva, cancelación y persistencia comprobados; sin errores JavaScript; viewport móvil de 390 px sin desbordamiento horizontal.
- Capturas locales: `artifacts/marketplace-desktop.png`, `artifacts/admin-desktop.png`, `artifacts/reserva-confirmada.png`, `artifacts/marketplace-mobile.png`.
- `npm audit --omit=dev`: 0 vulnerabilidades reportadas en dependencias de producción al realizar la comprobación. Las herramientas de desarrollo incluyen avisos pendientes y no forman parte del runtime; no se declara seguridad absoluta.

Revisión de prácticas: 6 de octubre de 2026. Se incorporaron DTO, GET individual, PUT, Location, HATEOAS, filtro por nombre, comprobación de persistencia al reiniciar, contratos preliminares GraphQL/gRPC y workflow PostgreSQL para CI. El workflow aún no tiene una ejecución real en GitHub; Supabase y la URL pública se verificaron después de la implementación. Véase `docs/practicas-y-bitacora.md`.

## Verificación real de nube y esquema en español

Fecha UTC: 2026-10-06T20:15:27.481Z.

`node scripts/verify-cloud.cjs https://booking-prototipo-alojamientos.vercel.app` superó 15 comprobaciones. El CRUD usó una propiedad temporal que se eliminó. La reserva de demostración quedó cancelada en el historial; no se realizaron cobros ni envíos externos. Registro local sin secretos: `artifacts/cloud-verification.json`.

`node scripts/verify-supabase.cjs` confirmó las 20 tablas físicas en español, 18 claves foráneas y RLS en Supabase. `002_nombres_espanol.sql` conserva registros, permisos y relaciones. La API mantiene los nombres del contrato original para interoperabilidad.

El arranque espera explícitamente la inicialización de la base antes de cargar datos. Se usa NestJS 11 compatible con el runtime CommonJS de Vercel; la dependencia YAML tiene una versión corregida. Pruebas finales: compilación, 63 escenarios API, recorrido Chrome y 0 vulnerabilidades reportadas por `npm audit --omit=dev`.

## Evolución React y seguridad de la rúbrica anterior

Comprobación final UTC: 2026-10-06T21:27:43.559Z. Framework confirmado por el estudiante: React.

- Compilación NestJS + Vite: correcta; bundles React ESM `.mjs` conservados en Vercel.
- ESLint y TypeScript: correctos, sin errores.
- Unitarias Vitest/Testing Library: 24 pruebas superadas.
- API: 63 comprobaciones superadas, incluidos JWT, revocación, CORS y permisos.
- Chrome local: CRUD, reserva, cancelación, recarga, rutas privadas y logout; viewport de 390 px sin desbordamiento.
- Producción: 21 comprobaciones superadas; React, JWT, CORS, CRUD, Supabase, reserva, cancelación, outbox y logout.
- Chrome en producción: ruta /admin redirige a /login sin sesión; catálogo y modal de login operativos; móvil de 390 px sin desbordamiento; cero errores de ejecución.

Capturas reales: `artifacts/cloud-react-desktop.png` y `artifacts/cloud-react-mobile.png`. Registro de ejecución y recursos: `artifacts/cloud-react-browser.json`. La reserva de verificación quedó cancelada; no hay cobros reales. No se publican tokens ni secretos en estos archivos.

Documentos de apoyo: `docs/rubrica-rda3.md`, `docs/seguridad.md` y `docs/manual-usuario.md`. La presentación, reflexión personal y dominio del código deben ser preparados y demostrados por el estudiante.

## Kawsay Estancias: catálogo nacional y ERP

Verificado en producción: 2026-10-07T03:12:47.849Z. URL: https://booking-prototipo-alojamientos.vercel.app.

- 222 cantones, 24 provincias y 1.110 alojamientos: al menos cinco por cantón, comprobado contra la API pública. La carga es transaccional e idempotente; hoteles ficticios y fotos ilustrativas.
- Supabase real: 22 tablas físicas en español, 21 claves foráneas, RLS y restricciones de acceso.
- Dashboard con importes reales de registros guardados, gastos pagados/pendientes, resultado, margen, cancelaciones, evolución, distribución, mapa y ranking. Sin ventas inventadas.
- Usuarios: crear, editar, activar/desactivar, roles y cambio de contraseña; revocación de JWT verificada en nube. El historial se conserva.
- CRUD de gastos, categorías y destinos; FK y fechas inválidas comprobadas.
- El administrador no ve Mis reservas y no puede cotizar/crear reservas personales; pruebas API con cuerpos válidos.
- Eventos retirados del panel. Se conserva el diseño outbox y los contratos para el requisito SOA/EDA.
- Swagger renderizado en Chrome público y GET health ejecutado desde su interfaz con HTTP 200.
- Unitarias: 26; API aislada: 96 comprobaciones; esquema PostgreSQL/PGlite y catálogo aislado: correctos. ESLint y TypeScript: sin errores.
- Nube: 29 comprobaciones API/CRUD/sesiones. Chrome: login administrativo, dashboard, mapa, búsqueda de cinco hoteles de Sevilla Don Bosco, usuarios, 20 filas por página y vista móvil de 390 px sin desbordamiento ni errores JavaScript.
- npm audit --omit=dev: cero vulnerabilidades reportadas de ejecución.

Los registros temporales de gastos y alojamiento de la verificación se eliminaron; la reserva se canceló y la cuenta de prueba se desactivó. No hubo pagos reales. Las pruebas de reserva anteriores se conservan como historial cancelado.

Evidencias sin secretos: artifacts/cloud-verification.json, artifacts/cloud-react-browser.json y artifacts/swagger-verification.json. Capturas: artifacts/cloud-erp-dashboard.png, artifacts/cloud-erp-mobile.png, artifacts/cloud-erp-alojamientos.png y artifacts/swagger-operativo.png. Documentación y atribución de datos: docs/erp-y-catalogo.md.

## Ampliación y catálogo reducido: 7 de octubre de 2026

Verificación pública: 2026-10-07T13:11:43.683Z.

- 270 estancias en 222 cantones; una por destino y cinco en doce destinos principales. Nombres, descripciones y fotos distintos, con crédito y licencia abierta. Los excedentes referenciados se despublican; los demás se eliminan.
- Supabase real: 27 tablas, 31 claves foráneas y RLS comprobados desde la API administrativa del esquema.
- Perfil editable, calendario por fecha, factura simulada versionada/anulada y reseñas de estancias completadas con respuesta administrativa.
- Reserva coincidente rechazada inmediatamente, incluso con una cotización anterior; cancelar permite volver a elegir las fechas.
- 28 unitarias, 125 comprobaciones API aisladas, esquema PostgreSQL/PGlite, catálogo con conservación de referencias, ESLint y TypeScript: correctos.
- 40 comprobaciones públicas superadas; Chrome verifica módulos nuevos, perfil, vistas protegidas y móvil sin desbordamiento. Swagger renderizado y health ejecutado con HTTP 200.

Las evidencias anteriores documentan el catálogo previo; el estado actual es el descrito en esta ampliación. Las reservas de verificación se cancelaron y sus cuentas se desactivaron.


## Galerías — 7 de octubre de 2026

- Publicación Vercel dpl_8vgegZiGuT4NJGefWyoKQZ6GpWg4 operativa.
- Supabase: 28 tablas, 32 claves foráneas y RLS; 270 galerías con 1080 URLs distintas verificadas en producción.
- 30 pruebas unitarias, 140 comprobaciones de API, restricciones PostgreSQL y catálogo nacional aprobados.
- Chrome: selección de imágenes, edición y orden persistido, desplazamiento hasta disponibilidad y móvil comprobados.
- Producción: 43 comprobaciones de API aprobadas y recorrido React sin errores.

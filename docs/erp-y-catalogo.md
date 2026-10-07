# Catálogo nacional y administración ERP

Kawsay Estancias conserva el contrato de alojamientos del curso y usa React, Bootstrap, NestJS y PostgreSQL en Supabase. El sitio está en https://booking-prototipo-alojamientos.vercel.app.

## Cobertura de Ecuador

222 cantones de 24 provincias; 270 alojamientos públicos, uno por cantón y cinco en doce destinos principales. Se conservan las referencias de propiedades con historial. Los nombres, códigos, provincia, región y coordenadas están en `src/modules/alojamientos/ecuador-data.ts`.

Fuente geográfica: [open-admin-data/ecuador-administrative-divisions](https://github.com/open-admin-data/ecuador-administrative-divisions), licencia CC BY 4.0, CSV de divisiones y coordenadas cantonales. Se añade Sevilla Don Bosco, código 1413, conforme al [Clasificador Geográfico Estadístico INEC 2026](https://aplicaciones2.ecuadorencifras.gob.ec/SIN/descargas/cge2026.pdf). Las coordenadas son referencias cantonales; no ubicaciones reales de hoteles. El mapa usa Leaflet/OpenStreetMap y conserva atribución. Las fotografías son ilustrativas de Unsplash.

Los alojamientos añadidos son ficticios, identificados en descripción, dirección y marketplace. No se fabrican opiniones, ventas ni gastos. El alcance incluye todos los cantones, no todos los asentamientos o parroquias.

Carga explícita: `npm run db:catalog`, después de `npm run db:migrate`. Es transaccional y aplica la selección reducida con fotos diferentes de Wikimedia Commons y créditos. Solo elimina excedentes sin referencias; los demás se despublican. La ampliación controlada desde Vercel se ejecuta una vez mediante un marcador persistente. React pagina 24 tarjetas y el ERP 20 filas; la búsqueda consume `next_page` del contrato y se actualiza al confirmar reservas. Ver [estancias](estancias.md).

## APIs administrativas

Todas requieren sesión activa y rol administrativo comprobado en la base. No exponen hashes ni contraseñas.

| Recurso bajo `/api/v1/admin/erp` | Operaciones | Reglas |
|---|---|---|
| `/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | GET | Período calendario válido; agregación de registros guardados |
| `/usuarios`, `/usuarios/:id` | GET, POST; PATCH, DELETE | DELETE desactiva; historial conservado; sesiones revocadas al desactivar, cambiar rol o contraseña; propia cuenta y último administrador protegidos |
| `/gastos`, `/gastos/:id` | GET, POST; PATCH, DELETE | Importe positivo, centavos, fecha válida y relaciones existentes; estados PAGADO/PENDIENTE |
| `/categorias`, `/categorias/:id` | GET, POST; PATCH, DELETE | Nombre único; no elimina categorías con gastos |
| `/ciudades`, `/ciudades/:id` | GET, POST; PATCH, DELETE | Código cantonal único, coordenadas válidas; no elimina destinos con alojamientos |

Gastos y categorías se incorporaron en la migración 003. La migración 004 añade perfiles, calendario, facturas, detalles y reseñas de estancia: el modelo actual tiene 27 tablas, 31 claves foráneas, RLS y permisos restringidos a través del backend. Ambas migraciones conservan registros anteriores y son repetibles. Auditoría registra acciones administrativas en la misma transacción.

## Cálculos del dashboard

Valor de reservas = suma de totales CONFIRMED creados dentro del período. Canceladas no aportan ingresos. Gastos pagados y pendientes se separan según su estado y fecha de gasto. Resultado = reservas confirmadas − gastos pagados. Margen = resultado / valor de reservas × 100; sin reservas muestra cero. Cancelación = canceladas / reservas del período × 100. Ranking y porcentaje de destinos cuentan reservas confirmadas, no visitas ni búsquedas. Evolución mensual agrupa por creación de reserva y fecha de gasto. Estos importes son operativos y simulados, no ingresos bancarios ni contabilidad tributaria.

Los eventos de integración se retiraron de la interfaz. El outbox y los contratos permanecen en backend y documentación para cumplir la preparación de integración SOA/EDA del RDA1.

## Swagger

`/api/docs` sirve la interfaz y sus assets empaquetados; `/api/docs-json` y `/api/openapi.json` exponen el contrato. Desde Swagger, abrir un endpoint, pulsar Try it out y Execute. Las cookies del mismo origen permiten probar endpoints administrativos con la sesión del sitio. También acepta JWT mediante Authorize para clientes API; no se persiste el token en almacenamiento del navegador.

## Verificación

`npm run test:unit`, `npm run test:api`, `npm run test:postgres`, `npm run test:catalog`, `npm run test:browser`, `npm run lint`, `npm run check`. El catálogo aislado verifica 222 códigos, 24 provincias, 270 estancias con imágenes/nombres/descripciones distintas, idempotencia y conservación de referencias al reducirlo. Las pruebas ERP verifican CRUD, porcentajes, fechas, FK, revocación y exclusión de reservas personales del administrador. Las pruebas de estancias comprueban factura, perfil, calendario, reseña completada y bloqueo de reservas coincidentes.

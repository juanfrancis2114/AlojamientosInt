# Kawsay Estancias · Alojamientos · RDA 1

Marketplace y administración de alojamientos desarrollados sobre [Plantilla-Integracion-Sistemas](https://github.com/semestre5grupal-ops/Plantilla-Integracion-Sistemas). NestJS + TypeScript + TypeORM, contrato OpenAPI original, frontend React por componentes, Bootstrap, JWT y despliegue Vercel + Supabase PostgreSQL.

**El despliegue público con base de datos operativa es obligatorio para la evaluación.** Publicado y verificado: [marketplace](https://booking-prototipo-alojamientos.vercel.app), [administración](https://booking-prototipo-alojamientos.vercel.app/admin) y [Swagger](https://booking-prototipo-alojamientos.vercel.app/api/docs). Evidencias y fecha de comprobación en [docs/evidencias.md](docs/evidencias.md).

## Ejecutar localmente

Requiere Node.js 22 o superior.

```powershell
cd booking-prototipo
npm ci
npm run build
npm run start:prod
```

Sin DATABASE_URL, utiliza una base SQL.js persistente en `data/booking.sqlite`. Carga seis alojamientos iniciales y una cuenta administrativa local. Para cargar todos los cantones y el catálogo reducido de 270 estancias, ejecutar `npm run db:catalog` con el servidor detenido:

- Web: http://localhost:3000
- Administración: http://localhost:3000/admin
- Swagger: http://localhost:3000/api/docs
- OpenAPI: http://localhost:3000/api/openapi.json
- Salud: http://localhost:3000/api/v1/health
- Usuario local: `admin@booking.local`
- Contraseña local: `AdminDemo2026!`

Puedes crear tu cuenta de cliente desde la interfaz. El rol administrativo se verifica en el servidor. Para cambiar la configuración inicial, copia `.env.example` a `.env`. Las credenciales locales de demostración no deben utilizarse en producción.

## Funcionalidades

- Catálogo, filtros, destinos, fotos, descripción y reseñas de demostración.
- Búsqueda por destino, fechas, huéspedes y habitaciones.
- Disponibilidad, productos temporales y cotización previa.
- Reservas persistentes con localizador, modificación y cancelación.
- Idempotencia real y transacciones que evitan sobreventa.
- ERP: alojamientos, reservas, usuarios y roles, destinos, gastos, categorías y auditoría en español.
- Dashboard: importes de reservas, gastos pagados/pendientes, resultado, margen, cancelaciones, evolución mensual, mapa y ranking cantonal.
- Producción: 222 cantones y 270 alojamientos ficticios; uno por cantón y cinco en doce destinos principales, con fotos distintas y créditos de Wikimedia Commons.
- JWT HS256 con vencimiento y revocación, roles, aislamiento de reservas, contraseñas scrypt y cookie HttpOnly.
- Swagger con esquemas del contrato original y validación AJV.
- Modelo de 28 tablas relacionadas, migración PostgreSQL, índices, restricciones y RLS.
- Cuatro imágenes por estancia, miniaturas y navegación; edición y orden desde el ERP. Ver [galerías](docs/galerias.md).
- Auditoría y eventos outbox para integración futura.

Los pagos son simulados y se identifican en la interfaz. OAuth2 externo y entrega de webhooks son integraciones futuras documentadas, no funcionalidades activas.

## Validación

```powershell
npm run lint
npm run check
npm run test:unit
npm run test:api
npm run test:postgres
npm run test:catalog
```

La prueba de API usa una base aislada y comprueba 140 escenarios, incluyendo persistencia tras detener e iniciar el servidor. La prueba PostgreSQL aplica la migración real en PGlite y verifica 28 tablas, 32 claves foráneas, permisos y restricciones. Para recorrer la interfaz con Chrome instalado:

```powershell
npm run test:browser
```

La prueba de navegador inicia su propio servidor en el puerto 3102 y usa una base aislada, que elimina al finalizar. Realiza CRUD y una reserva de demostración, y la cancela al finalizar. Produce capturas de escritorio y móvil en `artifacts/`. No modifica la base habitual de desarrollo ni Supabase.

## Supabase y Vercel

Seguir [docs/despliegue.md](docs/despliegue.md). Aplicar las migraciones en orden: [001_booking.sql](supabase/migrations/001_booking.sql) y [002_nombres_espanol.sql](supabase/migrations/002_nombres_espanol.sql). La segunda renombra las 20 tablas y sus columnas al español conservando los datos. `npm run db:migrate` aplica las tres, incluida `003_erp.sql` para gastos, categorías, estado de usuarios y datos cantonales. En producción se exige DATABASE_URL; nunca se usa un archivo local de datos en Vercel. No se hace push al repositorio del curso.

## Documentación y defensa

Comparación de funciones y mejoras pendientes: [docs/comparacion-reto1is.md](docs/comparacion-reto1is.md).

- [ERP, catálogo nacional y fuentes de datos](docs/erp-y-catalogo.md)
- [Correspondencia con la rúbrica RDA 3](docs/rubrica-rda3.md)
- [Seguridad y riesgos OWASP](docs/seguridad.md)
- [Manual del usuario](docs/manual-usuario.md)
- [Arquitectura, modelo relacional y decisiones](docs/arquitectura.md)
- [APIs, contratos y SOA/EDA](docs/integracion.md)
- [Despliegue y comprobación de nube](docs/despliegue.md)
- [Rúbrica y evidencias](docs/evidencias.md)
- [Guion de defensa y preguntas](docs/defensa.md)
- [Correspondencia con las prácticas, matriz REST y bitácora](docs/practicas-y-bitacora.md)
- [README de la plantilla original](README.plantilla.md)

## Estructura

```text
frontend/src/                   Componentes React, hooks, Fetch y estilos
public/                         Frontend compilado por Vite; no editar a mano
src/main.ts                     HTTP, seguridad, Swagger y errores
src/modules/alojamientos/
  alojamientos.controller.ts    Rutas, autenticación y validación de contrato
  alojamientos.service.ts       Disponibilidad, reservas, idempotencia y CRUD
  database.ts                   28 esquemas TypeORM y transacciones
  contract.ts                   Contrato original + AJV
  seed.ts                       Catálogos y datos de demostración
contracts/                      Contratos originales de los cuatro dominios
supabase/migrations/            Esquema PostgreSQL de producción
scripts/                        Migraciones, despliegue y verificación
test/                           Pruebas API, PostgreSQL y navegador
docs/                           Evidencias y material de defensa
```

Los DTO y entidades originales de la plantilla se conservan como referencia. El CRUD usa `dto/admin-accommodation.dto.ts` y `ValidationPipe`; el modelo activo se define en `database.ts`. Los dominios Autos, Atracciones y Vuelos permanecen sin activar, fuera de la compilación de este reto. Los contratos GraphQL y gRPC añadidos describen adaptadores futuros, sin declarar servicios desplegados.

## Desarrollo del frontend React

Ejecutar `npm run start:dev` en una terminal y `npm run dev:web` en otra. Vite sirve http://localhost:5173 y redirige `/api` al backend local. `npm run build` compila NestJS y genera el frontend en `public/`. Los estilos editables están en `frontend/src/styles.css` y `frontend/src/react.css`; Bootstrap se importa desde el paquete instalado. El secreto JWT de producción es obligatorio y privado; configurar `JWT_SECRET` en `.env` y Vercel.

## Ampliación de estancias

Perfil editable, reseñas verificadas de estancias finalizadas con respuesta del administrador, facturas simuladas descargables y calendario por fecha. Una cuenta no puede crear reservas solapadas en el mismo alojamiento; cotización, confirmación y modificación lo revalidan en transacción. La disponibilidad se actualiza al reservar. Ver [guía de estancias](docs/estancias.md) y [comparación actualizada](docs/comparacion-reto1is.md).

# Despliegue obligatorio: Vercel + Supabase

El proyecto **no cumple la condición habilitante** hasta que haya una URL pública verificada con PostgreSQL operativo. Un archivo de configuración o una ejecución local no equivalen a estar desplegado.

## 1. Crear Supabase y aplicar el esquema

1. Crear un proyecto nuevo de Supabase y guardar la contraseña de la base de datos.
2. Abrir SQL Editor y ejecutar las migraciones `001_booking.sql`, `002_nombres_espanol.sql`, `003_erp.sql` y `004_estancias.sql`, en ese orden. Crea 27 tablas, 31 claves foráneas, índices, restricciones y RLS. Usar un proyecto nuevo: no ejecutar en una base ajena al prototipo.
3. En **Connect**, elegir **Transaction pooler** y copiar la cadena PostgreSQL con puerto 6543. Reemplazar el marcador de contraseña; codificar caracteres especiales en la contraseña mediante URL encoding. Usar el usuario completo `postgres.<project-ref>` de la cadena.
4. Configurar esa cadena únicamente en `DATABASE_URL` del servidor. Nunca en el código frontend, variables públicas ni Git.

Las tablas tienen RLS habilitado y permisos revocados a `anon` y `authenticated`, porque la aplicación accede mediante su backend. No utiliza Supabase REST directamente ni requiere una service_role key en el navegador. La conexión administrativa PostgreSQL debe mantenerse privada.

Alternativa: copiar `.env.example` a `.env`, completar DATABASE_URL y ejecutar `npm run db:migrate`; aplica las cuatro migraciones y detecta si el renombrado al español ya está aplicado. La ampliación controlada desde Vercel, utilizada cuando la red local bloquea PostgreSQL, se describe en [estancias](estancias.md).

## 2. Configurar Vercel

Vercel admite el punto de entrada NestJS `src/main.ts`; `vercel.json` selecciona el framework y la compilación. El contenido de `public/` se sirve como archivos estáticos.

Desde esta carpeta:

```powershell
npx vercel login
npx vercel link
```

En el proyecto de Vercel, configurar variables de entorno de **Production** y **Preview**:

| Variable | Valor |
|---|---|
| DATABASE_URL | Cadena de Transaction pooler de Supabase |
| DATABASE_SSL | true |
| DATABASE_CA | Certificado PEM oficial de Supabase; copia local en `certificates/supabase-ca.crt` |
| NODE_ENV | production |
| JWT_SECRET | Secreto aleatorio privado de al menos 32 caracteres |
| CORS_ORIGINS | Opcional: orígenes exactos separados por coma; sin comodines |
| ADMIN_EMAIL | Tu correo de administración, en minúsculas |
| ADMIN_PASSWORD | Contraseña nueva, al menos 10 caracteres; no usar la contraseña local de demo |
| SEED_DEMO | true para cargar seis propiedades iniciales; false para empezar sin catálogo de demo |
| APP_ORIGIN | https://booking-prototipo-alojamientos.vercel.app |

Las variables de administrador crean la primera cuenta si no existe. Cambiarlas luego no cambia la contraseña de una cuenta existente; para una evolución se debe implementar recuperación o rotación explícita. En producción no se crea el usuario local de demo automáticamente.

También puedes completar `.env` con la conexión y nuevas credenciales de administrador, y ejecutar `npm run deploy:configure`. El script envía los valores por stdin al proyecto vinculado de Vercel y los marca como secretos en Production y Preview, sin imprimirlos. Rechaza la contraseña local de demostración. No sustituye la migración ni publica la aplicación por sí solo.

Publicar:

```powershell
npx vercel --prod
```

También se puede importar tu propio repositorio en el panel de Vercel. No se debe publicar la solución dentro del repositorio del curso sin permisos del propietario. Este directorio es un clon local y no se ha hecho push al repositorio del docente.

## 3. Verificar la condición habilitante

1. Abrir la URL `.vercel.app` en una ventana privada, sin autenticación de Vercel. Si Deployment Protection la restringe, ajustar la configuración para que la demostración sea pública.
2. Abrir `/api/v1/health` y confirmar `status: ok` y `database: postgres`.
3. Abrir `/api/docs` y `/api/openapi.json`.
4. Registrarse, reservar, recargar y confirmar que la reserva persiste.
5. Consultar los registros en Supabase. Cancelar desde la interfaz y comprobar el cambio de estado.
6. Iniciar sesión como admin y demostrar CRUD, reservas, auditoría y eventos.
7. Guardar la URL pública, fecha de comprobación y capturas reales en `docs/evidencias.md`. Repetir el control antes de la defensa; la rúbrica exige que esté operativo durante la demostración.

Si falla TLS, revisar el hostname y la cadena oficial del pooler; no desactivar la verificación de certificados. Si faltan tablas, aplicar la migración; no habilitar `synchronize` en producción. Si no hay propiedades, revisar SEED_DEMO y ejecutar un CRUD administrativo.

Referencias oficiales: [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [Conexiones PostgreSQL de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

Para SSL se usa el certificado raíz oficial de Supabase: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. `DATABASE_CA` contiene el PEM completo; en `.env` se guarda entre comillas con saltos de línea reales. La verificación TLS permanece habilitada.

La compilación ejecuta NestJS y Vite. `frontend/` contiene el código React editable; `public/` se regenera. Las rutas `/admin`, `/reservas` y `/login` sirven el mismo documento para React Router. Los assets con hash se cachean durante un año; la API conserva Cache-Control no-store. Al migrar de tokens opacos a JWT, las sesiones anteriores requieren iniciar sesión nuevamente. El arranque de producción falla si no existe un JWT_SECRET seguro.

Los bundles de navegador usan extensión `.mjs` explícita. Esto evita que el builder NestJS de Vercel los transforme a CommonJS al incluir `public/` en la función. El backend conserva su compilación CommonJS. La verificación Chrome en nube comprueba la ejecución real de React, además de los códigos HTTP.

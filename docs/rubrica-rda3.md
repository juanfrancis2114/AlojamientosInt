# Correspondencia con la rúbrica del semestre anterior

Se mantiene el reto RDA 1 de alojamientos y su contrato de interoperabilidad, añadiendo los requisitos técnicos de RDA 3 indicados por el estudiante. Framework confirmado por el estudiante: React. Esta tabla identifica implementación y evidencias; la defensa y calificación corresponden al estudiante y al docente.

| Requisito | Implementación y evidencia |
|---|---|
| Backend REST reutilizado, CRUD completo | NestJS y TypeORM existentes; GET, POST, PUT, PATCH y DELETE; DTO y reglas de negocio |
| JWT y roles | `jwt-auth.ts`, sesión revocable en Supabase, rol admin/customer, pruebas de permisos |
| CORS | `src/common/origins.ts` y `app.enableCors`; lista exacta, credenciales y preflight |
| Validación y limpieza | DTO, class-validator, trim, AJV y renderizado seguro de texto en React |
| Manejo de errores | ProblemFilter, ApiError, mensajes de formularios, notificaciones y ErrorBoundary |
| Framework y componentes | React; Marketplace, Admin, Orders, Login, Dialogs y componentes compartidos |
| Rutas protegidas | React Router: `/reservas` requiere sesión; `/admin` requiere administrador; `/login` permite acceso |
| Formularios conectados y CRUD | AsyncForm + Fetch; creación, edición, eliminación y publicación en administración |
| Estado | BookingProvider/Context, useState, useMemo, useCallback y useResource |
| Diseño con framework CSS | Bootstrap importado localmente; formularios, tablas, alertas y utilidades, con identidad visual propia |
| Tres riesgos OWASP explicados | `docs/seguridad.md`: control de acceso, inyección, autenticación, criptografía y configuración |
| Comunicación cliente-servidor | `frontend/src/api.js`; JSON, cookies, errores y agrupación de GET simultáneos |
| Pruebas unitarias | Vitest y Testing Library: JWT, CORS, contraseñas, fechas, rutas, formularios, Fetch y transformación del CRUD |
| Pruebas de flujo | Integración API con 96 comprobaciones y Chrome con CRUD, reserva, cancelación, rutas y logout |
| Análisis estático | ESLint para frontend y backend activos; reglas de hooks, JSX y TypeScript; `npm run check` verifica tipos del backend |
| Optimización | Vite minifica y divide código; Admin/Orders se cargan bajo demanda; imágenes lazy; filtros useMemo; GET simultáneos agrupados |
| Caché y red | Assets con hash y caché immutable en Vercel; la API privada no se cachea; no se guarda el JWT en almacenamiento web |
| Despliegue y secretos | Vercel + Supabase, JWT_SECRET privado, DATABASE_URL privada y certificado TLS verificado |
| Logging y pruebas en nube | Errores internos en logs Vercel, auditoría persistente y script verify-cloud |
| Documentación técnica y funcional | Arquitectura, integración, seguridad, despliegue y manual del usuario |
| Presentación y defensa | `docs/defensa.md`; debe practicarla y realizarla personalmente el estudiante |
| Reflexión y lecciones aprendidas | Puntos de reflexión abajo; el estudiante debe redactar su experiencia propia |

## Comandos reproducibles

```powershell
npm ci --include=dev
npm run build
npm run lint
npm run check
npm run test:unit
npm run test:api
npm run test:postgres
npm run test:browser
```

El workflow de GitHub incorpora build, análisis estático, unitarias y pruebas API contra PostgreSQL efímero de CI. No se declara una ejecución real de GitHub si no se ha subido el repositorio y ejecutado el workflow.

## Evidencia de depuración y rendimiento

En Chrome DevTools, Network permite comprobar los JSON, los códigos 201/204/400/401/403, los chunks diferidos y las respuestas de error. Application muestra la cookie HttpOnly/Secure y ausencia de JWT en localStorage. Console permite comprobar ausencia de errores de ejecución. Las pruebas de navegador registran pageerror y verifican que el viewport de 390 px no desborda.

La compilación genera archivos JS/CSS minificados con hash. Como referencia inicial, el bundle principal ocupa aproximadamente 90 kB gzip y Bootstrap + estilos unos 34 kB gzip; las cifras exactas aparecen en `npm run build`. No se presenta una puntuación Lighthouse ni una métrica de latencia inventada. Las imágenes externas dependen de su proveedor; son imágenes de demostración.

## Reflexión técnica para preparar la defensa

La autorización debe repetirse en el backend aunque React oculte una página. Un JWT firmado puede revocarse si se conserva una sesión de control. CORS no es autorización ni una defensa CSRF suficiente por sí solo. Validación de datos, normalización y codificación de salida cumplen funciones diferentes. La compatibilidad local no demuestra compatibilidad del runtime en nube, por lo que se realizan pruebas reales después del despliegue. La idempotencia y las transacciones protegen la reserva incluso con reintentos de red.

El estudiante debe relacionar esas decisiones con problemas que observó, explicar el código y expresar qué cambiaría en una siguiente versión. Esta guía no sustituye su reflexión personal.

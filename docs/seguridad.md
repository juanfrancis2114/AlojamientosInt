# Seguridad aplicada y riesgos OWASP

Proyecto académico de alojamientos. Este documento describe controles implementados y pruebas reproducibles; no es una certificación ni una auditoría completa. Referencia: [OWASP Top 10:2025](https://top10.owasp.org/2025/).

## Autenticación y autorización

El backend firma JWT con HS256 y una clave privada aleatoria de entorno. El token contiene sub (usuario), role, jti (identificador), iss=booking-prototipo, aud=booking-web, iat y exp. Su duración es una hora. `jwt-auth.ts` verifica la firma y limita explícitamente el algoritmo; también exige emisor, audiencia, identidad, identificador y vencimiento. Decodificar el JSON no equivale a verificar un JWT.

Cada JWT tiene su hash SHA-256 en `sesiones`, con propietario y vencimiento. Después de verificarlo, el backend comprueba esa sesión y consulta el usuario y su rol actual. Logout elimina el registro y borra la cookie, de modo que un JWT todavía no vencido queda revocado. No se confía exclusivamente en el rol que muestra React ni en el enviado por el cliente. El registro siempre crea un cliente. Se comprueba también que la cuenta esté activa. Desactivar una cuenta, cambiar su rol o restablecer su contraseña desde el ERP revoca sus sesiones. El administrador no puede crear reservas personales y consulta las reservas operativas en el panel; la regla se aplica también en backend. Los listados de usuarios nunca exponen hashes de contraseña.

React utiliza la cookie booking_session HttpOnly, Secure en producción y SameSite Strict. No guarda JWT en localStorage ni sessionStorage. Swagger y clientes API pueden usar Authorization: Bearer. Los JWT están firmados, no cifrados: el payload no contiene contraseña ni secretos. OAuth2 externo y renovación automática son evoluciones futuras; cuando vence la sesión se vuelve a iniciar sesión.

Las contraseñas se derivan mediante scrypt con sal aleatoria por usuario. La comparación utiliza timingSafeEqual. El login exige contraseñas de 10 a 128 caracteres. JWT_SECRET y DATABASE_URL se guardan en `.env` ignorado por Git y como secretos de Vercel; el frontend no recibe esas variables. La conexión PostgreSQL usa TLS con certificado raíz de Supabase y rejectUnauthorized=true.

## Riesgos explicados y controles

| Riesgo OWASP 2025 | Ejemplo concreto | Control implementado | Evidencia |
|---|---|---|---|
| A01: control de acceso defectuoso | Un cliente intenta abrir administración o consultar la reserva de otro usuario | React Router restringe páginas; el backend verifica rol y propietario en cada operación. Consultar una reserva ajena responde 404 | Pruebas de API: cliente sin permiso, aislamiento de propietarios; unitarias de ProtectedRoute |
| A05: inyección, incluido XSS | Insertar SQL en campos o mostrar HTML aportado por un usuario | TypeORM usa consultas parametrizadas; DTO/AJV validan datos. React renderiza texto sin dangerouslySetInnerHTML; CSP limita scripts al mismo origen | DTO rechaza campos desconocidos y tipos inválidos; prueba de mensaje malicioso verifica que no se crea una imagen ejecutable |
| A07: fallos de autenticación | Alterar un JWT para cambiar de cliente a administrador, reutilizarlo tras logout o enviar un token vencido | Verificación de firma, HS256, issuer, audience y expiración; sesión revocable; rol actual consultado en base; límite básico de intentos | Unitarias de token alterado, vencido, otra audiencia/emisor/clave/algoritmo; API rechaza JWT modificado y revocado |
| A04: fallos criptográficos | Filtrar contraseñas guardadas sin hash o usar una conexión de base sin verificar TLS | scrypt con sal, secretos privados, cookie Secure y TLS verificado | Unitarias de hash/sal; configuración de base y certificado; secretos privados en Vercel |
| A02: configuración insegura | Permitir que cualquier sitio use las cookies para escribir en la API | CORS con lista exacta, sin comodines y con credentials; rechazo de escrituras desde orígenes extraños; SameSite y cabeceras de seguridad | Unitarias de orígenes exactos; API comprueba CORS y rechazo 403 |

## Validación, limpieza y errores

`ValidationPipe` transforma DTO, aplica whitelist y rechaza propiedades desconocidas. Los campos de texto administrativos se recortan con trim; se validan longitudes, protocolos HTTPS, números enteros positivos, booleanos y precios con máximo dos decimales. AJV valida los cuerpos del contrato de reservas. Las fechas deben existir, tener orden correcto y respetar la estancia máxima de 90 noches. La propiedad de una reserva y el precio se calculan en el servidor.

Validar, normalizar y codificar la salida son controles distintos. No se elimina arbitrariamente texto legítimo: React codifica el contenido al renderizarlo. ESLint prohíbe `react/no-danger`. No hay concatenación de parámetros del usuario en SQL. La consulta SQL manual de bloqueo es constante.

Los errores HTTP tienen status, detail e instance. Un error interno responde un mensaje genérico y se registra en el servidor; no se devuelven stack traces ni contraseñas. Los fallos de formularios se muestran como texto y las acciones se desactivan mientras esperan. El error boundary de React ofrece recargar si falla una página.

## CORS y protección frente a CSRF

`APP_ORIGIN`, los dominios propios que Vercel proporciona y `CORS_ORIGINS` forman una lista de orígenes exactos. En desarrollo se admite localhost:5173. Los métodos permitidos son GET, POST, PUT, PATCH, DELETE y OPTIONS; se autorizan las cabeceras del contrato y se expone Location. El navegador envía cookies; la API requiere su autenticación normal.

CORS controla la lectura desde el navegador; no sustituye autorización ni impide por sí mismo todas las escrituras. Por eso también se rechazan escrituras con Origin no autorizado y se utiliza SameSite Strict. Clientes servidor a servidor sin Origin siguen necesitando JWT y permisos.

## Pruebas y límites prácticos

Ejecutar `npm run lint`, `npm run check`, `npm run test:unit`, `npm run test:api` y `npm run test:browser`. Para producción, `node scripts/verify-cloud.cjs https://booking-prototipo-alojamientos.vercel.app` crea y cancela una reserva de demostración y comprueba autenticación, CORS y revocación.

El límite de intentos de login actual es por instancia de Node, no un limitador distribuido. No hay MFA, recuperación de contraseña ni un proveedor OAuth2 externo. Las suscripciones webhook se guardan, pero no se ejecuta un worker externo; al implementarlo habrá que controlar SSRF. Los pagos son simulados. `npm audit --omit=dev` comprueba dependencias del runtime; las herramientas de desarrollo tienen avisos separados. Estos límites están documentados sin declarar seguridad absoluta.

Referencias técnicas: [jsonwebtoken: firma y verificación](https://github.com/auth0/node-jsonwebtoken), [CORS en NestJS](https://docs.nestjs.com/security/cors), [Componentes React](https://react.dev/learn), [Bootstrap](https://getbootstrap.com/docs/5.3/getting-started/introduction/).

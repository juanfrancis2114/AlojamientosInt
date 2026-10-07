# API-first e interoperabilidad futura

## Contratos

El contrato original permanece en `contracts/alojamientos-openapi.yaml`. La aplicación usa sus esquemas con AJV para validar búsquedas, disponibilidad, detalles, cotizaciones, creación/modificación de reservas y suscripciones. Swagger integra los cuerpos y respuestas del contrato con las operaciones administrativas reales. Se puede descargar el contrato operativo en `/api/openapi.json` y probarlo en `/api/docs`.

La base efectiva de la API es `/api/v1`. El contrato original usa servidores ilustrativos de Booking Hub: **esas direcciones no son un despliegue de este proyecto**. La versión operativa declara el servidor relativo del despliegue.

| Método y ruta | Consumidor | Función |
|---|---|---|
| POST /search | Público | Buscar por fechas, huéspedes, ciudad y país; requiere X-Device-Fingerprint |
| POST /availability | Público | Consultar disponibilidad y obtener product_id temporal |
| POST /bulk-availability | Público / futura orquestación | Consultar varios alojamientos |
| POST /details | Público | Consultar descripción, fotos y servicios |
| POST /details/changes | Sesión | Consultar cambios desde last_change |
| POST /chains, /constants | Público | Catálogos de cadenas, destinos y servicios |
| POST /reviews, /reviews/scores | Público | Reseñas y puntuaciones |
| POST /orders/preview | Sesión | Cotización vinculada al propietario |
| POST /orders/create | Sesión | Confirmación idempotente; Idempotency-Key UUID v4 |
| GET /orders/{orderId} | Propietario / admin | Consultar reserva |
| POST /orders/{orderId}/modify | Propietario / admin | Modificación idempotente con revalidación de cupo |
| POST /orders/{orderId}/cancel | Propietario / admin | Cancelación idempotente y liberación de cupo |
| GET, POST /webhooks; DELETE /webhooks/{id} | Admin | Administrar suscripciones futuras |
| GET /catalog, /cities, /health | Público | Catálogo enriquecido, ciudades y salud de base de datos |
| POST /auth/login, /auth/register, /auth/logout; GET /auth/me | Clientes y admin | Autenticación de prototipo |
| GET, POST /admin/accommodations | Admin | Listar/crear propiedades |
| GET, PUT, PATCH, DELETE /admin/accommodations/{id} | Admin | Consultar, reemplazar, editar o eliminar propiedades |
| GET /admin/orders, /admin/events, /admin/audit | Admin | Gestión operativa y evidencia de integración |

Identificadores de propiedades y ciudades: enteros, según el contrato. Reservas, cotizaciones, eventos y claves idempotentes: UUID. Un reintento con la misma clave y mismo contenido devuelve la respuesta guardada; cambiar el cuerpo o la operación devuelve 409. El servidor identifica al propietario desde la sesión, nunca desde un ownerId enviado por el navegador.

El CRUD administrativo añade `Location` al crear, GET individual con enlaces HATEOAS, PUT completo con 204, PATCH parcial con 200 y filtro `?nombre=` en la lista administrativa y el catálogo público. Los DTO validan campos, tipos y límites antes de aplicar reglas de negocio. La matriz completa está en `docs/practicas-y-bitacora.md`.

Se añadieron contratos preliminares de lectura en `contracts/alojamientos-integration.graphql` y `contracts/alojamientos-integration.proto`, siguiendo las prácticas de semanas 3 y 4. No hay un endpoint GraphQL ni un servidor gRPC activos; el servicio de dominio será compartido por sus futuros adaptadores.

## Decisiones y diferencias documentadas

El contrato propone OAuth2 externo; esta versión implementa JWT HS256 emitido por el backend del proyecto. Verifica firma, emisor `booking-prototipo`, audiencia `booking-web`, expiración y `sub`; obtiene el rol actual de la base. Acepta Authorization Bearer o cookie HttpOnly y comprueba una sesión revocable. Un proveedor OAuth2 y sus scopes siguen siendo integración futura.

El prototipo solo acepta `payment_reference` con prefijo `DEMO-`, indicado en la interfaz y documentación. En integración real, esta referencia debe validarse con el servicio de pagos mediante comunicación servidor a servidor; nunca confiar solo en texto enviado por un cliente. `ORDER_CONFIRMED` describe una reserva académica confirmada, no un cobro real.

Las respuestas contienen campos adicionales útiles para la interfaz, compatibles con los esquemas abiertos de referencia. La implementación de cambios añade publication state. La modificación emite `ORDER_MODIFIED`, extensión preliminar; las suscripciones originales aceptan ORDER_CONFIRMED y ORDER_CANCELLED. Los errores usan `application/problem+json` con status, detail e instance. Los enlaces de las reservas son relativos al mismo origen, y se omiten modify/cancel cuando el estado está cancelado.

## Diseño SOA/EDA

Responsabilidades futuras: Alojamientos (catálogo e inventario), Identidad (usuarios y OAuth2), Pagos (autorización y reembolsos), Notificaciones (correo de confirmación), Orquestación (paquetes entre dominios).

```json
{
  "eventId": "UUID del registro outbox",
  "eventType": "ORDER_CONFIRMED",
  "timestamp": "2026-10-05T15:00:00.000Z",
  "resourceId": "UUID de reserva",
  "data": { "order_id": "UUID de reserva", "status": "CONFIRMED", "currency": "USD", "total_price": 178 }
}
```

La tabla outbox contiene el evento junto con la transacción de reserva. Esto evita el fallo de guardar una reserva y perder el aviso por un error de red. Un futuro worker entregará eventos pendientes a suscriptores con firma HMAC-SHA256, deduplicación por eventId, reintentos exponenciales, contador de intentos y cola de errores. La entrega será al menos una vez; los consumidores deberán ser idempotentes. El worker necesitará una política contra SSRF y limitar redes privadas antes de activar destinos arbitrarios. **El worker y la entrega HTTP aún no se implementan**, conforme al carácter preliminar exigido por la rúbrica.

## Autenticación operativa

`POST /auth/login` y `/auth/register` responden con `user`, `access_token` (JWT), `token_type: Bearer` y `expires_in: 3600`, y establecen una cookie HttpOnly. React no guarda el token en localStorage. `GET /auth/me` verifica identidad y `POST /auth/logout` revoca la sesión y borra la cookie. Los endpoints administrativos aceptan JWT Bearer o cookie, ambos documentados en Swagger. El registro siempre asigna el rol customer.

# Contrato propio de Kawsay Estancias

Fuente: `contracts/kawsay-estancias-openapi.yaml`, OpenAPI 3.0.3, versión 1.2.0.

Este contrato fue diseñado para el núcleo REST del proyecto. Sus 25 rutas y 32 esquemas documentan las solicitudes, respuestas, autenticación y reglas propias. Conserva nombres de operaciones compatibles con la plantilla académica, pero no importa sus esquemas ni usa servidores ficticios de Booking Hub.

## Decisiones propias verificables

- La API opera en Ecuador y USD; no inventa conversiones ni cobros reales.
- Una reserva confirmada bloquea todas las noches del alojamiento para todos los usuarios. Se documentan las respuestas de disponibilidad y HTTP 409.
- La respuesta de confirmación devuelve `locator`, el código de reserva `BP-XXXXXXXX`, junto con fechas, importe y estado.
- Confirmar, modificar y cancelar requieren `Idempotency-Key`. Repetir una solicitud con la misma clave no crea otra reserva.
- La autenticación usa JWT Bearer o cookie HttpOnly y sesiones revocables; OAuth2 externo es futuro.
- Se consulta el outbox y se registran suscripciones HTTPS para integración futura. El envío automático todavía no está implementado.

## Demostración para el profesor

1. Abrir `/api/contrato.yaml` y mostrar título propio, versión, servidores, `x-business-rules` y esquemas de reserva.
2. Abrir `src/modules/alojamientos/contract.ts`: el backend carga ese mismo YAML y compila sus esquemas con AJV.
3. Abrir `/api/docs`. Ejecutar `POST /api/v1/search` con `X-Device-Fingerprint: demo-profesor` y cuerpo `{}`. Mostrar HTTP 400 con errores del contrato.
4. Mostrar que `POST /api/v1/auth/register` rechaza un nombre como `Juan123` por el esquema propio.
5. Confirmar una reserva con una cuenta de viajero y mostrar el código `locator`. Consultar `/api/v1/admin/events` como administrador para ver su evento `ORDER_CONFIRMED`.
6. Explicar que otro sistema puede descargar el contrato para desarrollar su cliente y que un futuro worker podrá entregar los eventos ya persistidos.

El documento operativo `/api/openapi.json` combina este contrato del núcleo con los DTO de las extensiones administrativas. La arquitectura es híbrida: núcleo guiado por contrato y extensiones documentadas por código. La plantilla se utilizó inicialmente; este contrato propio se formalizó durante la evolución del proyecto. Para sostener el enfoque de contrato primero en cambios futuros, editar y revisar el YAML antes de modificar esas operaciones.

# Contrato propio de Kawsay Estancias

Fuente: `contracts/kawsay-estancias-openapi.yaml`, OpenAPI 3.0.3, versión 1.3.1.

Este contrato fue diseñado para el núcleo REST del proyecto. Sus 27 rutas y 35 esquemas documentan las solicitudes, respuestas, autenticación y reglas propias. Conserva nombres de operaciones compatibles con la plantilla académica, pero no importa sus esquemas ni usa servidores ficticios de Booking Hub.

## Decisiones propias verificables

- La API opera en Ecuador y USD; no inventa conversiones ni cobros reales.
- Una reserva confirmada bloquea todas las noches del alojamiento para todos los usuarios. Se documentan las respuestas de disponibilidad y HTTP 409.
- La respuesta de confirmación devuelve `locator`, el código de reserva `BP-XXXXXXXX`, junto con fechas, importe y estado.
- Confirmar, modificar y cancelar requieren `Idempotency-Key`. Repetir una solicitud con la misma clave no crea otra reserva.
- La autenticación usa JWT Bearer o cookie HttpOnly y sesiones revocables; OAuth2 externo es futuro.
- Solo un administrador activo puede crear más administradores mediante `POST /admin/erp/usuarios`. El servicio comprueba nuevamente su rol y estado desde la base de datos dentro de la transacción. El registro público siempre crea viajeros.
- Se consulta el outbox y se registran suscripciones HTTPS para integración futura. El envío automático todavía no está implementado.

## Demostración para el profesor

1. Abrir `/api/contrato.yaml` y mostrar título propio, versión, servidores, `x-business-rules` y esquemas de reserva.
2. Abrir `src/modules/alojamientos/contract.ts`: el backend carga ese mismo YAML y compila sus esquemas con AJV.
3. Abrir `/api/docs`. Ejecutar `POST /api/v1/search` con `X-Device-Fingerprint: demo-profesor` y cuerpo `{}`. Mostrar HTTP 400 con errores del contrato.
4. Mostrar que `POST /api/v1/auth/register` rechaza un nombre como `Juan123` por el esquema propio.
5. Confirmar una reserva con una cuenta de viajero y mostrar el código `locator`. Consultar `/api/v1/admin/events` como administrador para ver su evento `ORDER_CONFIRMED`.
6. Explicar que otro sistema puede descargar el contrato para desarrollar su cliente y que un futuro worker podrá entregar los eventos ya persistidos.

El documento operativo `/api/openapi.json` combina este contrato del núcleo con los DTO de las extensiones administrativas. La arquitectura es híbrida: núcleo guiado por contrato y extensiones documentadas por código. La plantilla se utilizó inicialmente; este contrato propio se formalizó durante la evolución del proyecto. Para sostener el enfoque de contrato primero en cambios futuros, editar y revisar el YAML antes de modificar esas operaciones.

## Ejemplo de evolución con contrato primero

La revisión 1.3.0 añade la definición explícita de creación de administradores. El commit `fb0b11f` registra `AdminUserCreate`, `AdminUserView`, la operación y sus permisos antes de implementar el botón dedicado, la revalidación transaccional y las pruebas de esta mejora.

La revisión 1.3.1 exige `activo: true` al crear usuarios o administradores. El commit `d201b8c` registra esta regla antes de implementar el cambio. La desactivación posterior de cuentas existentes sigue disponible mediante edición o la acción Desactivar.

Para probarla: iniciar sesión como administrador, abrir Usuarios y pulsar Crear administrador. Completar nombre, correo y contraseña. La cuenta creada puede acceder al centro de operaciones y crear otros administradores. Un viajero recibe HTTP 403 al llamar al mismo endpoint y una solicitud sin sesión recibe HTTP 401.

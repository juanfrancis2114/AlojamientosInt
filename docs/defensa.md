# Guion de demostración y defensa

## Recorrido de 8–10 minutos

1. Abrir la URL pública en una ventana privada. Mostrar catálogo y `/api/v1/health`: la base debe indicar `postgres`. Sin este paso no se cumple la condición habilitante.
2. Iniciar sesión como administrador. Crear una estancia con precio y habitaciones, editarla y mostrar que aparece en el catálogo. Crear otra estancia de prueba y eliminarla antes de generar cotizaciones. Despublicar y republicar para demostrar gestión operativa.
3. Registrarse como cliente. Buscar destino y fechas, consultar detalles y disponibilidad. Mostrar precio calculado y cotización antes de confirmar.
4. Confirmar una reserva de demostración. Mostrar localizador y Mis reservas. Recargar para evidenciar persistencia.
5. Modificar fechas, revisar el nuevo precio y cancelar. Explicar que la cancelación libera habitaciones.
6. Abrir Swagger y el contrato descargable. Señalar las tres operaciones del flujo de reserva y el header Idempotency-Key.
7. En administración, mostrar dashboard, gastos, usuarios y actividad del CRUD. Explicar la outbox preparada en backend para integración futura.
8. Mostrar en Supabase las tablas y claves foráneas. Mostrar resultados de pruebas automatizadas y el diagrama de arquitectura.

## Preguntas que debes poder responder

**¿Por qué API-first?** Los esquemas del contrato existen antes de la implementación; AJV valida contra ellos y Swagger los publica. La interfaz es un consumidor de la API, no accede a las tablas directamente.

**¿Dónde vive cada responsabilidad?** `frontend/src/` contiene componentes React. `BookingProvider.jsx` comparte sesión y estado; `api.js` realiza Fetch; `ProtectedRoute.jsx` restringe páginas. El controlador decide la operación y valida el contrato. `alojamientos.service.ts` aplica reglas de negocio. `database.ts` declara el modelo y las transacciones. La migración crea el esquema PostgreSQL.

**¿Qué evita duplicados?** UUID v4 en Idempotency-Key, usuario y operación asociados, huella canónica del JSON y respuesta guardada. La cotización también es única por reserva, así que cambiar la clave no permite confirmar dos veces la misma oferta.

**¿Qué evita sobreventa?** Revalidar cupo al confirmar dentro de una transacción y bloquear la fila común. Dos instancias concurrentes no pueden confirmar la última habitación al mismo tiempo.

**¿Por qué consultar disponibilidad no es reservar?** La oferta vence y no retiene inventario. Se valida nuevamente al crear la reserva; otra persona podría reservar antes y se devuelve 409.

**¿Quién es el propietario?** El servidor obtiene userId de la sesión autenticada. No acepta el propietario enviado por el cliente. Otro usuario recibe 404 al consultar una reserva ajena.

**¿Cómo se calcula el precio?** Tarifa vigente × noches × habitaciones, en USD y redondeada a centavos. Se guarda el importe de la reserva; cambiar una tarifa no altera reservas ya confirmadas, salvo modificación explícita.

**¿Por qué no borrar hoteles con reservas?** Para conservar relaciones, evidencia e historial. Se usa despublicación para retirarlos de la venta.

**¿Cuál es la diferencia entre PUT y PATCH?** PUT exige todos los campos editables y responde 204 sin cuerpo; PATCH acepta solo lo que quieres cambiar y responde 200 con el resultado. La API rechaza campos desconocidos, importes enviados como texto y null en campos obligatorios. POST responde 201 e incluye Location, la URI donde consultar lo creado.

**¿Cómo probaste que la base es persistente?** La prueba detiene y vuelve a iniciar Node con la misma base. La reserva sigue cancelada, el alojamiento sigue despublicado y la sesión sigue válida. En la defensa hay que repetir esta evidencia contra Supabase.

**¿Qué falta para integrar pagos reales?** Validar la autorización en el servicio de pagos, verificar la referencia servidor a servidor y coordinar confirmación/reembolso. Actualmente todo pago es simulado.

**¿Qué aportan los eventos?** Desacoplan reservas de notificaciones y otros servicios. La outbox guarda el evento en la misma transacción; un worker futuro puede entregarlo sin perderlo.

**¿Qué diferencia hay entre SQL.js y Supabase?** SQL.js permite desarrollo local sin infraestructura y guarda un archivo. Supabase ejecuta PostgreSQL persistente en nube, con restricciones, RLS e infraestructura real. La demostración habilitante debe usar Supabase.

**¿Cómo funciona JWT y por qué no es OAuth2?** `jwt-auth.ts` firma con HS256 y verifica algoritmo, firma, emisor, audiencia y vencimiento. El hash del token está en `sesiones`, por lo que logout lo revoca. El servidor consulta al usuario y su rol actual; el navegador usa una cookie HttpOnly. JWT es un formato de token; OAuth2 externo sigue siendo una integración futura.

No memorices solo las respuestas: localiza cada regla en el código y ejecuta los escenarios. El dominio del estudiante es una evidencia de la defensa, no un atributo que pueda garantizarse por entregar archivos.

## Evidencias adicionales del semestre anterior

Mostrar React DevTools o el árbol de componentes, las rutas privadas y las pestañas Network/Application del navegador. La cookie `booking_session` es HttpOnly, Secure en producción y SameSite Strict; no hay JWT en localStorage. Mostrar `npm run lint`, `npm run test:unit` y un JWT alterado rechazado por la API. Explicar tres riesgos y controles de `docs/seguridad.md`. Seguir `docs/rubrica-rda3.md` para la matriz de evidencias y preparar una reflexión propia del trabajo.

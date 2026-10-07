# Aplicación de las prácticas al proyecto de alojamientos

Se revisaron los cinco HTML de `practicas.zip`. Sus ejemplos usan Productos, y se adaptaron al dominio de Alojamientos del contrato y la rúbrica RDA 1. Las instrucciones de un laboratorio son material de referencia; la evaluación del proyecto sigue siendo la rúbrica entregada por el estudiante.

| Práctica | Conceptos utilizados | Evidencia en este proyecto |
|---|---|---|
| Semana 1: API base NestJS + Swagger | Módulo, controlador, servicio, prefijo versionado, contrato previo, GET lista/detalle, errores 400/404 | `/api/v1/catalog`, `/catalog/{id}`, módulo y controlador de alojamientos; Swagger con contratos |
| Semana 2: CRUD REST | DTO, ValidationPipe, POST + Location, GET por ID, PUT completo, PATCH parcial, DELETE, enlaces HATEOAS | CRUD de `/api/v1/admin/accommodations`, DTO de creación y actualización; matriz de pruebas abajo |
| Laboratorio de base de datos | Persistencia TypeORM/PostgreSQL, NUMERIC, filtro por nombre, reinicio, secretos, CI y nube | 22 tablas en migración, transformación de importes, `?nombre=`, prueba de reinicio, `.env` excluido, GitHub Actions preparado, Vercel + Supabase |
| Semana 3: gRPC | Contratos .proto, unary, server streaming y códigos de error | `contracts/alojamientos-integration.proto`, diseño futuro documentado; servicio gRPC no activo |
| Semana 4: GraphQL | Esquema, selección de campos, resolvers sobre servicios existentes, filtro por precio | `contracts/alojamientos-integration.graphql`, diseño futuro documentado; servidor GraphQL no activo |

## Contrato administrativo y matriz REST

Base: `/api/v1/admin/accommodations`. Requiere rol administrador.

| Operación | Datos | Resultado |
|---|---|---|
| GET base | `?nombre=andina` opcional | 200; `{request_id, data, next_page}`; sin coincidencias devuelve data vacío |
| GET /{id} | Entero positivo | 200; alojamiento y `_links` |
| POST base | DTO completo | 201; alojamiento; `Location` apunta a su GET administrativo |
| PUT /{id} | DTO completo | 204 sin cuerpo; reemplaza todos los campos editables |
| PATCH /{id} | Subconjunto del DTO | 200; recurso actualizado; conserva los campos omitidos |
| DELETE /{id} | Sin cuerpo | 204; si existe historial devuelve 409, se puede despublicar |
| GET /999999 | ID inexistente | 404 |
| GET /abc o /0 | ID inválido | 400 |
| POST precio como texto, más de dos decimales o campos extra | Cuerpo inválido | 400 por DTO/ValidationPipe |
| PUT con solo nombre | Representación incompleta | 400; no se trata como PATCH |
| DELETE repetido | Recurso eliminado | 404 |
| PUT de recurso inexistente | DTO válido | 404; no crea un ID nuevo |

En este prototipo PUT reemplaza los datos editables, conservando ID, fecha de creación e historial relacionado. PATCH usa un DTO parcial que omite únicamente propiedades ausentes; enviar null a un campo obligatorio devuelve 400. El ID se parsea antes de usarlo en la capa de datos. La API pública nunca devuelve un alojamiento despublicado mediante su GET de detalle.

## Reflexiones para la defensa

**Separación de responsabilidades:** El controlador recibe HTTP, los DTO validan la forma del cuerpo y el servicio aplica reglas como cupo y cancelación. TypeORM accede a las tablas. Cambiar el almacenamiento no debe cambiar las URIs de los consumidores.

**200, 201 y 204:** GET/PATCH devuelven representación y usan 200. POST crea un recurso y usa 201, indicando su URI en Location. PUT y DELETE de esta práctica usan 204, y por definición su respuesta no tiene cuerpo. Si el recurso no existe, el controlador comunica 404; borrar otra vez no produce una segunda eliminación.

**PUT frente a PATCH:** PUT con un nombre nuevo y sin la tarifa falla porque falta la representación completa. PATCH con ese nombre conserva precio y capacidades. Ninguno debe transformar `/0` en una operación de creación.

**Persistencia:** Un reinicio termina el proceso Node y elimina sus variables. Las reservas sobreviven porque están en una base persistente. La prueba automatizada detiene e inicia el servidor con la misma base y verifica tanto el estado CANCELLED como la despublicación y la sesión. En nube se debe repetir con PostgreSQL real de Supabase.

**REST frente a GraphQL:** Un futuro cliente puede solicitar solo nombre y tarifa con GraphQL; el resolver mapeará datos del servicio existente. REST mantiene sus contratos HTTP y Swagger. El SDL añadido es un diseño, no evidencia de Apollo Sandbox activo. No se usa la API de productos externa del laboratorio como fuente ficticia de hoteles.

**gRPC unary frente a streaming:** ObtenerAlojamiento responde una vez; ListarAlojamientos puede transmitir resultados progresivos a otro servicio. NOT_FOUND e INVALID_ARGUMENT serán códigos gRPC, no códigos HTTP enviados dentro del mensaje. El servidor futuro deberá desplegarse en infraestructura que admita gRPC/HTTP2, con autenticación por metadata; Vercel seguirá sirviendo este frontend y la API HTTP.

## Preparación futura de los adaptadores

El resolver de `alojamientos` usará el catálogo publicado y mapeará `facilities` a `servicios`; aplicará nombre/ciudad/precioMaximo. `alojamiento(id)` mapeará ausencia o despublicación a null, coherente con el SDL nullable. La disponibilidad y las reservas seguirán delegando en la lógica transaccional del dominio, sin duplicarla en resolvers.

En gRPC se conservarán los números de campo del .proto, se convertirán tarifas a centavos y se validarán mensajes antes de consultar. Se incorporarán cancelación del stream, límites de resultados y metadata autenticada. Los contratos de referencia no contienen credenciales ni asumen que los servicios ya estén integrados.

## Uso de IA y revisión personal

- Herramienta utilizada: Codex.
- Uso real: apoyo en diseño, generación de implementación, revisión y pruebas automatizadas. No se presenta todo el código como escrito manualmente por el estudiante.
- Solicitud: adaptar la plantilla Booking al reto RDA 1 y contrastarla con teoría y prácticas.
- Verificación automatizada: matriz REST, permisos, cotizaciones, idempotencia, concurrencia, persistencia tras reinicio y revisión de interfaz en navegador.
- Verificación manual del estudiante: **pendiente de completar por el estudiante**, indicando qué endpoints ejecutó, qué cambió y qué decisiones puede explicar.
- Evidencias de nube: **pendientes** hasta conectar Supabase y publicar/verificar Vercel.

Las prácticas incluyen pautas de uso de IA de nivel 2–3. Esta declaración describe el trabajo realmente realizado, sin atribuir al estudiante revisiones manuales ni un nivel de uso que aún no haya comprobado. Antes de la defensa, ejecutar la matriz y completar la reflexión con palabras propias. No se han realizado commits ni push como supuestas evidencias del estudiante.

## Integración continua

`.github/workflows/ci.yml` prepara un PostgreSQL 16 efímero llamado booking_test, aplica la misma migración y ejecuta las pruebas de API contra ese servidor. La base de CI no usa credenciales de Supabase. El inicializador de pruebas acepta únicamente una base local booking_test y CI=true para evitar ejecutarse contra producción. El workflow está preparado; **no se afirma que GitHub Actions haya corrido** mientras no exista una ejecución real en un repositorio propio del estudiante.

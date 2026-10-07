# Comparación con Reto1IS (Posada EC)

Revisión de código del 7 de octubre de 2026. Referencia: [SamNunez31/Reto1IS](https://github.com/SamNunez31/Reto1IS), commit `a036095`. Proyecto comparado: Kawsay Estancias. Se inspeccionaron controladores, servicios, componentes, contratos, migraciones, pruebas y documentación. No se ejecutó la aplicación de la compañera ni se accedió a su base privada; sus funciones se identifican por el código, sin afirmar que su despliegue funcione.

## Resultado respecto a tu rúbrica

La rúbrica que entregaste exige nube operativa, administración CRUD, marketplace con flujo de reserva, APIs documentadas, base operativa, diseño API-first, contratos futuros, diseño preliminar SOA/EDA y documentación. Kawsay implementa esos componentes y conserva evidencias de ejecución. La defensa del código depende de que el estudiante practique y pueda explicarlo. No se puede garantizar una nota mediante una comparación de repositorios.

No existe en la rúbrica suministrada un número mínimo de tablas ni una obligación de copiar cada función de Posada EC. Sus 25 tablas y nuestras 27 reflejan modelos distintos; tener más tablas o más hoteles no prueba mayor calidad. Los 270 alojamientos ficticios de Kawsay cubren 222 cantones y cumplen la paginación del contrato (máximo 100 resultados de búsqueda por página).

## Funcionalidades comparadas

| Área | Posada EC, código revisado | Kawsay Estancias | ¿Falta en Kawsay? |
|---|---|---|---|
| Frontend moderno | Angular 19, rutas y componentes | React, rutas y componentes; framework asignado por el estudiante | No |
| Catálogo y reservas | Búsqueda, detalle, disponibilidad, cotización, confirmar, modificar y cancelar | Los mismos pasos básicos; pagos DEMO claramente identificados | No para el flujo básico |
| Usuarios y roles | Registro, login, estado de cuentas y perfil propio | Registro, JWT revocable, roles admin/viajero; ERP crea/edita/activa/desactiva y restablece contraseña | Perfil editable implementado |
| CRUD de alojamientos | Catálogo administrado, publicación, suspensión y unidades | Alta/edición/baja/publicación/despublicación, tarifa, capacidad e inventario | Falta gestión de varias unidades/tipos por propiedad y estado de suspensión independiente |
| Dashboard | Reservas, ventas, ticket promedio, cancelaciones, ranking y mapas | Reservas, gastos pagados/pendientes, resultado, margen, cancelaciones, gráficos, ranking y mapa cantonal | Ticket promedio y ranking por reseñas son mejoras posibles |
| Gastos operativos | No se encontró módulo equivalente al ERP de gastos en los controladores revisados | CRUD de gastos, proveedores como campo, categorías y distribución porcentual | Kawsay incorpora esta función |
| Reseñas | Huésped publica una por estancia completada; admin responde | Una por estancia completada; respuesta administrativa y puntuaciones públicas | Implementado y probado |
| Perfil | Editar identidad/contacto y datos de facturación | Perfil propio editable con contacto y documento privado | Implementado y probado |
| Pago | Tarjeta simulada o efectivo; admin confirma efectivo recibido | Referencia DEMO sin tarjetas ni cobro real | Sí: método y estado separado del pago |
| Factura | Vista y componente de factura simulada | Factura simulada por reserva nueva, con detalles, descarga HTML, impresión/PDF, versión y anulación | Implementado y probado |
| Tarifas por fecha | Calendario por unidad, precio y cupo por día | Calendario de precio/cupo/cierre por alojamiento y noche, respetando reservas existentes | Implementado; varias unidades independientes siguen como mejora |
| Políticas y cancelación | Previsualización de penalidad y reembolso | Cancelación académica sin penalidad; conserva historial y libera cupo | Sí: políticas configurables y liquidación simulada |
| Impuestos y feriados | Catálogos y cálculo académico configurables | Importes en USD sin impuestos inventados | Sí, adicional; una implementación tributaria real requeriría validación independiente |
| Mapa | Coordenadas de propiedad y editor de dirección/pin | Coordenadas cantonales de referencia, sin geocodificar hoteles ficticios | Sí: ubicación individual del alojamiento |
| Observabilidad | Panel local del navegador con tiempos, errores y solicitudes | Logs básicos del backend, auditoría persistente y verificaciones automatizadas | Sí: panel de observabilidad; logging básico está implementado |
| Seguridad | JWT, bcrypt, guards, DTO, validadores y controles OWASP | JWT HS256, scrypt, sesiones revocables, cookies HttpOnly, roles, CORS, DTO/AJV y CSP | Controles básicos presentes; ninguna revisión estática certifica seguridad absoluta |
| Pruebas | Archivos de unitarias, contrato y seguridad | 28 unitarias, 125 comprobaciones API, esquema PostgreSQL, catálogo y Chrome | Pruebas presentes; se puede ampliar la cobertura |
| SOA/EDA | Outbox, jobs y bus local en memoria | Outbox transaccional y contratos; entrega de eventos futura | El diseño preliminar exigido está presente; worker externo no implementado |
| GraphQL/gRPC | Archivos de contratos | Archivos de contratos | No son servicios activos en Kawsay; preparación futura documentada |

## Prioridades recomendadas

1. **Mayor valor para el usuario:** edición de perfil, reseñas ligadas a una estancia completada y comprobante descargable de reserva. Estas mejoras completan el uso posterior a la reserva.
2. **Mayor valor operativo:** calendario por alojamiento, precios por temporada y más de un tipo de habitación; método/estado de pago separado de la reserva.
3. **Mayor valor técnico:** separar catálogo, reservas, identidad y auditoría en servicios más pequeños; ampliar pruebas de respuesta y compatibilidad del contrato y monitoreo.

La edición de perfil, las reseñas verificadas, las facturas simuladas y el calendario ya se implementaron tras esta revisión; ver [guía de estancias](estancias.md). Las demás recomendaciones permanecen como evolución futura. No se copiaron fuentes de la compañera ni se activaron impuestos, tarjetas, correos o nuevas integraciones sin definir su alcance.

## Límites de API-first a tener presentes en la defensa

Kawsay valida entradas con AJV y conserva rutas y documentación del contrato. Eso no demuestra equivalencia total con un proveedor GDS. Las respuestas usan un modelo simplificado y los extras, políticas, puntuaciones y tarifas detalladas no tienen el alcance de una plataforma de reservas completa. Una prueba que comprueba que Swagger lista un endpoint no sustituye una prueba de su respuesta real. OAuth2 externo, scopes y entrega HTTP de webhooks siguen documentados como evolución futura. La rúbrica enviada pide preparación futura, no un proveedor OAuth2 o broker ya integrado.

Posada EC también identifica límites: su bus es local/en memoria, el portal de anfitriones externos es futuro y la recuperación de contraseña está deshabilitada en su interfaz. No se debe concluir que todas las funciones mencionadas por un README estén desplegadas o verificadas.

## Referencias de código

- Reseñas, perfil y factura: `backend/src/modules/cuenta/cuenta.controller.ts` y `cuenta.service.ts` de Posada EC.
- Calendario, unidades, confirmar efectivo y respuestas a reseñas: `backend/src/modules/host/host.controller.ts`.
- Impuestos y feriados: `backend/src/modules/admin/admin.controller.ts`.
- Jobs y bus: `backend/src/modules/jobs/jobs.service.ts` y `bus-eventos.ts`.
- Dashboard/observabilidad: `frontend/src/app/features/admin/` y servicios de observabilidad.
- Kawsay: `src/modules/alojamientos/`, `frontend/src/erp/`, `frontend/src/Dialogs.jsx`, `frontend/src/Orders.jsx`, `test/` y `docs/`.

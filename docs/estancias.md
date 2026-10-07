# Perfil, reseñas, facturas y calendario

## Uso

- **Mi perfil**: cada cuenta edita su nombre, teléfono, documento y dirección. El correo y el rol no se cambian desde este formulario.
- **Mis reservas**: el viajero consulta la factura de una reserva nueva, descarga su HTML o imprime/guarda PDF desde el navegador. Una estancia confirmada con fecha de salida cumplida permite publicar una única reseña (1–10). No se permiten reseñas de reservas canceladas o ajenas.
- **Administración → Reseñas**: el administrador responde las opiniones de estancias. El nombre del viajero, puntuación, comentario y respuesta son públicos; el contacto y documento son privados.
- **Administración → Calendario y tarifas**: configura precio, cupo o cierre por alojamiento y fecha, hasta 93 días por operación. Cada noche usa su excepción o la tarifa base; la fecha de salida no se cobra. Se rechazan cierres o reducciones que afecten reservas confirmadas. Restaurar base elimina la excepción del día.
- **Administración → Facturas**: consulta documentos de todas las reservas nuevas. Una modificación conserva el número y aumenta la versión; la cancelación marca el documento como anulado.

Las facturas son **simuladas**, con impuestos de demostración en cero: no tienen autorización del SRI ni representan un cobro real. Las reservas previas a esta ampliación conservan su historial; no se les inventan facturas retroactivas.

## Tablas añadidas

| Tabla | Relación y propósito |
|---|---|
| perfiles_usuario | Un perfil por usuario; contacto y documento privado |
| calendario_tarifas | Alojamiento y administrador; una excepción por alojamiento/fecha |
| facturas | Una por reserva, con propietario y fotografía de los datos del cliente |
| detalles_factura | Noches, cantidad de habitaciones, precio unitario y subtotal |
| resenas_estancia | Una por reserva; viajero, alojamiento y administrador que responde |

La migración `004_estancias.sql` conserva los datos existentes. El esquema completo tiene **28 tablas y 32 claves foráneas**, todas con RLS. Los roles públicos `anon` y `authenticated` no acceden directamente a estas tablas; NestJS aplica autenticación y autorización. La emisión/actualización de factura ocurre dentro de la transacción de la reserva. El calendario revalida inventario y precios al cotizar y confirmar.

## API y pruebas

Swagger documenta `GET/PATCH /api/v1/me/profile`, `GET /api/v1/me/reviews`, `GET /api/v1/orders/{id}/invoice`, `POST /api/v1/orders/{id}/review` y los módulos administrativos `/admin/erp/facturas`, `/admin/erp/resenas` y `/admin/erp/tarifas`.

`test/integration.cjs` comprueba perfiles propios, facturas ajenas, cálculo de temporadas, cupos ya ocupados, versión de factura, cancelación, reseña completada/duplicada y respuesta pública sin información privada. La estancia pasada se prepara únicamente en la base aislada de pruebas. `test/unit/estancias.test.jsx` comprueba precios con centavos y escape de HTML del documento descargado. `test/postgres-schema.cjs` verifica el esquema PostgreSQL, relaciones, RLS y permisos.

## Catálogo reducido y reservas coincidentes

El catálogo público contiene 270 estancias: una por cada uno de los 222 cantones y cinco en Quito, Guayaquil, Cuenca, Ambato, Riobamba, Loja, Manta, Portoviejo, Machala, Salinas, Santa Cruz y Baños de Agua Santa. Cada una tiene nombre, descripción e imagen diferentes. Las fotos de Wikimedia Commons son ilustrativas, tienen licencia abierta y crédito consultable en el detalle; no representan hoteles reales ecuatorianos.

Los alojamientos excedentes sin relaciones se eliminan. Los que tienen reservas, cotizaciones, gastos o calendario se despublican y conservan su historial. La curación afecta los datos de demostración, conserva propiedades creadas manualmente y se aplica una sola vez.

Un viajero no puede reservar dos veces el mismo alojamiento con fechas total o parcialmente coincidentes. Se rechaza la cotización/confirmación/modificación incluso con pestañas o cotizaciones anteriores. La búsqueda y disponibilidad autenticadas lo reflejan inmediatamente; se permite una estancia adyacente o reservar tras cancelar la anterior. Otros viajeros pueden usar habitaciones restantes, según inventario.

La red local puede bloquear el puerto PostgreSQL; el despliegue tiene una actualización controlada mediante APPLY_DEMO_UPGRADE. Desde Vercel se aplica la migración aditiva 004 bajo bloqueo advisory, y la curación en una transacción con marcador persistente para no ejecutarla en cada inicio. No hay endpoint público para ejecutar SQL. La migración normal también está disponible con npm run db:migrate.

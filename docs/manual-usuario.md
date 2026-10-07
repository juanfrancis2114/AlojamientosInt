# Manual del usuario

Web: https://booking-prototipo-alojamientos.vercel.app. Las reservas y pagos son de demostración; no se solicitan tarjetas ni se realizan cobros.

## Buscar y reservar

1. Elegir destino, fecha de llegada, salida, adultos y habitaciones. Pulsar Buscar estancia.
2. Usar filtros de piscina o precio y el orden de resultados si se desea.
3. Abrir Ver estancia y consultar disponibilidad. Revisar precio, noches y cancelación.
4. Iniciar sesión o crear una cuenta con nombre, correo y contraseña de 10 a 128 caracteres.
5. Continuar con la reserva, revisar la cotización y completar nombre, apellido y correo del titular.
6. Aceptar las condiciones de demostración y confirmar. Guardar el localizador mostrado.

Si cambió la disponibilidad o venció la cotización, consultar nuevamente antes de confirmar. El precio y el cupo siempre se verifican en el servidor.

## Gestionar la cuenta y reservas

Mis reservas abre `/reservas`. Es una página privada y solicita iniciar sesión a visitantes. Permite consultar estancias, modificar fechas y huéspedes o cancelar una reserva confirmada. Revisar el total después de modificar; se aplica la tarifa vigente. La cancelación libera el inventario y conserva el historial.

El botón con el nombre del usuario permite cerrar sesión. La sesión dura una hora; si vence, volver a iniciar sesión. El cierre de sesión invalida el token en el servidor. Un cliente no puede abrir administración ni consultar reservas ajenas.

## Administración

El administrador inicia sesión con su cuenta configurada. Las credenciales de producción están en la configuración privada del proyecto; no se publican en este manual. El botón Administración abre `/admin`.

En Alojamientos, Publicar alojamiento permite crear una propiedad con destino, descripción, dirección, foto HTTPS, tarifa, inventario, capacidad, piscina y estado de publicación. Editar modifica esos datos. Publicar o Despublicar controla su presencia en el marketplace.

Eliminar pide confirmación. Una propiedad con historial de reservas o cotizaciones no se elimina, para preservar la integridad; puede despublicarse. Reservas permite consultar y gestionar las estancias. El Resumen ejecutivo muestra valor de reservas, gastos pagados y pendientes, resultado, margen, cancelaciones, evolución mensual, distribución de gastos, mapa y destinos con más reservas. El período se filtra por fecha de creación de reserva y fecha de gasto. Gastos registra concepto, proveedor, categoría, alojamiento opcional, importe, fecha, estado y notas; permite editar y eliminar. Usuarios permite crear, editar, activar y desactivar cuentas, cambiar rol y restablecer contraseña. Desactivar, cambiar rol o contraseña revoca sesiones; nunca muestra contraseñas. No permite quitarse el rol de administrador o desactivar la propia cuenta. Destinos gestiona cantones y sus coordenadas; categorías y destinos utilizados conservan su integridad. Actividad muestra la auditoría en español. Documentación API abre Swagger para explorar y ejecutar endpoints. El administrador gestiona reservas de viajeros, tiene bloqueada la creación de reservas personales y no ve Mis reservas.

## Mensajes y solución de problemas

La estancia muestra cuatro fotografías ilustrativas, con miniaturas, flechas y créditos; desplazar la ventana hacia abajo para consultar disponibilidad. En Administración → Alojamientos → Imágenes se editan las cuatro fotos y su orden. La primera es la portada.

Mi perfil permite actualizar datos personales. Mis reservas permite consultar facturas simuladas e imprimirlas como PDF, y opinar sobre una estancia completada. El administrador responde reseñas y configura precios, cupo y cierre por fecha en Calendario y tarifas. Las facturas se versionan al modificar una reserva y se anulan al cancelarla; no son documentos fiscales del SRI.

Si ya existe una reserva propia confirmada en el mismo alojamiento, no se puede repetir ni solapar ese intervalo. Cambiar las fechas o cancelar la reserva previa libera la selección; otros viajeros siguen sujetos al inventario disponible.

Los formularios muestran errores junto al envío, mantienen los datos ingresados y evitan ejecutar repetidamente la acción mientras esperan. Si el catálogo no carga, comprobar la conexión y pulsar Reintentar. Si aparece un error de sesión, iniciar sesión nuevamente. Si una reserva no tiene cupo, cambiar fechas o cantidad de habitaciones. Nunca compartir la contraseña de la base de datos para utilizar la web.

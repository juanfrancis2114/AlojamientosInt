# Galerías de alojamientos

Cada estancia tiene cuatro imágenes diferentes: portada y tres vistas de referencia. El catálogo inicial de 270 estancias contiene 1080 imágenes distintas. Son fotografías ilustrativas de Wikimedia Commons, con autor, fuente y licencia; pueden proceder de establecimientos diferentes y no identifican una propiedad real del catálogo ficticio.

El visitante abre una estancia y utiliza las miniaturas, las flechas o las teclas izquierda/derecha para cambiar de imagen. Puede abrir la fotografía completa y consultar sus créditos. La ventana se desplaza verticalmente hasta los controles de disponibilidad y reserva.

En Administración → Alojamientos → Imágenes, el administrador edita las cuatro URLs HTTPS, descripciones, créditos y licencias; puede mover cada imagen arriba o abajo. La primera se convierte en portada del catálogo. Se exige exactamente cuatro URLs distintas y la actualización es transaccional.

## Base de datos

La migración aditiva y repetible `005_galerias.sql` crea `imagenes_alojamiento`: `id`, `alojamiento_id`, `orden`, `url`, `descripcion`, `autor`, `licencia`, `fuente`, `licencia_url` y `fecha_creacion`. La clave foránea protege la relación con `alojamientos`; las restricciones evitan repetir una URL o posición dentro de una estancia y limitan el orden a 1–4. Se habilita RLS y se restringe el acceso directo de los roles públicos. El backend valida la cantidad de imágenes y aplica autorización administrativa. El modelo completo contiene 28 tablas y 32 claves foráneas.

## API

- `GET /api/v1/catalog/{id}/gallery`: galería pública de una estancia publicada.
- `GET /api/v1/admin/accommodations/{id}/gallery`: consulta administrativa autenticada.
- `PUT /api/v1/admin/accommodations/{id}/gallery`: reemplazo y orden mediante `{ imagenes: [...] }`; cada elemento contiene `url`, `descripcion`, `autor`, `licencia`, `fuente` y `licencia_url`.

Los endpoints están documentados en `/api/docs`. El cliente solo envía las URLs: el servidor no descarga recursos proporcionados por usuarios. La galería se consulta al abrir la estancia para evitar cargar las 1080 imágenes al mostrar el catálogo.

## Verificación

Las pruebas unitarias verifican selección y navegación; las pruebas de API cubren permisos, validación, persistencia, portada y eliminación; la prueba PostgreSQL comprueba restricciones y RLS. `node test/gallery-browser.cjs` comprueba edición, orden, desplazamiento hasta disponibilidad y presentación móvil en una base aislada. `scripts/verify-cloud.cjs` comprueba las 270 galerías desplegadas en Supabase.

# Alcance y correspondencia con RDA 1

Kawsay Estancias es un marketplace y sistema de administración de alojamientos, construido a partir de la plantilla de integración de sistemas. El catálogo cubre 222 cantones de Ecuador con 270 estancias ficticias y cuatro fotografías ilustrativas por estancia. El administrador gestiona la operación; el viajero busca, consulta disponibilidad y realiza reservas simuladas.

## Enlaces de la entrega

- Aplicación: https://booking-prototipo-alojamientos.vercel.app
- Repositorio: https://github.com/juanfrancis2114/AlojamientosInt
- Swagger: https://booking-prototipo-alojamientos.vercel.app/api/docs
- OpenAPI operativo: https://booking-prototipo-alojamientos.vercel.app/api/openapi.json
- Salud y conexión PostgreSQL: https://booking-prototipo-alojamientos.vercel.app/api/v1/health

## Rúbrica y evidencia

| Criterio | Evidencia disponible | Estado |
|---|---|---|
| Despliegue público obligatorio | Vercel operativo y API conectada a Supabase, verificados el 7 de octubre de 2026 | Verificado; debe seguir operativo durante la defensa |
| Administración funcional | CRUD de alojamientos; reservas operativas; usuarios, destinos, categorías, gastos, calendario, facturas, reseñas y galerías | Verificado |
| Marketplace y flujo de venta | Búsqueda, disponibilidad, cotización, confirmación, modificación y cancelación de reservas simuladas | Verificado |
| APIs documentadas | REST y Swagger/OpenAPI accesibles públicamente | Verificado |
| Base de datos operativa | PostgreSQL: 28 tablas, 32 claves foráneas, restricciones y RLS | Verificado |
| Diseño API-first | Contrato de referencia conservado; validación AJV y DTO; separación de interfaz y servicio | Implementado y documentado |
| Contratos para interoperabilidad | Contratos REST; diseños preliminares GraphQL y gRPC | Documentado; adaptadores futuros |
| Diseño SOA/EDA | Outbox transaccional y suscripciones preliminares; sin worker de entrega activo | Implementación preliminar documentada |
| Documentación técnica mínima | Arquitectura, diccionario de tablas, APIs, seguridad, pruebas, despliegue y manual | Entregada |
| Dominio del código en defensa | Guion, preguntas y decisiones técnicas disponibles | Debe demostrarlo personalmente el estudiante |

La evaluación corresponde al docente. El despliegue debe estar accesible durante la demostración; las pruebas previas no sustituyen esa condición habilitante. Se incorporaron también React, JWT, roles, validación, ESLint, pruebas y optimización de la rúbrica del semestre anterior.

## Verificación de la versión documentada

Commit funcional: 3600f37. GitHub Actions completó correctamente build, TypeScript, ESLint, pruebas unitarias, esquema, catálogo y pruebas API contra PostgreSQL real de CI. Se aprobaron 30 pruebas unitarias, 140 comprobaciones de API y 43 comprobaciones públicas en producción. Se verificaron las 270 galerías con 1080 URLs diferentes y navegación en Chrome, incluyendo móvil.

## Entrega en Google Drive

Subir el PDF y, si se desea incluir los anexos editables, el ZIP documental. Abrir Compartir, cambiar Acceso general a Cualquier persona con el enlace y seleccionar Lector. Copiar el enlace y comprobarlo en una ventana privada antes de colocarlo en la plataforma académica. La entrega documental no incluye el código fuente completo ni un respaldo de datos privados: el código está en GitHub y el anexo SQL describe la estructura de la base.

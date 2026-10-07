BEGIN;
CREATE TABLE IF NOT EXISTS imagenes_alojamiento (
 id TEXT PRIMARY KEY,
 alojamiento_id INTEGER NOT NULL REFERENCES alojamientos(id),
 orden INTEGER NOT NULL CHECK (orden BETWEEN 1 AND 4),
 url TEXT NOT NULL CHECK (url LIKE 'https://%'),
 descripcion TEXT NOT NULL,
 autor TEXT NOT NULL DEFAULT '',
 licencia TEXT NOT NULL,
 fuente TEXT NOT NULL CHECK (fuente LIKE 'https://%'),
 licencia_url TEXT NOT NULL CHECK (licencia_url LIKE 'https://%'),
 fecha_creacion TEXT NOT NULL,
 UNIQUE(alojamiento_id,orden),
 UNIQUE(alojamiento_id,url)
);
ALTER TABLE imagenes_alojamiento ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON imagenes_alojamiento FROM anon,authenticated;
COMMIT;

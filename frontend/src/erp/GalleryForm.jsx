import { useResource } from '../useResource';
import { useBooking } from '../context';
import { api } from '../api';
import { AsyncForm } from '../components';
import { useState } from 'react';
export default function GalleryForm({ hotel }) {
  const resource = useResource('admin/accommodations/' + hotel.id + '/gallery');
  if (resource.loading) return <p role="status">Cargando imágenes…</p>;
  if (resource.error)
    return (
      <p className="error" role="alert">
        {resource.error}
      </p>
    );
  return <GalleryEditor hotel={hotel} initial={resource.data} />;
}
function GalleryEditor({ hotel, initial }) {
  const { close, refresh, notify } = useBooking();
  const [images, setImages] = useState(initial);
  const move = (from, to) =>
    setImages((current) => {
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  return (
    <>
      <p className="eyebrow dark">GALERÍA DEL ALOJAMIENTO</p>
      <h2 className="modal-title">Cuatro imágenes · {hotel.nombre}</h2>
      <p className="muted">
        La primera imagen será la portada. Usa cuatro URLs HTTPS distintas e incluye la autoría y
        licencia de cada fotografía. Al cambiar su posición se cambia su orden público.
      </p>
      <AsyncForm
        id="gallery-form"
        onSubmit={async (form) => {
          const data = new FormData(form);
          const imagenes = [0, 1, 2, 3].map((i) =>
            Object.fromEntries(
              ['url', 'descripcion', 'autor', 'licencia', 'fuente', 'licencia_url'].map((key) => [
                key,
                data.get(key + '_' + i),
              ]),
            ),
          );
          await api('admin/accommodations/' + hotel.id + '/gallery', { imagenes }, 'PUT');
          close();
          refresh();
          notify('Galería actualizada');
        }}
      >
        {images.map((photo, i) => (
          <fieldset className="gallery-edit-image" key={photo.id}>
            <legend>
              Imagen {i + 1}
              {i === 0 ? ' · Portada' : ''}
            </legend>
            <div className="form-actions mb-3">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)}>
                Mover arriba
              </button>
              <button type="button" disabled={i === 3} onClick={() => move(i, i + 1)}>
                Mover abajo
              </button>
            </div>
            <img className="gallery-edit-preview" src={photo.url} alt={photo.descripcion} />
            <div className="form-grid">
              {[
                { key: 'url', label: 'URL de la imagen', type: 'url', max: 3000 },
                { key: 'descripcion', label: 'Descripción de la vista', max: 180 },
                { key: 'autor', label: 'Autor / crédito', max: 400 },
                { key: 'licencia', label: 'Licencia', max: 100 },
                { key: 'fuente', label: 'Enlace a la fuente', type: 'url', max: 3000 },
                { key: 'licencia_url', label: 'Enlace a la licencia', type: 'url', max: 3000 },
              ].map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    className="form-control"
                    name={field.key + '_' + i}
                    type={field.type || 'text'}
                    maxLength={field.max}
                    required={field.key !== 'autor'}
                    defaultValue={photo[field.key]}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="button primary">Guardar cuatro imágenes</button>
      </AsyncForm>
    </>
  );
}

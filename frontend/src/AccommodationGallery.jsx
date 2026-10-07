import { useState } from 'react';
import { useResource } from './useResource';
export default function AccommodationGallery({ hotel }) {
  const resource = useResource('catalog/' + hotel.id + '/gallery');
  const [index, setIndex] = useState(0);
  const images = resource.data?.length
    ? resource.data
    : [
        {
          url: hotel.image,
          descripcion: 'Portada ilustrativa',
          autor: '',
          licencia: '',
          fuente: '',
        },
      ];
  const current = Math.min(index, images.length - 1),
    photo = images[current];
  const move = (direction) => setIndex((current + direction + images.length) % images.length);
  return (
    <section
      className="stay-gallery"
      aria-label={'Galería de ' + hotel.nombre}
      tabIndex="0"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div className="stay-gallery-main">
        <img
          className="modal-image"
          src={photo.url}
          alt={photo.descripcion + ' · ' + hotel.nombre}
          decoding="async"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow previous"
              aria-label="Imagen anterior"
              onClick={() => move(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-arrow next"
              aria-label="Imagen siguiente"
              onClick={() => move(1)}
            >
              ›
            </button>
          </>
        )}
        <span className="gallery-counter" aria-live="polite">
          {current + 1} / {images.length}
        </span>
        <a className="gallery-enlarge" href={photo.url} target="_blank" rel="noreferrer">
          Abrir imagen completa ↗
        </a>
      </div>
      {resource.loading && (
        <p className="muted" role="status">
          Cargando galería…
        </p>
      )}
      {resource.error && (
        <p className="error" role="alert">
          {resource.error}
        </p>
      )}
      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {images.map((image, i) => (
            <button
              type="button"
              key={image.id || image.url}
              aria-label={'Ver imagen ' + (i + 1) + ': ' + image.descripcion}
              aria-pressed={i === current}
              onClick={() => setIndex(i)}
            >
              <img src={image.url} alt="" loading="lazy" decoding="async" />
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      )}
      <p className="gallery-caption">{photo.descripcion}</p>
      <p className="muted photo-credit">
        Imágenes de referencia de distintos establecimientos; ilustran el estilo y no representan un
        alojamiento real del catálogo.
        {photo.fuente && (
          <>
            {' '}
            Crédito: {photo.autor || 'Consultar fuente'} ·{' '}
            <a href={photo.fuente} target="_blank" rel="noreferrer">
              Fuente
            </a>{' '}
            ·{' '}
            <a href={photo.licencia_url || photo.fuente} target="_blank" rel="noreferrer">
              {photo.licencia}
            </a>
            .
          </>
        )}
      </p>
    </section>
  );
}

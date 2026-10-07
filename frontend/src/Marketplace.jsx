import { memo, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useBooking } from './context';
import { AsyncForm, ActionButton } from './components';
import { money, nextDay, searchInput } from './utils';
const HotelCard = memo(function HotelCard({ hotel, searched, onOpen }) {
  return (
    <article className="hotel-card">
      <div className="card-photo">
        <img
          src={hotel.image}
          alt={hotel.nombre}
          loading="lazy"
          decoding="async"
          width="420"
          height="230"
        />
        <span className="card-tag">{hotel.tipo}</span>
      </div>
      <div className="card-body">
        <div className="card-location">
          <span>⌖ {hotel.destino}, Ecuador</span>
          <span className="score">
            {hotel.score ? '★ ' + Number(hotel.score).toFixed(1) : 'Nuevo'}
          </span>
        </div>
        <h3>{hotel.nombre}</h3>
        <div className="amenities">
          {hotel.facilities.join(' · ')} · Hasta {hotel.capacidadAdultos} adultos por habitación
        </div>
        <div className="card-bottom">
          <div>
            <span className="price">
              {money(hotel.precioPorNoche)} <small>/ noche</small>
            </span>
            {searched && <div className="muted">{money(hotel.total_price)} por la estancia</div>}
          </div>
          <button onClick={() => onOpen({ kind: 'hotel', hotel })}>Ver estancia ↗</button>
        </div>
      </div>
    </article>
  );
});
export default function Marketplace() {
  const { cities, search, setSearch, open, revision } = useBooking();
  const [hotels, setHotels] = useState([]);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recommended');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [nextPage, setNextPage] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    (submittedSearch
      ? api('search', submittedSearch, 'POST', { 'X-Device-Fingerprint': 'kawsay-react-web' })
      : api('catalog')
    )
      .then((result) => {
        if (active) {
          setHotels(result.data);
          setSearched(!!submittedSearch);
          setPage(1);
          setNextPage(result.next_page);
          setError('');
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, retry, submittedSearch]);
  const visible = useMemo(() => {
    const result = hotels.filter(
      (hotel) =>
        (filter === 'all' ||
          (filter === 'pool' ? hotel.tienePiscina : hotel.precioPorNoche < 100)) &&
        (hotel.nombre + ' ' + hotel.destino)
          .toLocaleLowerCase('es')
          .includes(term.toLocaleLowerCase('es')),
    );
    return sort === 'recommended'
      ? result
      : result.sort((a, b) => (sort === 'low' ? 1 : -1) * (a.precioPorNoche - b.precioPorNoche));
  }, [hotels, filter, sort, term]);
  const pages = Math.max(1, Math.ceil(visible.length / 24));
  const currentPage = Math.min(page, pages);
  const change = (event) =>
    setSearch((value) => ({ ...value, [event.target.name]: event.target.value }));
  return (
    <main id="market-view">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">ECUADOR, A TU MANERA</p>
          <h1>
            Un nuevo lugar.
            <br />
            Una nueva historia.
          </h1>
          <p className="hero-description">
            De la montaña al mar, encuentra ese lugar
            <br />
            en el que te gustaría quedarte un poco más.
          </p>
          <div className="hero-foot">
            <span className="tiny-line" />
            ESTANCIAS QUE SE SIENTEN COMO HOGAR
          </div>
        </div>
        <div className="hero-note">
          <span>ECUADOR / 04 REGIONES</span>
          <p>
            El viaje empieza
            <br />
            con un buen lugar.
          </p>
        </div>
      </section>
      <AsyncForm
        id="search-form"
        className="search-bar"
        onSubmit={async () => {
          const result = await api('search', searchInput(search), 'POST', {
            'X-Device-Fingerprint': 'booking-react-web',
          });
          setHotels(result.data);
          setSearched(true);
          setPage(1);
          setNextPage(result.next_page);
          setSubmittedSearch(searchInput(search));
          setError('');
        }}
      >
        <label className="destination">
          <span>¿A DÓNDE VAMOS?</span>
          <select id="city" name="city" value={search.city} onChange={change}>
            <option value="">Todo Ecuador</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} · {city.provincia}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>LLEGADA</span>
          <input
            id="checkin"
            name="checkin"
            type="date"
            value={search.checkin}
            min={new Date().toISOString().slice(0, 10)}
            required
            onChange={(event) => {
              const value = event.target.value;
              setSearch((current) => ({
                ...current,
                checkin: value,
                checkout: current.checkout <= value ? nextDay(value) : current.checkout,
              }));
            }}
          />
        </label>
        <label>
          <span>SALIDA</span>
          <input
            id="checkout"
            name="checkout"
            type="date"
            value={search.checkout}
            min={nextDay(search.checkin)}
            onChange={change}
            required
          />
        </label>
        <label>
          <span>HUÉSPEDES</span>
          <select id="adults" name="adults" value={search.adults} onChange={change}>
            {[1, 2, 3, 4, 6, 8].map((value) => (
              <option key={value} value={value}>
                {value} adulto(s)
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>HABITACIONES</span>
          <select id="rooms" name="rooms" value={search.rooms} onChange={change}>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="button primary">
          Buscar estancia ↗
        </button>
      </AsyncForm>
      <section className="explore section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">TU PRÓXIMA ESCAPADA</p>
            <h2>Encuentra tu lugar favorito.</h2>
          </div>
          <span id="result-count" className="muted">
            {loading
              ? 'Cargando alojamientos…'
              : visible.length +
                ' estancias' +
                (searched ? ' disponibles para tu viaje' : ' para descubrir')}
          </span>
        </div>
        <p className="catalog-demo-note">
          Catálogo académico: alojamientos ficticios e imágenes ilustrativas. Reservas sin pagos
          reales.
        </p>
        <input
          className="form-control catalog-quick-filter"
          aria-label="Buscar nombre o cantón"
          placeholder="Buscar nombre o cantón…"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setPage(1);
          }}
        />
        <div className="filter-row">
          <div className="chips">
            {[
              ['all', 'Todos los lugares'],
              ['pool', 'Con piscina'],
              ['budget', 'Menos de $100'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={'chip ' + (filter === value ? 'selected' : '')}
                data-filter={value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="sort-label">
            Ordenar por{' '}
            <select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recommended">Recomendados</option>
              <option value="low">Menor precio</option>
              <option value="high">Mayor precio</option>
            </select>
          </label>
        </div>
        <div id="hotel-grid" className="hotel-grid" aria-live="polite">
          {error ? (
            <div className="empty" role="alert">
              No se pudo cargar el catálogo: {error}{' '}
              <button className="button outline" onClick={() => setRetry((value) => value + 1)}>
                Reintentar
              </button>
            </div>
          ) : visible.length ? (
            visible
              .slice((currentPage - 1) * 24, currentPage * 24)
              .map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} searched={searched} onOpen={open} />
              ))
          ) : (
            !loading && (
              <div className="empty">
                No hay estancias disponibles con estos filtros. Prueba otras fechas o un destino
                diferente.
              </div>
            )
          )}
        </div>
        <div className="erp-pagination">
          <button
            className="button outline"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </button>
          <span>
            Página {currentPage} de {pages}
          </span>
          <button
            className="button outline"
            disabled={currentPage >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </button>
        </div>
        {nextPage && (
          <ActionButton
            onClick={async () => {
              const result = await api('search', { ...submittedSearch, page: nextPage }, 'POST', {
                'X-Device-Fingerprint': 'kawsay-react-web',
              });
              setHotels((current) => [...current, ...result.data]);
              setNextPage(result.next_page);
            }}
          >
            Cargar más resultados disponibles
          </ActionButton>
        )}
      </section>
      <section className="promise">
        {[
          ['01', 'Más cerca de lo que buscas.', 'Descubre estancias en destinos de Ecuador.'],
          [
            '02',
            'Todo claro, desde el inicio.',
            'Consulta disponibilidad y precio antes de reservar.',
          ],
          ['03', 'Tu viaje, bajo tu control.', 'Consulta, modifica o cancela tus reservas.'],
        ].map(([number, title, text]) => (
          <div key={number}>
            <span className="promise-number">{number}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

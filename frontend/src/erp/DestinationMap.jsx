import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { money } from '../utils';
export default function DestinationMap({ cities }) {
  return (
    <MapContainer center={[-1.7, -79]} zoom={6} scrollWheelZoom={false} className="erp-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cities
        .filter((city) => city.longitud < -74)
        .map((city) => (
          <CircleMarker
            key={city.id}
            center={[city.latitud, city.longitud]}
            radius={city.reservas ? Math.min(18, 6 + city.reservas) : 4}
            pathOptions={{ color: city.reservas ? '#c39140' : '#214d42', fillOpacity: 0.75 }}
          >
            <Popup>
              <strong>{city.name}</strong>
              <p>
                {city.provincia}
                <br />
                {city.alojamientos} alojamientos
                <br />
                {city.reservas} reservas confirmadas
                <br />
                {money(city.ingresos)} en reservas
              </p>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

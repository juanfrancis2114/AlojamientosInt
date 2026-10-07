import { useBooking } from './context';
import { useResource } from './useResource';
import { api } from './api';
import { AsyncForm } from './components';
export default function Profile() {
  const { user, setUser, refresh, notify } = useBooking();
  const resource = useResource('me/profile');
  const profile = resource.data;
  return (
    <main className="section login-panel">
      <p className="eyebrow dark">TU CUENTA KAWSAY</p>
      <h1 className="page-title">Mi perfil</h1>
      {resource.loading ? (
        <p role="status">Cargando perfil…</p>
      ) : resource.error ? (
        <p className="error" role="alert">
          {resource.error}
        </p>
      ) : (
        <AsyncForm
          id="profile-form"
          onSubmit={async (form) => {
            const result = await api('me/profile', Object.fromEntries(new FormData(form)), 'PATCH');
            setUser({ ...user, name: result.nombre });
            refresh();
            notify('Perfil actualizado');
          }}
        >
          <div className="form-grid">
            <label className="wide">
              Nombre
              <input
                name="nombre"
                className="form-control"
                required
                minLength="2"
                maxLength="100"
                defaultValue={profile.nombre}
              />
            </label>
            <label className="wide">
              Correo
              <input className="form-control" value={profile.correo} readOnly />
            </label>
            <label>
              Teléfono
              <input
                className="form-control"
                name="telefono"
                autoComplete="tel"
                pattern={'\\+?[0-9]{7,15}'}
                maxLength="20"
                defaultValue={profile.telefono}
              />
            </label>
            <label>
              Documento de identidad
              <input
                className="form-control"
                name="documento"
                maxLength="30"
                pattern={'[A-Za-z0-9\\-]*'}
                defaultValue={profile.documento}
              />
            </label>
            <label className="wide">
              Dirección
              <input
                className="form-control"
                name="direccion"
                autoComplete="street-address"
                maxLength="300"
                defaultValue={profile.direccion}
              />
            </label>
          </div>
          <p className="muted">
            El documento y la dirección se usan en tus facturas de demostración. Tu correo
            identifica la cuenta.
          </p>
          <button className="button primary">Guardar perfil</button>
        </AsyncForm>
      )}
    </main>
  );
}

import { namePattern, nameHelp, emailHelp, validateUserInput } from './userValidation';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useBooking } from './context';
import { AsyncForm } from './components';
export default function Login({ embedded = false, after }) {
  const [register, setRegister] = useState(false);
  const { setUser, close, notify } = useBooking();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <section className={embedded ? '' : 'section login-panel'}>
      <p className="eyebrow dark">BIENVENIDO A TU PRÓXIMA ESCAPADA</p>
      <h2 className="modal-title">{register ? 'Crea tu cuenta' : 'Qué bueno verte.'}</h2>
      <p className="muted">Inicia sesión para reservar y gestionar tus viajes.</p>
      <AsyncForm
        id="login-form"
        onSubmit={async (form) => {
          const result = await api(
            'auth/' + (register ? 'register' : 'login'),
            Object.fromEntries(new FormData(form)),
          );
          setUser(result.user);
          close();
          notify('Bienvenido, ' + result.user.name);
          if (result.user.role === 'admin') navigate('/admin', {replace:true});
          else if (after) after();
          else if (!embedded) navigate(location.state?.from || '/', { replace: true });
        }}
      >
        <div className="form-grid">
          {register && (
            <label className="wide">
              Nombre
              <input
                className="form-control"
                name="name"
                minLength="2"
                pattern={namePattern}
                title={nameHelp}
                onInput={validateUserInput}
                required
                maxLength="100"
                autoComplete="name"
              />
            </label>
          )}
          <label className="wide">
            Correo
            <input
              className="form-control"
              name="email"
              maxLength="254"
              title={emailHelp}
              onInput={validateUserInput}
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="wide">
            Contraseña
            <input
              className="form-control"
              name="password"
              type="password"
              required
              minLength="10"
              maxLength="128"
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          <small className="muted">Entre 10 y 128 caracteres.</small>
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="button primary">
            {register ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
          <button
            type="button"
            className="button outline"
            onClick={() => setRegister((value) => !value)}
          >
            {register ? 'Ya tengo cuenta' : 'Registrarme'}
          </button>
        </div>
      </AsyncForm>
    </section>
  );
}

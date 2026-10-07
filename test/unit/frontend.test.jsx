// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BookingContext } from '../../frontend/src/context';
import ProtectedRoute from '../../frontend/src/ProtectedRoute';
import { ActionButton, AsyncForm } from '../../frontend/src/components';
import Login from '../../frontend/src/Login';
import { api } from '../../frontend/src/api';
import { initialDates, hotelPayload } from '../../frontend/src/utils';
const context = {
  user: null,
  authLoading: false,
  notify: vi.fn(),
  close: vi.fn(),
  setUser: vi.fn(),
};
const provide = (content, value = context) => (
  <BookingContext.Provider value={value}>{content}</BookingContext.Provider>
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('Rutas protegidas', () => {
  const routes = (value) =>
    render(
      provide(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute admin>
                  <p>Panel privado</p>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<p>Inicia sesión</p>} />
          </Routes>
        </MemoryRouter>,
        value,
      ),
    );
  it('redirige a login a un visitante', () => {
    routes(context);
    expect(screen.getByText('Inicia sesión')).toBeVisible();
    expect(screen.queryByText('Panel privado')).not.toBeInTheDocument();
  });
  it('impide mostrar administración a un cliente', () => {
    routes({ ...context, user: { role: 'customer' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Acceso exclusivo');
    expect(screen.queryByText('Panel privado')).not.toBeInTheDocument();
  });
  it('permite al administrador y espera la comprobación inicial', () => {
    const result = routes({ ...context, authLoading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando sesión');
    result.unmount();
    routes({ ...context, user: { role: 'admin' } });
    expect(screen.getByText('Panel privado')).toBeVisible();
  });
});
describe('Formularios y XSS', () => {
  it('muestra errores del backend como texto y conserva el formulario', async () => {
    const attack = '<img src=x onerror=alert(1)>';
    render(
      provide(
        <AsyncForm
          onSubmit={async () => {
            throw new Error(attack);
          }}
        >
          <input name="nombre" defaultValue="Quito" />
          <button>Guardar</button>
        </AsyncForm>,
      ),
    );
    fireEvent.click(screen.getByText('Guardar'));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(attack);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Guardar')).toBeEnabled();
  });
  it('desactiva acciones mientras esperan y evita doble ejecución', async () => {
    let finish;
    const action = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(provide(<ActionButton onClick={action}>Reservar</ActionButton>));
    fireEvent.click(screen.getByText('Reservar'));
    const busy = screen.getByRole('button');
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(action).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  });
  it('el login actualiza la identidad sin guardar el JWT en localStorage', async () => {
    const user = { email: 'cliente@test.local', name: 'Cliente', role: 'customer' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ user, access_token: 'jwt' }),
      })),
    );
    render(
      provide(
        <MemoryRouter>
          <Login embedded />
        </MemoryRouter>,
      ),
    );
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Contraseña2026!' } });
    fireEvent.submit(document.getElementById('login-form'));
    await waitFor(() => expect(context.setUser).toHaveBeenCalledWith(user));
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
describe('Fetch y transformación del CRUD', () => {
  it('envía credenciales y mantiene el código HTTP de autorización', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Acceso exclusivo' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('admin/accommodations')).rejects.toMatchObject({
      status: 403,
      message: 'Acceso exclusivo',
    });
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
  });
  it('agrupa GET simultáneos sin cachear respuestas futuras', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [1] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([api('catalog'), api('catalog')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await api('catalog');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('acepta DELETE 204 sin intentar leer JSON', async () => {
    const json = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 204, json })),
    );
    expect(await api('admin/accommodations/1', undefined, 'DELETE')).toBeNull();
    expect(json).not.toHaveBeenCalled();
  });
  it('convierte números y checkboxes según el contrato', () => {
    const form = document.createElement('form');
    form.innerHTML =
      '<input name="nombre" value="Casa"><input name="cityId" value="1"><input name="precioPorNoche" value="95.50"><input name="habitaciones" value="3"><input name="capacidadAdultos" value="2"><input name="capacidadNinos" value="0"><input name="published" type="checkbox" checked>';
    expect(hotelPayload(form)).toMatchObject({
      nombre: 'Casa',
      cityId: 1,
      precioPorNoche: 95.5,
      habitaciones: 3,
      published: true,
      tienePiscina: false,
    });
  });
  it('calcula fechas correctamente al cambiar de mes', () => {
    expect(initialDates(new Date('2026-01-28T00:00:00Z'))).toEqual({
      checkin: '2026-02-04',
      checkout: '2026-02-06',
    });
  });
});

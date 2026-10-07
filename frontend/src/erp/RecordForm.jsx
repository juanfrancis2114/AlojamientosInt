import { namePattern, nameHelp, emailHelp, validateUserInput, restrictNameInput } from '../userValidation';
import { api } from '../api';
import { AsyncForm, Modal } from '../components';
import { useBooking } from '../context';
import { useResource } from '../useResource';
export default function RecordForm({ resource, record = {}, onClose }) {
  const { refresh, notify } = useBooking();
  const categories = useResource('admin/erp/categorias');
  const hotels = useResource('admin/accommodations');
  const field = (name, label, type = 'text', options = {}) => (
    <label key={name}>
      {label}
      <input
        className="form-control"
        name={name}
        type={type}
        defaultValue={record[name] ?? options.defaultValue ?? ''}
        required
        {...options}
      />
    </label>
  );
  const select = (name, label, values, defaultValue) => (
    <label>
      {label}
      <select className="form-select" name={name} defaultValue={record[name] ?? defaultValue}>
        {values.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <Modal onClose={onClose}>
      <h2 className="modal-title">
        {record.id ? 'Editar' : 'Crear'}{' '}
        {
          { usuarios: !record.id && record.rol === 'admin' ? 'administrador' : 'usuario', gastos: 'gasto', categorias: 'categoría', ciudades: 'destino' }[
            resource
          ]
        }
      </h2>
      <AsyncForm
        id="erp-form"
        onSubmit={async (form) => {
          const payload = Object.fromEntries(new FormData(form));
          if (resource === 'usuarios') {
            payload.activo = payload.activo === 'true';
            if (!payload.contrasena) delete payload.contrasena;
          }
          if (resource === 'gastos') {
            payload.categoria_id = Number(payload.categoria_id);
            payload.alojamiento_id = payload.alojamiento_id ? Number(payload.alojamiento_id) : null;
            payload.importe = Number(payload.importe);
          }
          if (resource === 'ciudades') {
            payload.latitud = Number(payload.latitud);
            payload.longitud = Number(payload.longitud);
          }
          await api(
            'admin/erp/' + resource + (record.id ? '/' + record.id : ''),
            payload,
            record.id ? 'PATCH' : 'POST',
          );
          refresh();
          onClose();
          notify('Registro guardado');
        }}
      >
        <div className="form-grid">
          {resource === 'usuarios' && (
            <>
              {field('nombre', 'Nombre', 'text', { minLength: 2, maxLength: 100, pattern: namePattern, title: nameHelp, onInput: restrictNameInput, 'aria-describedby': 'erp-name-help' })}
              <small id="erp-name-help" className="muted wide">{nameHelp}</small>
              {field('correo', 'Correo', 'email', { maxLength: 254, title: emailHelp, onInput: validateUserInput })}
              {!record.id && record.rol === 'admin' ? (
                <>
                  <input type="hidden" name="rol" value="admin" />
                  <p className="notice wide">Rol: Administrador. Esta cuenta tendrá acceso al centro de operaciones.</p>
                </>
              ) : select(
                'rol',
                'Rol',
                [
                  ['customer', 'Viajero'],
                  ['admin', 'Administrador'],
                ],
                'customer',
              )}
              {!record.id ? (
                <>
                  <input type="hidden" name="activo" value="true" />
                  <p className="notice wide">Estado inicial: Activo. Puedes desactivar la cuenta después de crearla.</p>
                </>
              ) : select(
                'activo',
                'Estado',
                [
                  ['true', 'Activo'],
                  ['false', 'Inactivo'],
                ],
                true,
              )}
              {field(
                'contrasena',
                record.id ? 'Nueva contraseña (opcional)' : 'Contraseña',
                'password',
                {
                  required: !record.id,
                  minLength: 10,
                  maxLength: 128,
                  autoComplete: 'new-password',
                },
              )}
              <p className="muted">
                Cambiar contraseña, rol o desactivar revoca sus sesiones. El historial se conserva.
              </p>
            </>
          )}
          {resource === 'gastos' && (
            <>
              {field('concepto', 'Concepto', 'text', { minLength: 3, maxLength: 200 })}
              {field('proveedor', 'Proveedor', 'text', { minLength: 2, maxLength: 200 })}
              {select(
                'categoria_id',
                'Categoría',
                (categories.data || []).map((c) => [c.id, c.nombre]),
                categories.data?.[0]?.id,
              )}
              {select(
                'alojamiento_id',
                'Alojamiento',
                [
                  ['', 'Operación general'],
                  ...(hotels.data?.data || []).map((h) => [h.id, h.nombre]),
                ],
                '',
              )}
              {field('importe', 'Importe (USD)', 'number', {
                min: 0.01,
                max: 10000000,
                step: 0.01,
              })}
              {field('fecha', 'Fecha', 'date', {
                defaultValue: new Date().toISOString().slice(0, 10),
              })}
              {select(
                'estado',
                'Estado',
                [
                  ['PENDIENTE', 'Pendiente'],
                  ['PAGADO', 'Pagado'],
                ],
                'PENDIENTE',
              )}
              {field('notas', 'Notas', 'text', { required: false, maxLength: 2000 })}
              {(categories.error || hotels.error) && (
                <p role="alert">{categories.error || hotels.error}</p>
              )}
            </>
          )}
          {resource === 'categorias' &&
            field('nombre', 'Nombre', 'text', { minLength: 2, maxLength: 100 })}
          {resource === 'ciudades' && (
            <>
              {field('nombre', 'Cantón', 'text', {
                defaultValue: record.name,
                minLength: 2,
                maxLength: 100,
              })}
              {field('codigo', 'Código INEC', 'text', { pattern: '[0-9]{4}', maxLength: 4 })}
              {field('provincia', 'Provincia', 'text', { minLength: 2, maxLength: 100 })}
              {select(
                'region',
                'Región',
                ['Costa', 'Sierra', 'Amazonía', 'Insular'].map((r) => [r, r]),
                'Sierra',
              )}
              {field('latitud', 'Latitud', 'number', { min: -6, max: 2, step: 'any' })}
              {field('longitud', 'Longitud', 'number', { min: -92, max: -74, step: 'any' })}
            </>
          )}
        </div>
        <div className="form-actions">
          <button className="button primary">Guardar</button>
          <button type="button" className="button outline" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </AsyncForm>
    </Modal>
  );
}

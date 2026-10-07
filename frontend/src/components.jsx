import { useEffect, useRef, useState } from 'react';
import { useBooking } from './context';
export function ActionButton({ children, onClick, className = 'button primary', ...props }) {
  const [busy, setBusy] = useState(false);
  const { notify } = useBooking();
  return (
    <button
      {...props}
      className={className}
      disabled={busy || props.disabled}
      onClick={async (event) => {
        setBusy(true);
        try {
          await onClick(event);
        } catch (error) {
          notify(error.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Procesando…' : children}
    </button>
  );
}
export function Modal({ children, onClose }) {
  const ref = useRef(null);
  const { close: defaultClose } = useBooking();
  const close = onClose || defaultClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      id="modal"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const box = ref.current.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            close();
        }
      }}
    >
      <button id="close-modal" className="close" aria-label="Cerrar" onClick={close}>
        ×
      </button>
      <div id="modal-content">{children}</div>
    </dialog>
  );
}
export function AsyncForm({ children, onSubmit, ...props }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      {...props}
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        setError('');
        try {
          await onSubmit(form);
        } catch (failure) {
          setError(failure.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Procesando…</p>}
    </form>
  );
}

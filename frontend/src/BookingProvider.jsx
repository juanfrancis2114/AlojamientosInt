import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { BookingContext } from './context';
import { initialDates } from './utils';
export default function BookingProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState(() => ({
    ...initialDates(),
    city: '',
    adults: '2',
    rooms: '1',
  }));
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const notify = useCallback((text) => setMessage(text), []);
  const open = useCallback((value) => setModal({ ...value, requestKey: crypto.randomUUID() }), []);
  const close = useCallback(() => setModal(null), []);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    api('auth/me')
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((error) => {
        if (active && error.status !== 401) notify(error.message);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {active = false;};
  }, [notify]);
  useEffect(() => {
    let active = true;
    api('cities')
      .then((value) => {
        if (active) setCities(value.data);
      })
      .catch((error) => {
        if (active) notify(error.message);
      });
    return () => {
      active = false;
    };
  }, [notify, revision]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const logout = useCallback(async () => {
    await api('auth/logout', {});
    setUser(null);
    close();
    refresh();
  }, [close, refresh]);
  const value = useMemo(
    () => ({
      user,
      setUser,
      authLoading,
      cities,
      search,
      setSearch,
      modal,
      open,
      close,
      notify,
      revision,
      refresh,
      logout,
    }),
    [user, authLoading, cities, search, modal, open, close, notify, revision, refresh, logout],
  );
  return (
    <BookingContext.Provider value={value}>
      {children}
      {message && (
        <div id="toast" role="status">
          {message}
        </div>
      )}
    </BookingContext.Provider>
  );
}

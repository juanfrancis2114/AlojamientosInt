import { useEffect, useState } from 'react';
import { api } from './api';
import { useBooking } from './context';
export function useResource(path) {
  const { revision } = useBooking();
  const [result, setResult] = useState({ data: null, error: '', loading: true });
  useEffect(() => {
    let active = true;
    setResult((previous) => ({ ...previous, loading: true, error: '' }));
    api(path)
      .then((data) => {
        if (active) setResult({ data, error: '', loading: false });
      })
      .catch((error) => {
        if (active) setResult({ data: null, error: error.message, loading: false });
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return result;
}

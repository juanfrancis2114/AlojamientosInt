import { createContext, useContext } from 'react';
export const BookingContext = createContext(null);
export function useBooking() {
  const value = useContext(BookingContext);
  if (!value) throw new Error('Se requiere BookingProvider');
  return value;
}

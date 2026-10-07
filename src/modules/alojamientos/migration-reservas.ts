export const migrationReservas = `
CREATE OR REPLACE FUNCTION public.rechazar_reserva_solapada()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.estado <> 'CONFIRMED' THEN RETURN NEW; END IF;
  PERFORM id FROM public.bloqueo_transacciones WHERE id = 1 FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.alojamiento_id = NEW.alojamiento_id AND r.estado = 'CONFIRMED'
      AND r.id <> NEW.id AND r.fecha_entrada < NEW.fecha_salida
      AND r.fecha_salida > NEW.fecha_entrada
  ) THEN
    RAISE EXCEPTION 'Este alojamiento ya está reservado en esas fechas. Elige otras fechas'
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reservas_sin_solapamiento
BEFORE INSERT OR UPDATE OF alojamiento_id, fecha_entrada, fecha_salida, estado
ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.rechazar_reserva_solapada();
`;

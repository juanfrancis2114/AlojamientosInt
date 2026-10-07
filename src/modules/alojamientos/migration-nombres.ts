export const migrationNombres = `
CREATE OR REPLACE FUNCTION public.validar_nombre_usuario()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.nombre := normalize(btrim(NEW.nombre), NFC);
  IF NEW.nombre IS NULL OR char_length(NEW.nombre) NOT BETWEEN 2 AND 100
    OR NEW.nombre !~ '^[[:alpha:]]+([ ''-][[:alpha:]]+)*$' THEN
    RAISE EXCEPTION 'Nombre de 2 a 100 caracteres: letras, espacios, apóstrofes y guiones; sin números'
      USING ERRCODE = '23514', CONSTRAINT = 'nombre_usuario_valido';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER usuarios_nombre_valido BEFORE INSERT OR UPDATE OF nombre
ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.validar_nombre_usuario();
`;

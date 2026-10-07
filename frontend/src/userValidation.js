export const namePattern = "[\\p{L}\\p{M}]+(?:[ '\\-][\\p{L}\\p{M}]+)*";
export const nameHelp = 'De 2 a 100 caracteres. Solo letras, espacios, apóstrofes y guiones; sin números.';
export const emailHelp = 'Correo válido, con un solo @ y máximo 254 caracteres.';
export function validateUserInput(event) {
  const input = event.currentTarget;
  const value = input.value.trim();
  let error = '';
  if (['name', 'nombre'].includes(input.name) && value &&
    (value.length < 2 || value.length > 100 || !/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u.test(value))) error = nameHelp;
  if (['email', 'correo'].includes(input.name) && value &&
    (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) error = emailHelp;
  input.setCustomValidity(error);
}

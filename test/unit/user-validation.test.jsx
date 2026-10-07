// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { validateUserInput } from '../../frontend/src/userValidation';
describe('Validación de usuarios', () => {
  function error(name, value) {
    const input = document.createElement('input');
    input.name = name;
    input.value = value;
    validateUserInput({ currentTarget: input });
    return input.validationMessage;
  }
  it('acepta nombres con tildes, ñ, guiones y apóstrofes', () => {
    for (const name of ['María José', 'Íñigo Muñoz', "Ana O'Neill", 'Ana-María']) expect(error('nombre', name)).toBe('');
  });
  it('rechaza números y limpia el error al corregir', () => {
    expect(error('name', 'Juan123')).toContain('sin números');
    const input = document.createElement('input'); input.name = 'name'; input.value = 'Juan123';
    validateUserInput({currentTarget:input}); expect(input.validity.customError).toBe(true);
    input.value = 'Juan Pérez'; validateUserInput({currentTarget:input}); expect(input.validity.customError).toBe(false);
  });
  it('rechaza doble arroba y correos excesivamente largos', () => {
    expect(error('correo', 'uno@@test.local')).toContain('un solo @');
    expect(error('email', 'a'.repeat(255) + '@test.local')).toContain('254');
    expect(error('correo', 'uno@test.local')).toBe('');
  });
});

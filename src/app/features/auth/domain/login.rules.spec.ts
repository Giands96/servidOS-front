import { anApiError } from '../../../../testing/builders';
import { countdownProgress, formatCountdown, loginErrorMessage, marksFields } from './login.rules';

describe('formatCountdown', () => {
  it.each([
    [42, '0:42'],
    [0, '0:00'],
    [5, '0:05'],
    [60, '1:00'],
    [125, '2:05'],
    [3600, '60:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });

  it('clamps negatives to 0:00 and floors fractions', () => {
    expect(formatCountdown(-3)).toBe('0:00');
    expect(formatCountdown(41.9)).toBe('0:41');
  });
});

describe('countdownProgress', () => {
  it('is the remaining fraction, clamped to 0..1', () => {
    expect(countdownProgress(30, 60)).toBe(0.5);
    expect(countdownProgress(0, 60)).toBe(0);
    expect(countdownProgress(90, 60)).toBe(1);
    expect(countdownProgress(10, 0)).toBe(0);
  });
});

describe('loginErrorMessage', () => {
  it('401 is always the generic message, whatever the backend says', () => {
    expect(loginErrorMessage(401, anApiError(401, 'Usuario deshabilitado'))).toBe('Credenciales inválidas');
    expect(loginErrorMessage(401, null)).toBe('Credenciales inválidas');
  });

  it('429 returns null: the UI shows the countdown instead of a message', () => {
    expect(loginErrorMessage(429, anApiError(429, 'Too many'))).toBeNull();
  });

  it('422 uses the backend message', () => {
    expect(loginErrorMessage(422, anApiError(422, 'email: debe ser un correo válido'))).toBe(
      'email: debe ser un correo válido',
    );
  });

  it('422 without a usable body falls back to a validation message', () => {
    expect(loginErrorMessage(422, null)).toBe('Revisa los datos ingresados');
  });

  it('other statuses use the backend message when present', () => {
    expect(loginErrorMessage(500, anApiError(500, 'Error interno'))).toBe('Error interno');
  });

  it('network failure (status 0) says the server is unreachable', () => {
    expect(loginErrorMessage(0, null)).toBe('No se pudo conectar con el servidor');
  });

  it('unknown failure without body gets a generic retry message', () => {
    expect(loginErrorMessage(503, 'not json')).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.');
  });
});

describe('marksFields', () => {
  it('only 422 marks the form fields', () => {
    expect(marksFields(422)).toBe(true);
    expect([401, 429, 500, 0].some(marksFields)).toBe(false);
  });
});

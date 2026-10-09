import { readApiError } from '../../../core/http/domain/api-error.rules';

export const INVALID_CREDENTIALS = 'Credenciales inválidas';

/*
  Este archivo contiene reglas de negocio relacionadas con el login,
   como la interpretación de errores de la API y el formateo de mensajes para mostrar al usuario.
*/

//* Conteo regresivo para el límite de velocidad (por ejemplo, 42 -> "0:42"). Los negativos se ajustan a cero. */
export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Remaining fraction (0..1) for the countdown bar; 0 when there is no total. */
export function countdownProgress(remaining: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, remaining / total));
}

/**
 * Message to show for a failed login, or null when the UI shows something else (429: countdown).
 * 401 is always generic so the form never reveals which part of the credentials failed.
 */
export function loginErrorMessage(status: number, body: unknown): string | null {
  switch (status) {
    case 401:
      return INVALID_CREDENTIALS;
    case 429:
      return null;
    case 0:
      return 'No se pudo conectar con el servidor';
    default: {
      const message = readApiError(body)?.message;
      if (message) {
        return message;
      }
      return status === 422 ? 'Revisa los datos ingresados' : 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    }
  }
}

/** Validation errors (422) mark the form fields; the backend sends one message, not one per field. */
export function marksFields(status: number): boolean {
  return status === 422;
}

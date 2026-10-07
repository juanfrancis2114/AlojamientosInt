export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
const pending = new Map();
export async function api(path, body, method = body === undefined ? 'GET' : 'POST', headers = {}) {
  const request = async () => {
    const response = await fetch('/api/v1/' + path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 204) return null;
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        'El servidor no respondió correctamente. Intenta de nuevo.',
        response.status,
      );
    }
    if (!response.ok)
      throw new ApiError(
        Array.isArray(data.detail)
          ? data.detail.join(', ')
          : data.detail || data.message || 'No se pudo completar la solicitud',
        response.status,
      );
    return data;
  };
  // Solo agrupa GET simultáneos, nunca guarda datos privados en caché persistente.
  if (method !== 'GET') return request();
  const key = path + JSON.stringify(headers);
  if (!pending.has(key))
    pending.set(
      key,
      request().finally(() => pending.delete(key)),
    );
  return pending.get(key);
}

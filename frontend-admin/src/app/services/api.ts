export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloud-pos-13ld.onrender.com';

// Cache en memoria para respuestas GET rápidas (SWR)
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos de validez

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = 'Ocurrió un error en el servidor';
    try {
      const data = await response.json();
      if (data.message) {
        errorMessage = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message;
      }
    } catch (_) {}
    throw new Error(errorMessage);
  }
  // 204 No Content (ej. DELETE exitoso) — no tiene cuerpo JSON
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  get: async (endpoint: string, options?: { force?: boolean }) => {
    const now = Date.now();
    const cached = apiCache.get(endpoint);
    // Si tenemos datos en caché y no se forza la recarga, retornar inmediatamente
    if (!options?.force && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(response);
    apiCache.set(endpoint, { data, timestamp: now });
    return data;
  },

  post: async (endpoint: string, body: any) => {
    // Las mutaciones invalidan el caché para asegurar datos frescos
    apiCache.clear();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  put: async (endpoint: string, body: any) => {
    apiCache.clear();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  delete: async (endpoint: string) => {
    apiCache.clear();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  invalidateCache: () => {
    apiCache.clear();
  },

  setToken: (token: string | null) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_tenant');
      }
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  saveSession: (user: any, tenant: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_tenant', JSON.stringify(tenant));
    }
  },

  getSession: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('auth_user');
      const tenant = localStorage.getItem('auth_tenant');
      return {
        user: user ? JSON.parse(user) : null,
        tenant: tenant ? JSON.parse(tenant) : null,
      };
    }
    return { user: null, tenant: null };
  },
};
export default api;

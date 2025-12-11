// Minimal API helper used across the app
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/**
 * Lightweight wrapper for authenticated fetch calls.
 * @param {string} path - API path (e.g. '/me' or '/classes/my')
 * @param {string} token - Bearer token
 * @param {RequestInit} opts - fetch options (method, headers, body, etc.)
 */
export async function authFetch(path, token, opts = {}) {
	const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
	const headers = Object.assign({}, opts.headers || {});
	if (token) headers["Authorization"] = `Bearer ${token}`;
	// default to JSON accept
	if (!headers["Accept"]) headers["Accept"] = "application/json";

	const res = await fetch(url, Object.assign({}, opts, { headers }));
	return res;
}

export default API_BASE;

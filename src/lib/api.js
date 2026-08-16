export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function postJson(path, payload = {}) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

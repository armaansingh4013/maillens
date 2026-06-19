const API_BASE = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
  ).replace(/\/$/, "");
  
  export const apiBase = API_BASE;
  
  export async function request(
    path: string,
    options: RequestInit = {}
  ) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
  
    if (!response.ok) {
      throw new Error(
        data?.error || `Request failed with status ${response.status}`
      );
    }
  
    return data;
  }
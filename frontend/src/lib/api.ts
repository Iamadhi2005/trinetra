const API_BASE_URL = "http://localhost:8000/api";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("trinetra_token");
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("trinetra_token", token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("trinetra_token");
    localStorage.removeItem("trinetra_user");
  }
}

async function autoLoginDemo(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    if (res.ok) {
      const data = await res.json();
      setAuthToken(data.access_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("trinetra_user", JSON.stringify(data.user));
      }
      return data.access_token;
    }
  } catch (e) {}
  return null;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAuthToken();
  if (!token && endpoint !== "/auth/login") {
    token = await autoLoginDemo();
  }

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && endpoint !== "/auth/login") {
    token = await autoLoginDemo();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

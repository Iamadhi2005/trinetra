export const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://trinetra-ya1h.onrender.com/api";
export const LOCAL_API_URL = "http://localhost:8000/api";
export const API_BASE_URL = PRIMARY_API_URL;

export function getActiveApiUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("trinetra_api_url");
    if (saved) return saved.replace(/\/+$/, "");
  }
  return PRIMARY_API_URL;
}

export function setActiveApiUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("trinetra_api_url", url);
  }
}

export function getWsUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getActiveApiUrl().replace(/\/api\/?$/, "");
  const wsProto = base.startsWith("https") ? "wss://" : "ws://";
  const cleanHost = base.replace(/^https?:\/\//, "");
  return `${wsProto}${cleanHost}${cleanPath}`;
}

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

async function autoLoginDemo(targetBase?: string): Promise<string | null> {
  const base = targetBase || getActiveApiUrl();
  const fallback = base.includes("localhost") ? PRIMARY_API_URL : LOCAL_API_URL;
  try {
    let res: Response;
    try {
      res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" }),
      });
    } catch {
      res = await fetch(`${fallback}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" }),
      });
    }

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

  const primary = getActiveApiUrl();
  const secondary = primary.includes("localhost") ? PRIMARY_API_URL : LOCAL_API_URL;

  let response: Response;
  try {
    response = await fetch(`${primary}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    try {
      response = await fetch(`${secondary}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw netErr;
    }
  }

  if (response.status === 401 && endpoint !== "/auth/login") {
    token = await autoLoginDemo(primary);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      try {
        response = await fetch(`${primary}${endpoint}`, { ...options, headers });
      } catch {
        response = await fetch(`${secondary}${endpoint}`, { ...options, headers });
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}


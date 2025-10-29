const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://kadzysakatna.onrender.com"

function getAuthTokenFromStorage(): string | null {
  try {
    if (typeof window === "undefined") return null
    return localStorage.getItem("tricy_token")
  } catch {
    return null
  }
}

export async function post(path: string, body: any) {
  const token = getAuthTokenFromStorage()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    // token invalid or expired - clear storage and notify app
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tricy_token")
        localStorage.removeItem("tricy_user")
        window.dispatchEvent(new CustomEvent("tricy_logout"))
      }
    } catch {}
    throw { message: "Unauthorized", status: 401 }
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw data || { message: res.statusText }
  return data
}

export async function get(path: string) {
  const token = getAuthTokenFromStorage()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (res.status === 401) {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tricy_token")
        localStorage.removeItem("tricy_user")
        window.dispatchEvent(new CustomEvent("tricy_logout"))
      }
    } catch {}
    throw { message: "Unauthorized", status: 401 }
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw data || { message: res.statusText }
  return data
}

export async function patch(path: string, body: any) {
  const token = getAuthTokenFromStorage()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tricy_token")
        localStorage.removeItem("tricy_user")
        window.dispatchEvent(new CustomEvent("tricy_logout"))
      }
    } catch {}
    throw { message: "Unauthorized", status: 401 }
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw data || { message: res.statusText }
  return data
}

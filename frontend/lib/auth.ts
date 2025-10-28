import { get } from "@/lib/api"

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null
  const s = localStorage.getItem("tricy_user")
  return s ? JSON.parse(s) : null
}

export function logout(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("tricy_token")
  localStorage.removeItem("tricy_user")
  // notify other tabs
  window.dispatchEvent(new CustomEvent("tricy_logout"))
}

export async function fetchUserFromApi(id?: string) {
  // Use provided id or fall back to stored user
  const user = getStoredUser()
  const userId = id ?? user?.user_id
  if (!userId) return null
  try {
    // api.get() automatically attaches token from localStorage
    const res = await get(`/users/${userId}`)
    return res
  } catch (err) {
    console.error("fetchUserFromApi", err)
    return null
  }
}

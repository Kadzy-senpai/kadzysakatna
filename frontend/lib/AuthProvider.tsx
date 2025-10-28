"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { post as apiPost, get as apiGet } from "./api"

type User = any

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: any) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null
      const s = localStorage.getItem("tricy_user")
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null
      return localStorage.getItem("tricy_token")
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // keep localStorage and state in sync when page loads
    try {
      const s = localStorage.getItem("tricy_user")
      const t = localStorage.getItem("tricy_token")
      if (s && !user) setUser(JSON.parse(s))
      if (t && !token) setToken(t)
    } catch (e) {
      // ignore
    }
    // listen for global logout event (e.g., when API detects 401)
    function onLogout() {
      setUser(null)
      setToken(null)
    }
    try {
      window.addEventListener("tricy_logout", onLogout as EventListener)
    } catch {}
    return () => {
      try {
        window.removeEventListener("tricy_logout", onLogout as EventListener)
      } catch {}
    }
  }, [])

  async function login(email: string, password: string) {
    setLoading(true)
    try {
      const resp = await apiPost("/auth/login", { email, password })
      if (resp?.access_token) {
        localStorage.setItem("tricy_token", resp.access_token)
        localStorage.setItem("tricy_user", JSON.stringify(resp.user || {}))
        setToken(resp.access_token)
        setUser(resp.user || null)
        return resp.user || null
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  async function register(payload: any) {
    setLoading(true)
    try {
      await apiPost("/auth/register", payload)
      // optionally auto-login after register
      if (payload.email && payload.password) {
        await login(payload.email, payload.password)
      }
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    try {
      localStorage.removeItem("tricy_token")
      localStorage.removeItem("tricy_user")
    } catch {}
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

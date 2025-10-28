"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileContainer } from "@/components/mobile-container"
import { BottomNav } from "@/components/bottom-nav"
import { User, Mail, Phone, Edit, LogOut, ChevronRight } from "lucide-react"
import { get } from "@/lib/api"
import { getStoredUser, logout, fetchUserFromApi } from "@/lib/auth"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any | null>(getStoredUser())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<"edit" | "logout" | null>(null)

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) {
      router.push("/login?type=passenger")
      return
    }

    // fetch latest user data
    ;(async () => {
      setLoading(true)
      const fresh = await fetchUserFromApi()
      setUser(fresh || stored)
      setLoading(false)
    })()
  }, [])

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to log out?")) return
    setActionLoading("logout")
    try {
      logout()
      router.push("/")
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditProfile = async () => {
    setActionLoading("edit")
    try {
      await router.push("/profile/edit")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <MobileContainer>
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-primary-foreground/90 mt-1">Manage your account</p>
      </header>

      <div className="p-6 space-y-6">
        {/* Profile Card */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {loading ? (
                <div className="h-24 w-24 rounded-full bg-muted/30 animate-pulse" />
              ) : (
                <>
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {user?.name
                        ? user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{user?.role ? `${user.role} Account` : "Passenger Account"}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium text-foreground">{user?.name ?? ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 bg-primary/10 rounded-full">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user?.email ?? ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 bg-primary/10 rounded-full">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground">{user?.phone ?? ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleEditProfile}
            className="w-full justify-between hover:bg-muted transition-colors"
            variant="outline"
            size="lg"
            isLoading={actionLoading === "edit"}
            loadingText="Opening editor..."
          >
            <span className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Profile
            </span>
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            onClick={handleLogout}
            className="w-full justify-between bg-destructive hover:bg-destructive/90 transition-colors"
            size="lg"
            isLoading={actionLoading === "logout"}
            loadingText="Logging out..."
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Logout
            </span>
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* App Info */}
        <Card className="bg-muted/50 border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">SAKATNA v1.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">MADE BY KADZY😉</p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </MobileContainer>
  )
}

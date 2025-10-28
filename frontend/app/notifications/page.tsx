"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MobileContainer } from "@/components/mobile-container"
import { ArrowLeft, Bell, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useEffect, useState } from "react"
import { get as apiGet, post as apiPost } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"

type BackendNotification = {
  notification_id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<BackendNotification[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingRead, setMarkingRead] = useState<string | null>(null)  // Track which notification is being marked as read

  const user = getStoredUser()

  useEffect(() => {
    if (!user?.user_id) return
    setLoading(true)
    setError(null)
    apiGet(`/notifications/user/${user.user_id}`)
      .then((res) => setNotifications(Array.isArray(res) ? res : []))
      .catch((err) => setError((err as any)?.message || JSON.stringify(err)))
      .finally(() => setLoading(false))
  }, [user?.user_id])

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-secondary" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return <Info className="h-5 w-5 text-primary" />
    }
  }

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  async function markRead(id: string) {
    setMarkingRead(id)
    try {
      const res = await apiPost(`/notifications/${id}/read`, {})
      setNotifications((prev) => (prev ? prev.map((n) => (n.notification_id === id ? res : n)) : prev))
    } catch (err) {
      setError("Failed to mark notification as read. Please try again.")
      setTimeout(() => setError(null), 3000)
    } finally {
      setMarkingRead(null)
    }
  }

  return (
    <MobileContainer>
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/passenger" className="hover:opacity-80">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-secondary text-secondary-foreground">{unreadCount} new notification{unreadCount !== 1 ? "s" : ""}</Badge>
        )}
      </header>

      <div className="p-6 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-lg animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-muted"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
            {error}
          </div>
        )}

        {!loading && notifications && notifications.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">We'll notify you when something important happens</p>
            </CardContent>
          </Card>
        )}

        {notifications?.map((notification) => (
          <Card
            key={notification.notification_id}
            className={`shadow-lg transition-all ${!notification.read ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{notification.title}</CardTitle>
                    {!notification.read && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                </div>

                {!notification.read && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead(notification.notification_id)}
                      isLoading={markingRead === notification.notification_id}
                      loadingText="Marking..."
                      className="text-sm text-primary hover:text-primary hover:bg-primary/10"
                    >
                      Mark read
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-foreground">{notification.message}</p>
              <p className="text-xs text-muted-foreground">{notification.created_at ? new Date(notification.created_at).toLocaleString() : ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </MobileContainer>
  )
}

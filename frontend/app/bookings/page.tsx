"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MobileContainer } from "@/components/mobile-container"
import { BottomNav } from "@/components/bottom-nav"
import { MapPin, Navigation, Calendar, Clock } from "lucide-react"
import { get } from "@/lib/api"
import { post } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const user = getStoredUser()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const user = getStoredUser()
    if (!user) {
      // nothing to fetch if not authenticated
      setBookings([])
      setLoading(false)
      return
    }

    let mounted = true

    ;(async () => {
      setLoading(true)
      try {
        let all: any[] = []

        // If the current user is a driver, show that driver's accepted rides
        if (user.role === "driver") {
          const driverId = user.driver_id || user.user_id
          all = driverId ? await get(`/bookings/driver/${driverId}`) : []
        } else {
          // passenger: show their booking history
          all = await get("/bookings")
        }

        // if request was aborted don't update state
        if (signal.aborted || !mounted) return

        let mine = Array.isArray(all) ? all : []

        // For passengers, filter to only their bookings
        if (user.role !== "driver") {
          mine = mine.filter((b: any) => b.user_id === user.user_id)
        }

        // sort so non-completed rides appear first, then completed rides at the bottom.
        // Within each group, keep newest-first ordering by created_at.
        mine = mine.sort((a: any, b: any) => {
          const sa = (a?.status || "").toLowerCase()
          const sb = (b?.status || "").toLowerCase()
          const aCompleted = sa === "completed" ? 1 : 0
          const bCompleted = sb === "completed" ? 1 : 0
          if (aCompleted !== bCompleted) return aCompleted - bCompleted

          const ta = a?.created_at || a?.createdAt || ""
          const tb = b?.created_at || b?.createdAt || ""
          if (ta === tb) return 0
          return tb.localeCompare(ta)
        })

        setBookings(mine)
      } catch (err: any) {
        // if unauthorized, force redirect to login (api.get clears storage on 401)
        if (err?.status === 401 || err?.message === "401") {
          window.location.href = "/login"
          return
        }
        if (!signal.aborted && mounted) setBookings([])
      }
      if (!signal.aborted && mounted) setLoading(false)
    })()

    const onLogout = () => {
      setBookings([])
      setLoading(false)
    }

    window.addEventListener("tricy_logout", onLogout)

    return () => {
      mounted = false
      controller.abort()
      window.removeEventListener("tricy_logout", onLogout)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-secondary text-secondary-foreground"
      case "ongoing":
        return "bg-primary text-primary-foreground"
      case "cancelled":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusLabel = (status: string) => {
    if (!status) return "Unknown"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const handleCancel = async (booking_id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return
    setActionLoading(booking_id)
    try {
      await post(`/bookings/${booking_id}/cancel`, {})
      // Remove cancelled booking from local state
      setBookings((prev) => prev.filter((b) => b.booking_id !== booking_id))
    } catch (e) {
      alert("Failed to cancel booking")
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  const handleComplete = async (booking_id: string) => {
    if (!confirm("Mark this ride as completed?")) return
    setActionLoading(booking_id)
    try {
      const res = await post(`/bookings/${booking_id}/complete`, {})
      const newStatus = res.booking?.status || 'completed'
      setBookings((prev) => prev.map((b) => (b.booking_id === booking_id ? { ...b, status: newStatus } : b)))
      // notify other pages (driver home) that a booking status changed
      try {
        window.dispatchEvent(new CustomEvent('tricy_booking_updated', { detail: { booking_id, status: newStatus } }))
      } catch (e) {
        // ignore in non-browser contexts
      }
    } catch (e) {
      alert("Failed to complete ride")
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <MobileContainer>
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <h1 className="text-2xl font-bold">{user?.role === 'driver' ? 'Active Rides' : 'Booking History'}</h1>
        <p className="text-primary-foreground/90 mt-1">{user?.role === 'driver' ? 'View and complete your active rides' : 'View all your rides'}</p>
      </header>

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 bg-muted/30 rounded animate-pulse" />
            <div className="h-24 bg-muted/30 rounded animate-pulse" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-muted-foreground">No bookings found.</p>
        ) : (
          // Split bookings into active (not completed) and completed lists
          (() => {
            const active = bookings.filter((b: any) => (b?.status || '').toLowerCase() !== 'completed')
            const completed = bookings.filter((b: any) => (b?.status || '').toLowerCase() === 'completed')
            return (
              <div className="space-y-6">
                {/* Active / In Progress Section */}
                {active.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold text-foreground mb-3">Active / In Progress</h2>
                    <div className="space-y-4">
                      {active.map((booking: any) => (
                        <Card key={booking.booking_id} className="shadow-lg">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{booking.created_at ? new Date(booking.created_at).toLocaleTimeString() : '—'}</CardTitle>
                              <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{booking.created_at ? new Date(booking.created_at).toLocaleDateString() : ''}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time || ''}</span>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-muted-foreground">Pickup</p>
                                  <p className="text-foreground">{booking.pickup_location || booking.pickup || ''}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Navigation className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-muted-foreground">Drop-off</p>
                                  <p className="text-foreground">{booking.dropoff_location || booking.dropoff || ''}</p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Fare</span>
                                <span className="text-lg font-bold text-foreground">₱{booking.fare}</span>
                              </div>
                            </div>
                            <div className="pt-2 flex items-center justify-between">
                              {booking.status === 'requested' && (
                                <Button 
                                  variant="ghost" 
                                  onClick={() => handleCancel(booking.booking_id)}
                                  isLoading={actionLoading === booking.booking_id}
                                  loadingText="Cancelling..."
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  Cancel booking
                                </Button>
                              )}

                              {user?.role === 'driver' && booking.status !== 'completed' && (
                                <Button 
                                  variant="default"
                                  onClick={() => handleComplete(booking.booking_id)}
                                  isLoading={actionLoading === booking.booking_id}
                                  loadingText="Completing..."
                                  className="ml-auto"
                                >
                                  Ride completed
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Divider */}
                {active.length > 0 && completed.length > 0 && (
                  <div className="py-2">
                    <div className="border-t border-border" />
                  </div>
                )}

                {/* Completed Section */}
                {completed.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold text-muted-foreground mb-3">Completed</h2>
                    <div className="space-y-4">
                      {completed.map((booking: any) => (
                        <Card key={booking.booking_id} className="shadow-lg">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{booking.created_at ? new Date(booking.created_at).toLocaleTimeString() : '—'}</CardTitle>
                              <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{booking.created_at ? new Date(booking.created_at).toLocaleDateString() : ''}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time || ''}</span>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-muted-foreground">Pickup</p>
                                  <p className="text-foreground">{booking.pickup_location || booking.pickup || ''}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Navigation className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-muted-foreground">Drop-off</p>
                                  <p className="text-foreground">{booking.dropoff_location || booking.dropoff || ''}</p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Fare</span>
                                <span className="text-lg font-bold text-foreground">₱{booking.fare}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )
          })()
        )}
      </div>

      <BottomNav />
    </MobileContainer>
  )
}

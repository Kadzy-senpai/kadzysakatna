"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MobileContainer } from "@/components/mobile-container"
import { BottomNav } from "@/components/bottom-nav"
import { MapPin, Navigation, DollarSign, Bell, CheckCircle } from "lucide-react"
import Link from "next/link"
import { DriverMap } from "@/components/driver-map"
import { get, post } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface BookingRequest {
  id: string
  passengerName: string
  pickup: string
  dropoff: string
  fare: number
  status: "pending" | "accepted" | "completed"
  pickup_lat?: number | null
  pickup_lng?: number | null
  dropoff_lat?: number | null
  dropoff_lng?: number | null
  created_at?: string | null
}

export default function DriverHomePage() {
  const [requestedBookings, setRequestedBookings] = useState<BookingRequest[]>([])
  const [acceptedBookingsState, setAcceptedBookingsState] = useState<BookingRequest[]>([])
  const [completedBookingsState, setCompletedBookingsState] = useState<BookingRequest[]>([])
  // coords for the currently active ride to show immediately on the map when accepting
  const [activeRideCoords, setActiveRideCoords] = useState<{
    pickup_lat?: number | null
    pickup_lng?: number | null
    dropoff_lat?: number | null
    dropoff_lng?: number | null
  } | undefined>(undefined)
  const user = getStoredUser()
  const driverId = user?.driver_id || user?.user_id
  const router = useRouter()

  // guard: only allow users with driver role to access this page
  useEffect(() => {
    if (!user) return
    if (user.role !== "driver") {
      // redirect to login for drivers (user may have logged in as passenger)
      router.push(`/login?type=driver`)
    }
  }, [user, router])

  useEffect(() => {
    let mounted = true
    async function fetchBookings() {
      try {
        const requested = await get(`/bookings/status/requested`)
        const accepted = driverId ? await get(`/bookings/driver/${driverId}`) : []
        if (!mounted) return
        // map backend bookings to BookingRequest shape
        const mapBooking = (b: any): BookingRequest => ({
          id: b.booking_id,
          passengerName: b.user_id || "Passenger",
          pickup: b.pickup_location || b.pickup || "",
          dropoff: b.dropoff_location || b.dropoff || "",
          fare: b.fare || 0,
          status: b.status === "requested" ? "pending" : b.status,
          created_at: b.created_at ?? b.createdAt ?? null,
          // keep coords if backend provided them
          pickup_lat: b.pickup_lat ?? b.pickupLat ?? null,
          pickup_lng: b.pickup_lng ?? b.pickupLng ?? null,
          dropoff_lat: b.dropoff_lat ?? b.dropoffLat ?? null,
          dropoff_lng: b.dropoff_lng ?? b.dropoffLng ?? null,
        })
        const requestedMapped = Array.isArray(requested) ? requested.map(mapBooking) : []
        const acceptedMapped = Array.isArray(accepted) ? accepted.map(mapBooking) : []

        // sort by created_at descending (newest first). created_at is ISO string so string compare works
        const sortDesc = (a: BookingRequest, b: BookingRequest) => {
          const ta = a.created_at || ""
          const tb = b.created_at || ""
          if (ta === tb) return 0
          return ta < tb ? 1 : -1
        }

        requestedMapped.sort(sortDesc)
        acceptedMapped.sort(sortDesc)

        // remove any requested bookings that are already accepted (dedupe)
        const acceptedIds = new Set(acceptedMapped.map((b) => b.id))
        const filteredRequested = requestedMapped.filter((b) => !acceptedIds.has(b.id))

        setRequestedBookings(filteredRequested)
        // partition accepted bookings into active vs completed, dedupe by id
        const active: BookingRequest[] = []
        const completed: BookingRequest[] = []
        const seen = new Set<string>()
        for (const b of acceptedMapped) {
          if (seen.has(b.id)) continue
          seen.add(b.id)
          if ((b.status || '').toLowerCase() === 'completed') {
            completed.push(b)
          } else {
            active.push(b)
          }
        }
        setAcceptedBookingsState(active)
        setCompletedBookingsState(completed)
      } catch (err) {
        console.error("fetch bookings", err)
      }
    }
    fetchBookings()
    const onBookingUpdated = (e: any) => {
      try {
        const detail = e?.detail || {}
        const { booking_id, status } = detail
        if (!booking_id) return
        if ((status || '').toLowerCase() === 'completed') {
          setAcceptedBookingsState((prev) => {
            const removed = prev.filter((b) => b.id !== booking_id)
            return removed
          })
          // move booking into completed state (if not already present)
          setCompletedBookingsState((prev) => {
            if (prev.some((b) => b.id === booking_id)) return prev
            // We may not have the booking props here; append a minimal record
            return [{ id: booking_id, passengerName: 'Passenger', pickup: '', dropoff: '', fare: 0, status: 'completed' }, ...prev]
          })
          // clear immediate ride coords when booking completed
          try {
            setActiveRideCoords(undefined)
          } catch {}
        }
      } catch (err) {
        console.error('tricy_booking_updated handler error', err)
      }
    }
    window.addEventListener('tricy_booking_updated', onBookingUpdated)
    return () => {
      mounted = false
      window.removeEventListener('tricy_booking_updated', onBookingUpdated)
    }
  }, [driverId])

  const handleAccept = async (id: string) => {
    try {
      if (!driverId) {
        alert("Driver id not found; ensure you are registered as a driver")
        return
      }
      // prevent accepting if there's already an active (non-completed) ride
      if (acceptedBookingsState.length > 0) {
        alert("You have an active ride. Complete it before accepting a new request.")
        return
      }
      // capture the booking object before we update state
      const bookingToMove = requestedBookings.find((b) => b.id === id) || null

      const resp: any = await post(`/bookings/${id}/assign/${driverId}`, {})

      // remove from requested list
      setRequestedBookings((prev) => prev.filter((b) => b.id !== id))

      // if backend returned booking payload, map and add to accepted state
        if (resp && resp.booking) {
        const b = resp.booking
        const mapped: BookingRequest = {
          id: b.booking_id,
          passengerName: b.user_id || "Passenger",
          pickup: b.pickup_location || b.pickup || "",
          dropoff: b.dropoff_location || b.dropoff || "",
          fare: b.fare || 0,
          status: b.status === "requested" ? "pending" : b.status,
          pickup_lat: b.pickup_lat ?? null,
          pickup_lng: b.pickup_lng ?? null,
          dropoff_lat: b.dropoff_lat ?? null,
          dropoff_lng: b.dropoff_lng ?? null,
        }
        // add mapped into active accepted bookings (remove any existing with same id)
        setAcceptedBookingsState((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)])
        // show pickup/dropoff on map immediately
        setActiveRideCoords({
          pickup_lat: mapped.pickup_lat ?? null,
          pickup_lng: mapped.pickup_lng ?? null,
          dropoff_lat: mapped.dropoff_lat ?? null,
          dropoff_lng: mapped.dropoff_lng ?? null,
        })
      } else if (bookingToMove) {
        setAcceptedBookingsState((prev) => [bookingToMove, ...prev.filter((p) => p.id !== bookingToMove.id)])
        // if backend didn't return payload, use bookingToMove coords if available
        setActiveRideCoords({
          pickup_lat: bookingToMove.pickup_lat ?? null,
          pickup_lng: bookingToMove.pickup_lng ?? null,
          dropoff_lat: bookingToMove.dropoff_lat ?? null,
          dropoff_lng: bookingToMove.dropoff_lng ?? null,
        })
      } else {
        // fallback: refresh accepted bookings
        try {
          const refreshed = driverId ? await get(`/bookings/driver/${driverId}`) : []
            if (Array.isArray(refreshed)) {
              const mapped = refreshed.map((b: any) => ({
                id: b.booking_id,
                passengerName: b.user_id || "Passenger",
                pickup: b.pickup_location || b.pickup || "",
                dropoff: b.dropoff_location || b.dropoff || "",
                fare: b.fare || 0,
                status: b.status === "requested" ? "pending" : b.status,
                pickup_lat: b.pickup_lat ?? null,
                pickup_lng: b.pickup_lng ?? null,
                dropoff_lat: b.dropoff_lat ?? null,
                dropoff_lng: b.dropoff_lng ?? null,
              }))
              const active2: BookingRequest[] = []
              const completed2: BookingRequest[] = []
              const seen2 = new Set<string>()
              for (const x of mapped) {
                if (seen2.has(x.id)) continue
                seen2.add(x.id)
                if ((x.status || '').toLowerCase() === 'completed') completed2.push(x)
                else active2.push(x)
              }
              setAcceptedBookingsState(active2)
              setCompletedBookingsState(completed2)
            } else {
              setAcceptedBookingsState([])
              setCompletedBookingsState([])
            }
        } catch (e) {
          console.error('failed to refresh accepted bookings', e)
        }
      }
    } catch (err) {
      alert("Failed to accept booking: " + ((err as any)?.message || JSON.stringify(err)))
    }
  }

  const handleDecline = (id: string) => {
    setRequestedBookings((prev) => prev.filter((b) => b.id !== id))
  }

  // helper to find a booking object by id from requestedBookings (used when moving to accepted)
  // (booking lookup is done inline in handleAccept)

  const pendingBookings = requestedBookings
  const activeBookings = acceptedBookingsState
  const completedBookings = completedBookingsState

  return (
    <MobileContainer>
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <Bell className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            {activeBookings.length} Active rides
          </Badge>
          <Badge
            variant="outline"
            className="px-3 py-1 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
          >
            {completedBookings.length} Completed
          </Badge>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <Card className="shadow-lg overflow-hidden">
            <DriverMap
              rideCoords={
                activeRideCoords
                  ? activeRideCoords
                  : activeBookings.length > 0
                  ? (() => {
                      const b = activeBookings[0] as any
                      return {
                        pickup_lat: b.pickup_lat ?? null,
                        pickup_lng: b.pickup_lng ?? null,
                        dropoff_lat: b.dropoff_lat ?? null,
                        dropoff_lng: b.dropoff_lng ?? null,
                      }
                    })()
                  : undefined
              }
            />

            {/* Active rides removed from home — active rides are available on the Bookings page */}
        </Card>

        {/* Pending Requests */}
    {pendingBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">New Requests</h2>
      {pendingBookings.map((booking) => (
              <Card key={booking.id} className="shadow-lg border-l-4 border-l-secondary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{booking.passengerName}</CardTitle>
                    <Badge className="bg-secondary text-secondary-foreground">₱{booking.fare}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-muted-foreground">Pickup</p>
                        <p className="text-foreground">{booking.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Navigation className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-muted-foreground">Drop-off</p>
                        <p className="text-foreground">{booking.dropoff}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleAccept(booking.id)} className="flex-1" size="sm" disabled={acceptedBookingsState.length > 0}>
                      Accept
                    </Button>
                    <Button onClick={() => handleDecline(booking.id)} variant="outline" className="flex-1" size="sm">
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* If driver has active ride, show explanatory banner */}
        {acceptedBookingsState.length > 0 && (
          <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            You have an active ride. Complete it before accepting new requests.
          </div>
        )}

        {/* Active rides are now shown on the Bookings page */}

        {/* Empty State */}
        {pendingBookings.length === 0 && activeBookings.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active booking requests</p>
              <p className="text-sm text-muted-foreground mt-1">New requests will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav userType="driver" />
    </MobileContainer>
  )
}

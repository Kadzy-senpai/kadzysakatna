"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { MobileContainer } from "@/components/mobile-container"
import { BottomNav } from "@/components/bottom-nav"
import { MapPin, Navigation, Bell } from "lucide-react"
import Link from "next/link"
import { PassengerMap } from "@/components/passenger-map"
import { useRouter } from "next/navigation"
import { post } from "@/lib/api"
import { getStoredUser } from "@/lib/auth"

export default function PassengerHomePage() {
  const [pickup, setPickup] = useState("")
  const [dropoff, setDropoff] = useState("")
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null)
  const [isSending, setIsSending] = useState(false)
  const router = useRouter()
  // guard: only allow users with passenger role to access this page
  useEffect(() => {
    const user = getStoredUser()
    if (!user) return
    if (user.role !== "passenger") {
      router.push(`/login?type=passenger`)
    }
  }, [router])

  useEffect(() => {
    if (!userCoords && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        () => {},
        { enableHighAccuracy: true },
      )
    }
  }, [userCoords])

  // compute distance and fare when dropoff coords set
  useEffect(() => {
    if (!userCoords || !dropoffCoords) {
      setDistanceKm(null)
      setEstimatedFare(null)
      return
    }

    const toRad = (v: number) => (v * Math.PI) / 180
    const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371 // km
      const dLat = toRad(b.lat - a.lat)
      const dLon = toRad(b.lng - a.lng)
      const lat1 = toRad(a.lat)
      const lat2 = toRad(b.lat)
      const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
      const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
      return R * c
    }

    const km = haversineKm(userCoords, dropoffCoords)
    setDistanceKm(km)

    // fare formula: base + per_km * distance (simple estimate)
    const baseFare = 30 // PHP
    const perKm = 12 // PHP per km
    const fare = Math.max(baseFare, Math.round((baseFare + perKm * km) * 100) / 100)
    setEstimatedFare(fare)
  }, [userCoords, dropoffCoords])

  const handleBookNow = async () => {
    const user = getStoredUser()
    if (!user) {
      alert("You must be logged in to create a booking.")
      return
    }
    setIsSending(true)
    try {
      // simple fixed fare for now
      // use estimated fare if available, else fallback to previous fixed fare
      const fare = estimatedFare ?? 50
      const body: any = {
        user_id: user.user_id,
        pickup_location: pickup,
        dropoff_location: dropoff,
        pickup_lat: userCoords?.lat,
        pickup_lng: userCoords?.lng,
        fare,
      }
      if (dropoffCoords) {
        body.dropoff_lat = dropoffCoords.lat
        body.dropoff_lng = dropoffCoords.lng
      }
      const created = await post("/bookings", body)
      if (created) {
        // navigate to bookings list
        router.push("/bookings")
      } else {
        alert("Booking failed: no response from server")
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || "Failed to send booking request")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <MobileContainer>
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Book a Tricycle</h1>
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <Bell className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <p className="text-primary-foreground/90">Where would you like to go?</p>
      </header>

      <div className="p-6 space-y-6">
        {/* Booking Form */}
        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Pickup Location
              </Label>
              <Input
                id="pickup"
                placeholder="Enter pickup location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropoff" className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-secondary" />
                Drop-off Location
              </Label>
              <Input
                id="dropoff"
                placeholder="Enter drop-off location"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg overflow-hidden">
          <PassengerMap
            pickup={pickup}
            dropoff={dropoff}
            onDropoffSelect={(lat, lng) => {
              setDropoff(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
              setDropoffCoords({ lat, lng })
            }}
          />

          {distanceKm !== null && (
            <div className="p-4 border-t border-border text-sm">
              <div>Distance: <strong>{distanceKm.toFixed(2)} km</strong></div>
              <div>Estimated Fare: <strong>₱{(estimatedFare ?? 0).toFixed(2)}</strong></div>
            </div>
          )}
        </Card>

        {/* Book Now Button */}
        <Button onClick={handleBookNow} className="w-full" size="lg" disabled={!pickup || !dropoff || isSending}>
          {isSending ? "Sending..." : "Book Now"}
        </Button>

        {/* Quick Info */}
        <Card className="bg-secondary/10 border-secondary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-muted-foreground">
              Average wait time: <span className="font-semibold text-foreground">5-10 minutes</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNav userType="passenger" />
    </MobileContainer>
  )
}

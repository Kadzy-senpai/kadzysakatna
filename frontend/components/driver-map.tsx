"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Users } from "lucide-react"

interface NearbyPassenger {
  id: string
  name: string
  lat: number
  lng: number
}

interface DriverMapProps {
  activeRide?: {
    pickup: { lat: number; lng: number }
    dropoff: { lat: number; lng: number }
  }
  // alternative: allow passing raw coords from booking object
  rideCoords?: {
    pickup_lat?: number | null
    pickup_lng?: number | null
    dropoff_lat?: number | null
    dropoff_lng?: number | null
  }
}

export function DriverMap({ activeRide, rideCoords }: DriverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nearbyPassengers, setNearbyPassengers] = useState<NearbyPassenger[]>([])
  const leafletRef = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)
  const passengerMarkersRef = useRef<any[]>([])
  const routeRef = useRef<any>(null)

  // nearbyPassengers is left empty by default; in production this should come from the backend

  // Get driver's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLoading(false)
        },
        (error) => {
          console.error("[v0] Geolocation error:", error)
          // Default to Manila coordinates
          setDriverLocation({ lat: 14.5995, lng: 120.9842 })
          setError("Location access denied. Showing default location.")
          setLoading(false)
        },
        { enableHighAccuracy: true, maximumAge: 10000 },
      )

      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      setDriverLocation({ lat: 14.5995, lng: 120.9842 })
      setError("Geolocation not supported")
      setLoading(false)
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!driverLocation || !mapRef.current || map) return

    const initMap = async () => {
  const L = (await import("leaflet")).default
  // import the leaflet css; a declaration file is added to avoid TS errors
  await import("leaflet/dist/leaflet.css")

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

  const newMap = L.map(mapRef.current as HTMLElement).setView([driverLocation.lat, driverLocation.lng], 14)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(newMap)

      // store leaflet reference for other effects
      leafletRef.current = L

      // Add driver marker (tricycle icon)
      const driverIcon = L.divIcon({
        className: "custom-driver-marker",
        html: `<div style="background: #4caf50; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">🛺</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(newMap)
        .bindPopup("Your Location (Driver)")

      driverMarkerRef.current = driverMarker

      setMap(newMap)
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [driverLocation])

  // Add nearby passenger markers
  useEffect(() => {
    if (!map) return

    // remove existing passenger markers
    passengerMarkersRef.current.forEach((m) => m.remove())
    passengerMarkersRef.current = []

    if (nearbyPassengers.length === 0) return

    const L = leafletRef.current || require("leaflet")

    nearbyPassengers.forEach((passenger) => {
      const passengerIcon = L.divIcon({
        className: "custom-passenger-marker",
        html: `<div style="background: #4f83cc; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const marker = L.marker([passenger.lat, passenger.lng], { icon: passengerIcon })
        .addTo(map)
        .bindPopup(`Passenger: ${passenger.name}`)

      passengerMarkersRef.current.push(marker)
    })

    return () => {
      passengerMarkersRef.current.forEach((marker) => marker.remove())
      passengerMarkersRef.current = []
    }
  }, [map, nearbyPassengers])

  // Add active ride route
  useEffect(() => {
    // determine if we have an active ride either from activeRide prop or rideCoords
    const effectiveRide = activeRide
      ? activeRide
      : rideCoords && rideCoords.pickup_lat && rideCoords.pickup_lng && rideCoords.dropoff_lat && rideCoords.dropoff_lng
      ? {
          pickup: { lat: Number(rideCoords.pickup_lat), lng: Number(rideCoords.pickup_lng) },
          dropoff: { lat: Number(rideCoords.dropoff_lat), lng: Number(rideCoords.dropoff_lng) },
        }
      : undefined

    if (!map || !effectiveRide) {
      // if ride cleared, remove any existing route and pickup/dropoff markers
      if (routeRef.current) {
        try {
          routeRef.current.remove()
        } catch {}
        routeRef.current = null
      }
      return
    }

    const L = leafletRef.current || require("leaflet")

    // remove previous route and markers
    if (routeRef.current) {
      try {
        routeRef.current.remove()
      } catch {}
      routeRef.current = null
    }

    // Add pickup marker
    const pickupIcon = L.divIcon({
      className: "pickup-marker",
      html: `<div style="background: #ff9800; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display:flex;align-items:center;justify-content:center;">📍</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })

    const dropoffIcon = L.divIcon({
      className: "dropoff-marker",
      html: `<div style="background: #6574cd; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display:flex;align-items:center;justify-content:center;">🏁</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })

    const pickupMarker = L.marker([effectiveRide.pickup.lat, effectiveRide.pickup.lng], { icon: pickupIcon })
      .addTo(map)
      .bindPopup("Pickup Location")

    const dropoffMarker = L.marker([effectiveRide.dropoff.lat, effectiveRide.dropoff.lng], { icon: dropoffIcon })
      .addTo(map)
      .bindPopup("Drop-off Location")

    // Build route: driver -> pickup -> dropoff (if driverLocation available include it)
    const routePoints: [number, number][] = []
  if (driverLocation) routePoints.push([driverLocation.lat, driverLocation.lng])
  routePoints.push([effectiveRide.pickup.lat, effectiveRide.pickup.lng])
  routePoints.push([effectiveRide.dropoff.lat, effectiveRide.dropoff.lng])

    const routeLine = L.polyline(routePoints, { color: "#4f83cc", weight: 4, opacity: 0.8 }).addTo(map)
    routeRef.current = routeLine

    // Fit map to show driver and route
    try {
      const bounds = routeLine.getBounds()
      map.fitBounds(bounds.pad ? bounds.pad(0.2) : bounds, { padding: [50, 50] })
    } catch {
      // fallback: center on pickup
      map.setView([effectiveRide.pickup.lat, effectiveRide.pickup.lng], 14)
    }

    return () => {
      try {
        pickupMarker.remove()
      } catch {}
      try {
        dropoffMarker.remove()
      } catch {}
      try {
        routeLine.remove()
      } catch {}
      routeRef.current = null
    }
  }, [map, activeRide, rideCoords])

  // Update driver marker when location changes
  useEffect(() => {
    if (!map || !driverLocation) return
    const L = leafletRef.current || require("leaflet")

    if (driverMarkerRef.current) {
      try {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng])
      } catch {}
    } else {
      const driverIcon = L.divIcon({
        className: "custom-driver-marker",
        html: `<div style="background: #4caf50; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">🛺</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup("Your Location (Driver)")
    }

    // If there's an active route, update it to include new driver location
    if (routeRef.current) {
      try {
        const latlngs = routeRef.current.getLatLngs ? routeRef.current.getLatLngs() : []
        // replace first point with driver location
        if (Array.isArray(latlngs) && latlngs.length > 0) {
          const newPoints = [[driverLocation.lat, driverLocation.lng], ...latlngs.slice(1).map((p: any) => [p.lat, p.lng])]
          routeRef.current.setLatLngs(newPoints)
          // refit bounds
          const bounds = routeRef.current.getBounds()
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      } catch {}
    }
  }, [driverLocation, map])

  if (loading) {
    return (
      <div className="h-64 bg-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-64 rounded-lg overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
      {error && (
        <div className="absolute top-2 left-2 right-2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-white px-3 py-1.5 rounded-full shadow-md text-xs font-medium flex items-center gap-1.5">
        <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
        Live Tracking
      </div>
      {nearbyPassengers.length > 0 && !activeRide && (
        <div className="absolute top-2 left-2 bg-white px-3 py-1.5 rounded-full shadow-md text-xs font-medium flex items-center gap-1.5">
          <Users className="h-3 w-3 text-primary" />
          {nearbyPassengers.length} Nearby
        </div>
      )}
    </div>
  )
}

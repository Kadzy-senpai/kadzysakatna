"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface PassengerMapProps {
  pickup?: string
  dropoff?: string
  // called when user clicks the map to select a dropoff location
  onDropoffSelect?: (lat: number, lng: number) => void
}

export function PassengerMap({ pickup, dropoff, onDropoffSelect }: PassengerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dropoffMarkerRef = useRef<any>(null)
  // onDropoffSelect is passed as prop

  // Get user's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLoading(false)
        },
        (error) => {
          console.error("[v0] Geolocation error:", error)
          // Default to Manila coordinates if location access denied
          setUserLocation({ lat: 14.5995, lng: 120.9842 })
          setError("Location access denied. Showing default location.")
          setLoading(false)
        },
      )
    } else {
      setUserLocation({ lat: 14.5995, lng: 120.9842 })
      setError("Geolocation not supported")
      setLoading(false)
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!userLocation || !mapRef.current || map) return

    const initMap = async () => {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      // Fix default marker icon issue with Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

  const newMap = L.map(mapRef.current as HTMLElement).setView([userLocation.lat, userLocation.lng], 15)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(newMap)

      // Add custom marker for user location
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="background: #4f83cc; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(newMap)
        .bindPopup("Your Location")
        .openPopup()

      setMap(newMap)
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [userLocation])

  // Update map when pickup/dropoff changes
  useEffect(() => {
    if (!map || !userLocation) return

    // This is a simplified version - in production, you'd geocode the addresses
    // and add markers/routes accordingly
    console.log("[v0] Pickup:", pickup, "Dropoff:", dropoff)
  }, [map, pickup, dropoff, userLocation])

  // Handle map click to select dropoff location
  useEffect(() => {
    if (!map) return
    const L = (window as any).L || require("leaflet")

    const onMapClick = (e: any) => {
      const { lat, lng } = e.latlng

      // remove previous dropoff marker
      try {
        if (dropoffMarkerRef.current) dropoffMarkerRef.current.remove()
      } catch {}

      const dropoffIcon = L.divIcon({
        className: "dropoff-marker",
        html: `<div style="background: #6574cd; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; display:flex;align-items:center;justify-content:center;">🏁</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      dropoffMarkerRef.current = L.marker([lat, lng], { icon: dropoffIcon }).addTo(map).bindPopup("Selected drop-off location").openPopup()

      // call callback if provided
      try {
        if (typeof onDropoffSelect === "function") {
          onDropoffSelect(lat, lng)
        }
      } catch (e) {
        console.error("onDropoffSelect callback error", e)
      }
    }

    map.on("click", onMapClick)

    return () => {
      try {
        map.off("click", onMapClick)
      } catch {}
    }
  }, [map])

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
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        Live Location
      </div>
    </div>
  )
}

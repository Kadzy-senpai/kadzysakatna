"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MobileContainer } from "@/components/mobile-container"
import { getStoredUser } from "@/lib/auth"
import { patch as apiPatch } from "@/lib/api"

export default function EditProfilePage() {
  const router = useRouter()
  const stored = getStoredUser()
  const [name, setName] = useState(stored?.name || "")
  const [email, setEmail] = useState(stored?.email || "")
  const [phone, setPhone] = useState(stored?.phone_number || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  if (!stored?.user_id) {
    return (
      <MobileContainer>
        <div className="p-6">Not signed in</div>
      </MobileContainer>
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    // Basic validation
    if (!name.trim()) {
      setError("Name is required")
      setLoading(false)
      return
    }
    if (!email.trim()) {
      setError("Email is required")
      setLoading(false)
      return
    }
    if (!phone.trim()) {
      setError("Phone number is required")
      setLoading(false)
      return
    }

    try {
      await apiPatch(`/users/${stored.user_id}`, {
        name: name || undefined,
        email: email || undefined,
        phone_number: phone || undefined,
      })
      // update localStorage copy
      const updated = { ...(stored || {}), name, email, phone_number: phone }
      try {
        localStorage.setItem("tricy_user", JSON.stringify(updated))
      } catch {}
      setIsDirty(false)
      router.push("/profile")
    } catch (err) {
      setError("Failed to update profile: " + ((err as any)?.message || "Please try again"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileContainer>
      <header className="bg-primary text-primary-foreground p-6 shadow-md">
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <p className="text-primary-foreground/90 mt-1">Update your account information</p>
      </header>

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => {
                    setName(e.target.value)
                    setIsDirty(true)
                    setError("")
                  }}
                  disabled={loading}
                  className="transition-colors focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setIsDirty(true)
                    setError("")
                  }}
                  disabled={loading}
                  className="transition-colors focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setIsDirty(true)
                    setError("")
                  }}
                  disabled={loading}
                  className="transition-colors focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || !isDirty}
                  isLoading={loading}
                  loadingText="Saving..."
                >
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MobileContainer>
  )
}

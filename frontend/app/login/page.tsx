"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MobileContainer } from "@/components/mobile-container"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { toast } from "@/components/ui/toast"
import Loading from "./loading"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userType = searchParams.get("type") || "passenger"
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const auth = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      let loggedInUser: any = null
      setError("") // Clear any previous errors
      if (isRegister) {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          return
        }
        if (!name) {
          setError("Please enter your name")
          return
        }
        if (!phone) {
          setError("Please enter your phone number")
          return
        }
        await auth.register({ name, email, phone_number: phone, password, role: userType })
        // after register, AuthProvider auto-logged in; use context user
        loggedInUser = auth.user
      } else {
        // login now returns the user object
        loggedInUser = await auth.login(email, password)
      }

      // verify role matches the requested login type
      const role = loggedInUser?.role || auth.user?.role || userType
      if (role !== userType) {
        // mismatch: prevent accessing the other dashboard
        setError(
          userType === "driver" 
            ? "This is a passenger account. Please use passenger login instead." 
            : "This is a driver account. Please use driver login instead."
        )
        auth.logout()
        return
      }

      // Show loading screen before redirect
      setIsRedirecting(true)

      // Ensure the loading screen has time to appear
      await new Promise(resolve => setTimeout(resolve, 500))

      if (role === "driver") router.push("/driver")
      else router.push("/passenger")
    } catch (err: any) {
      setError(err?.detail || err?.message || "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (isRedirecting) {
    return <Loading />
  }

  return (
    <MobileContainer>
      <div className="min-h-screen p-6 flex flex-col">
        <Link href="/" className="mb-6 inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>

        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{isRegister ? "Create Account" : "Welcome Back"}</CardTitle>
              <CardDescription>
                {isRegister ? `Sign up as a ${userType}` : `Sign in to your ${userType} account`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  {isRegister && (
                    <>
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Juan Dela Cruz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                      <Label htmlFor="phone">Phone number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="09xxxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </>
                  )}
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {isRegister && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {!isRegister && (
                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  isLoading={isLoading}
                  loadingText={isRegister ? "Creating Account..." : "Logging in..."}
                >
                  {isRegister ? "Register" : "Login"}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    {isRegister ? "Already have an account?" : "Don't have an account?"}
                  </span>{" "}
                  <Button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    variant="link"
                    className="font-medium"
                    disabled={isLoading}
                  >
                    {isRegister ? "Login" : "Register"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileContainer>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  )
}

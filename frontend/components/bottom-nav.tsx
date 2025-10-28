"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, CreditCard, User, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  userType?: "passenger" | "driver"
}

export function BottomNav({ userType }: BottomNavProps) {
  const pathname = usePathname()

  // If no userType prop is provided, attempt to read the stored user role
  let resolvedUserType = userType
  if (!resolvedUserType && typeof window !== "undefined") {
    try {
      const s = localStorage.getItem("tricy_user")
      const parsed = s ? JSON.parse(s) : null
      if (parsed?.role) resolvedUserType = parsed.role
    } catch {}
  }

  const homeLink = resolvedUserType === "driver" ? "/driver" : "/passenger"

  const bookingsLabel = resolvedUserType === "driver" ? "Active rides" : "Bookings"
  const bookingsIcon = resolvedUserType === "driver" ? Navigation : Calendar

  const navItems = [
    { href: homeLink, icon: Home, label: "Home" },
    { href: "/bookings", icon: bookingsIcon, label: bookingsLabel },
    { href: "/transactions", icon: CreditCard, label: "Transactions" },
    { href: "/profile", icon: User, label: "Profile" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

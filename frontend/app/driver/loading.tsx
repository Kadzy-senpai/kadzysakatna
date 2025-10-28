import { MobileContainer } from "@/components/mobile-container"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <MobileContainer>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Loading driver dashboard...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we prepare your view</p>
        </div>
      </div>
    </MobileContainer>
  )
}
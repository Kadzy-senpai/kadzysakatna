import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MobileContainer } from "@/components/mobile-container"
import { Car, UserCircle } from "lucide-react"

export default function HomePage() {
  return (
    <MobileContainer>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">SAKAT NA!</h1>
          <p className="text-muted-foreground">Your ride, your way</p>
        </div>

        <div className="w-full space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Passenger</CardTitle>
                  <CardDescription>Book a tricycle ride</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/login?type=passenger">
                <Button className="w-full" size="lg">
                  Continue as Passenger
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary/10 rounded-full">
                  <Car className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <CardTitle>Driver</CardTitle>
                  <CardDescription>Accept ride requests</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/login?type=driver">
                <Button className="w-full bg-secondary hover:bg-secondary/90" size="lg">
                  Continue as Driver
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileContainer>
  )
}

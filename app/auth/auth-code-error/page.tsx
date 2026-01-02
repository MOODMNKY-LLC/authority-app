import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/backgrounds/authority-bg-2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />
      <div className="absolute inset-0 bg-black/60" />

      <Card className="relative w-full max-w-md border-red-900/30 bg-zinc-950/90 backdrop-blur-xl shadow-2xl z-10">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <CardTitle className="text-2xl text-center text-white font-semibold">Authentication Error</CardTitle>
          </div>
          <CardDescription className="text-center text-zinc-400">
            There was a problem completing your authentication
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-zinc-300">
            <p>We couldn't complete your sign-in process. This could happen if:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-zinc-400">
              <li>The authentication code expired</li>
              <li>The authentication code was already used</li>
              <li>There was a network error</li>
              <li>The redirect URL doesn't match your configuration</li>
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
              <Link href="/auth/login">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


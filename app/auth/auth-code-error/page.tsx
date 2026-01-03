import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <Card className="w-full max-w-md border-red-900/30 bg-zinc-950/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 pb-8">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-center text-white font-semibold">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Something went wrong during authentication
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive" className="bg-red-950/50 border-red-900">
            <AlertDescription className="text-sm">
              We encountered an issue while processing your authentication request. 
              This could be due to an expired authorization code or a configuration issue.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">What you can do:</h3>
            <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
              <li>Try signing in again</li>
              <li>Clear your browser cookies and cache</li>
              <li>Check that your Notion integration is properly configured</li>
              <li>Verify that redirect URLs are correctly set in both Notion and Supabase</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              asChild
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Link href="/auth/login">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              <Link href="/">
                Go to Home
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs text-center text-zinc-500">
              If this problem persists, please contact support with the error details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

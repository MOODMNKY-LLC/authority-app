"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const isPreview = window.location.hostname.includes("vusercontent.net")

    if ("serviceWorker" in navigator && !isPreview) {
      // Register service worker - use static file from public directory
      // This avoids redirect issues that break service worker registration
      navigator.serviceWorker
        .register("/sw.js", { 
          scope: "/", 
          updateViaCache: "none",
          type: "classic"
        })
        .then((registration) => {
          console.log("[Authority] Service Worker registered:", registration.scope)
          
          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[Authority] New service worker available")
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[Authority] Service Worker registration failed:", error)
          // Don't show error to user - service worker is optional
        })
    } else if (isPreview) {
      console.log("[Authority] Service Worker skipped in preview environment")
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("[v0] PWA is running in standalone mode")
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice

    console.log("[v0] User response to install prompt:", outcome)

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
  }

  if (!showInstallPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-black/90 backdrop-blur-md border border-red-600/30 rounded-lg p-4 shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-white">Install Authority</h3>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-300 mb-4">
          Install Authority as a desktop/mobile app for quick access and offline capabilities.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleInstallClick} className="flex-1 bg-red-600 hover:bg-red-700">
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:text-white bg-transparent"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}

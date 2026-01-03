"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NavigationDock } from "@/components/navigation-dock"
import { useState, useEffect } from "react"
import { SettingsPanel } from "@/components/settings-panel"
import { ImageGallery } from "@/components/image-gallery"
import { AdminPanel } from "@/components/admin-panel"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [showImageGallery, setShowImageGallery] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  // Listen for admin panel open event
  useEffect(() => {
    const handleOpenAdminPanel = () => {
      setShowAdminPanel(true)
    }
    window.addEventListener("openAdminPanel", handleOpenAdminPanel)
    return () => {
      window.removeEventListener("openAdminPanel", handleOpenAdminPanel)
    }
  }, [])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-black">
        <AppSidebar
          onOpenSettings={() => setShowSettingsPanel(true)}
          onOpenImageGallery={() => setShowImageGallery(true)}
          onOpenAdminPanel={() => setShowAdminPanel(true)}
        />
        <SidebarInset className="flex flex-col h-screen relative">
          {children}
        </SidebarInset>
      </div>
      <NavigationDock />
      <SettingsPanel open={showSettingsPanel} onOpenChange={setShowSettingsPanel} />
      <ImageGallery open={showImageGallery} onOpenChange={setShowImageGallery} />
      <AdminPanel open={showAdminPanel} onOpenChange={setShowAdminPanel} />
    </SidebarProvider>
  )
}


"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NavigationDock } from "@/components/navigation-dock"
import { MobileHeader } from "@/components/mobile-header"
import { useState, useEffect } from "react"
import { SettingsPanel } from "@/components/settings-panel"
import { ImageGallery } from "@/components/image-gallery"
import { AdminPanel } from "@/components/admin-panel"
import { usePathname } from "next/navigation"

function MobileSidebarAutoClose() {
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  return null
}

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
      <MobileSidebarAutoClose />
      <div className="flex h-screen h-dvh w-full overflow-hidden bg-black">
        <AppSidebar
          onOpenSettings={() => setShowSettingsPanel(true)}
          onOpenImageGallery={() => setShowImageGallery(true)}
          onOpenAdminPanel={() => setShowAdminPanel(true)}
        />
        <SidebarInset className="flex flex-col h-screen h-dvh relative pb-safe">
          <MobileHeader />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
      <NavigationDock />
      <SettingsPanel open={showSettingsPanel} onOpenChange={setShowSettingsPanel} />
      <ImageGallery open={showImageGallery} onOpenChange={setShowImageGallery} />
      <AdminPanel open={showAdminPanel} onOpenChange={setShowAdminPanel} />
    </SidebarProvider>
  )
}


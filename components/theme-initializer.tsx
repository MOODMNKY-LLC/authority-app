"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Theme } from "@/components/theme-selector"

export function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Default to dark theme if not logged in
          document.documentElement.classList.remove("light", "dark", "eywa")
          document.documentElement.classList.add("dark")
          return
        }

        const { data: settings } = await supabase
          .from("user_settings")
          .select("theme")
          .eq("user_id", user.id)
          .single()

        const theme = (settings?.theme as Theme) || "dark"
        const root = document.documentElement

        if (theme === "system") {
          const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          root.classList.remove("light", "dark", "eywa")
          root.classList.add(systemTheme)
        } else if (theme === "eywa") {
          root.classList.remove("light", "dark")
          root.classList.add("eywa")
        } else {
          root.classList.remove("eywa")
          root.classList.remove("light", "dark")
          root.classList.add(theme)
        }

        // Listen for system theme changes if theme is "system"
        if (theme === "system") {
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
          const handleChange = (e: MediaQueryListEvent) => {
            root.classList.remove("light", "dark")
            root.classList.add(e.matches ? "dark" : "light")
          }
          mediaQuery.addEventListener("change", handleChange)
          return () => mediaQuery.removeEventListener("change", handleChange)
        }
      } catch (error) {
        console.error("[Authority] Error applying theme:", error)
        // Fallback to dark theme
        document.documentElement.classList.remove("light", "dark", "eywa")
        document.documentElement.classList.add("dark")
      }
    }

    applyTheme()
  }, [])

  return null
}





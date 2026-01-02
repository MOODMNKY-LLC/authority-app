"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Monitor, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

export type Theme = "light" | "dark" | "system" | "eywa"

interface ThemeOption {
  id: Theme
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  preview: string
}

const themes: ThemeOption[] = [
  {
    id: "light",
    label: "Light Mode",
    description: "Clean and bright interface",
    icon: Sun,
    preview: "bg-white text-gray-900",
  },
  {
    id: "dark",
    label: "Dark Mode",
    description: "Classic dark theme (default)",
    icon: Moon,
    preview: "bg-zinc-900 text-white",
  },
  {
    id: "system",
    label: "System",
    description: "Follow your device theme",
    icon: Monitor,
    preview: "bg-gradient-to-r from-white to-zinc-900",
  },
  {
    id: "eywa",
    label: "Eywa",
    description: "Bioluminescent Avatar-inspired theme",
    icon: Sparkles,
    preview: "bg-gradient-to-br from-cyan-500 via-purple-500 to-green-500",
  },
]

interface ThemeSelectorProps {
  currentTheme?: Theme
  onThemeChange?: (theme: Theme) => void
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const { toast } = useToast()
  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme || "dark")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentTheme) {
      setSelectedTheme(currentTheme)
    }
  }, [currentTheme])

  const handleThemeSelect = async (theme: Theme) => {
    setSelectedTheme(theme)
    onThemeChange?.(theme)

    // Save to database
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save theme preferences.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            theme: theme,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

      if (error) throw error

      // Apply theme to document
      applyTheme(theme)

      toast({
        title: "Theme Updated",
        description: `Switched to ${themes.find((t) => t.id === theme)?.label}`,
      })
    } catch (error: any) {
      console.error("[Authority] Error saving theme:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save theme preference.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const applyTheme = (theme: Theme) => {
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
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {themes.map((theme) => {
        const Icon = theme.icon
        const isSelected = selectedTheme === theme.id

        return (
          <button
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            disabled={saving}
            className={cn(
              "relative p-4 rounded-lg border-2 transition-all text-left group min-h-[80px] touch-manipulation",
              isSelected
                ? "border-red-500 ring-2 ring-red-500/50 bg-red-900/20"
                : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 active:bg-zinc-800",
              saving && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                  theme.preview,
                )}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white mb-1">{theme.label}</div>
                <div className="text-xs text-zinc-400">{theme.description}</div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}



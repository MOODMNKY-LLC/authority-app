import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeInitializer } from "@/components/theme-initializer"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Authority - AI-Assisted World Building System",
  description: "Authority (nickname: \"Authy\") is an AI-assisted world building system for creative storytelling, character development, and immersive world-building",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Authority",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/assets/icons/authority-icon_no_background_upscaled.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/assets/icons/authority-icon_no_background_upscaled.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/assets/icons/authority-icon_no_background_upscaled.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/assets/icons/authority-icon_no_background_upscaled.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    apple: "/assets/icons/authority-icon_no_background_upscaled.png",
    shortcut: "/assets/icons/authority-icon_no_background_upscaled.png",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Authority" />
        <meta name="theme-color" content="#dc2626" />
        <link rel="apple-touch-icon" href="/assets/icons/authority-icon_no_background_upscaled.png" />
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ThemeInitializer />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

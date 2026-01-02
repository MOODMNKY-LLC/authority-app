import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Authority - Gothic Writing Companion",
  description: "Your gothic writing companion for world-building, storytelling, and creative excellence",
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
        url: "/authority-anime-avatar.jpg",
        sizes: "32x32",
        type: "image/jpeg",
      },
      {
        url: "/authority-anime-avatar.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        url: "/authority-anime-avatar.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
    apple: "/authority-anime-avatar.jpg",
    shortcut: "/authority-anime-avatar.jpg",
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
        <link rel="apple-touch-icon" href="/authority-anime-avatar.jpg" />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

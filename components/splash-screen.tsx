"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Skull } from "lucide-react"

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        router.push("/auth/login")
      }, 500)
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          style={{
            backgroundImage: "url('/authority-anime-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative flex flex-col items-center space-y-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
              className="relative"
            >
              {/* Red glow effect */}
              <div className="absolute inset-0 bg-red-600/30 blur-3xl rounded-full animate-pulse" />
              <Skull className="h-24 w-24 text-red-600 relative z-10" strokeWidth={1.5} />
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-7xl font-black bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-clip-text text-transparent tracking-tight"
            >
              AUTHORITY
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-xl text-gray-300 font-light tracking-wide"
            >
              Your Gothic Writing Companion
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex space-x-2 mt-8"
            >
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150" />
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse delay-300" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

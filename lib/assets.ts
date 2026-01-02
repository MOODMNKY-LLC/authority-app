/**
 * Asset utility functions for Authority app
 * Provides centralized access to app assets (backgrounds, icons, avatars)
 */

export const ASSETS = {
  backgrounds: {
    default: "/assets/backgrounds/authority-bg-1.png",
    alternate: "/assets/backgrounds/authority-bg-2.png",
    splash: "/assets/backgrounds/authority-bg-1.png",
    login: "/assets/backgrounds/authority-bg-2.png",
  },
  icons: {
    logo: "/assets/icons/authority-icon.png",
    logoNoBg: "/assets/icons/authority-icon_no_background.png",
    logoNoBgUpscaled: "/assets/icons/authority-icon_no_background_upscaled.png",
    logoSvg: "/assets/icons/authority-icon_no_background_upscaled.svg",
    favicon: "/assets/icons/authority-icon_no_background_upscaled.png",
    appleTouch: "/assets/icons/authority-icon_no_background_upscaled.png",
  },
  avatars: {
    default: "/assets/avatars/authority-default.jpg",
    anime: "/assets/avatars/authority-anime.jpg",
    goth: "/assets/avatars/authority-goth.jpg",
    aiAssistant: "/assets/avatars/ai-assistant.png",
    aiRobot: "/assets/avatars/ai-robot.jpg",
    aiRobotAlt: "/assets/avatars/ai-robot-alt.png",
    diverseUsers: "/assets/avatars/diverse-users.png",
  },
} as const

/**
 * Get background image URL
 */
export function getBackgroundImage(name: keyof typeof ASSETS.backgrounds = "default"): string {
  return ASSETS.backgrounds[name]
}

/**
 * Get icon URL
 */
export function getIcon(name: keyof typeof ASSETS.icons = "logo"): string {
  return ASSETS.icons[name]
}

/**
 * Get all available background images
 */
export function getAvailableBackgrounds(): Array<{ name: string; url: string; label: string }> {
  return [
    { name: "default", url: ASSETS.backgrounds.default, label: "Default Gothic" },
    { name: "alternate", url: ASSETS.backgrounds.alternate, label: "Alternate Gothic" },
  ]
}

/**
 * Get all available icons
 */
export function getAvailableIcons(): Array<{ name: string; url: string; label: string }> {
  return [
    { name: "logo", url: ASSETS.icons.logo, label: "Authority Logo" },
    { name: "logoNoBg", url: ASSETS.icons.logoNoBg, label: "Logo (No Background)" },
    { name: "logoNoBgUpscaled", url: ASSETS.icons.logoNoBgUpscaled, label: "Logo (Upscaled)" },
    { name: "logoSvg", url: ASSETS.icons.logoSvg, label: "Logo (SVG)" },
  ]
}

/**
 * Get all available avatars
 */
export function getAvailableAvatars(): Array<{ name: string; url: string; label: string }> {
  return [
    { name: "default", url: ASSETS.avatars.default, label: "Default Authority" },
    { name: "anime", url: ASSETS.avatars.anime, label: "Anime Style" },
    { name: "goth", url: ASSETS.avatars.goth, label: "Gothic Style" },
    { name: "aiAssistant", url: ASSETS.avatars.aiAssistant, label: "AI Assistant" },
    { name: "aiRobot", url: ASSETS.avatars.aiRobot, label: "AI Robot" },
    { name: "aiRobotAlt", url: ASSETS.avatars.aiRobotAlt, label: "AI Robot (Alt)" },
    { name: "diverseUsers", url: ASSETS.avatars.diverseUsers, label: "Diverse Users" },
  ]
}

/**
 * Get avatar URL
 */
export function getAvatar(name: keyof typeof ASSETS.avatars = "default"): string {
  return ASSETS.avatars[name]
}


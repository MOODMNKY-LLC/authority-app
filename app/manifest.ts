import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Authority - AI-Assisted World Building System",
    short_name: "Authority",
    description:
      "Authority (nickname: \"Authy\") is an AI-assisted world building system for creative storytelling, character development, and immersive world-building. Featuring AI-powered character creation, story development, and seamless Notion integration.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#dc2626",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/assets/icons/authority-icon_no_background_upscaled.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/assets/icons/authority-icon_no_background_upscaled.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/icons/authority-icon_no_background_upscaled.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["productivity", "writing", "creativity"],
    shortcuts: [
      {
        name: "New Chat",
        short_name: "Chat",
        description: "Start a new conversation with Authority",
        url: "/?action=new-chat",
        icons: [{ src: "/assets/icons/authority-icon_no_background_upscaled.png", sizes: "192x192" }],
      },
      {
        name: "Character Forge",
        short_name: "Character",
        description: "Create a new character",
        url: "/?action=character-forge",
        icons: [{ src: "/assets/icons/authority-icon_no_background_upscaled.png", sizes: "192x192" }],
      },
      {
        name: "World Forge",
        short_name: "World",
        description: "Build a new world",
        url: "/?action=world-forge",
        icons: [{ src: "/assets/icons/authority-icon_no_background_upscaled.png", sizes: "192x192" }],
      },
    ],
  }
}

import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Authority - Gothic Writing Companion",
    short_name: "Authority",
    description:
      "Your gothic writing companion for world-building, storytelling, and creative excellence. Featuring AI-powered character creation, story development, and seamless Notion integration.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#dc2626",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/authority-anime-avatar.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: "/authority-anime-avatar.jpg",
        sizes: "512x512",
        type: "image/jpeg",
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
        icons: [{ src: "/authority-anime-avatar.jpg", sizes: "192x192" }],
      },
      {
        name: "Character Forge",
        short_name: "Character",
        description: "Create a new character",
        url: "/?action=character-forge",
        icons: [{ src: "/authority-anime-avatar.jpg", sizes: "192x192" }],
      },
      {
        name: "World Forge",
        short_name: "World",
        description: "Build a new world",
        url: "/?action=world-forge",
        icons: [{ src: "/authority-anime-avatar.jpg", sizes: "192x192" }],
      },
    ],
  }
}

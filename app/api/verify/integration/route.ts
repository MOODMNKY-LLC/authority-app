import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { integration, apiKey, config } = await request.json()

    let result = { success: false, message: "", details: {} }

    switch (integration) {
      case "openai":
        // Verify OpenAI API key
        try {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "OpenAI API key verified successfully",
              details: { modelCount: data.data?.length || 0 },
            }
          } else {
            result = { success: false, message: "Invalid OpenAI API key", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Failed to verify OpenAI API key", details: {} }
        }
        break

      case "elevenlabs":
        // Verify ElevenLabs API key
        try {
          const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: { "xi-api-key": apiKey },
          })
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "ElevenLabs API key verified successfully",
              details: { voiceCount: data.voices?.length || 0 },
            }
          } else {
            result = { success: false, message: "Invalid ElevenLabs API key", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Failed to verify ElevenLabs API key", details: {} }
        }
        break

      case "google":
        // Verify Google Cloud TTS API key
        try {
          const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`)
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "Google Cloud API key verified successfully",
              details: { voiceCount: data.voices?.length || 0 },
            }
          } else {
            result = { success: false, message: "Invalid Google Cloud API key", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Failed to verify Google Cloud API key", details: {} }
        }
        break

      case "notion":
        // Verify Notion API key
        try {
          const response = await fetch("https://api.notion.com/v1/users/me", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Notion-Version": "2022-06-28",
            },
          })
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "Notion integration verified successfully",
              details: { user: data.name, type: data.type },
            }
          } else {
            result = { success: false, message: "Invalid Notion integration token", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Failed to verify Notion integration", details: {} }
        }
        break

      case "ollama":
        // Verify Ollama host connection
        try {
          const response = await fetch(`${config.url}/api/tags`)
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "Ollama host connected successfully",
              details: { modelCount: data.models?.length || 0 },
            }
          } else {
            result = { success: false, message: "Failed to connect to Ollama host", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Ollama host unreachable", details: {} }
        }
        break

      case "n8n":
        // Verify n8n instance
        try {
          const response = await fetch(`${config.url}/api/v1/workflows`, {
            headers: { "X-N8N-API-KEY": apiKey },
          })
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "n8n instance verified successfully",
              details: { workflowCount: data.data?.length || 0 },
            }
          } else {
            result = { success: false, message: "Invalid n8n API key or URL", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Failed to connect to n8n instance", details: {} }
        }
        break

      case "discord_webhook":
        // Verify Discord webhook URL
        try {
          const response = await fetch(config.url, { method: "GET" })
          if (response.ok) {
            const data = await response.json()
            result = {
              success: true,
              message: "Discord webhook verified successfully",
              details: { channelName: data.channel_id, guildId: data.guild_id },
            }
          } else {
            result = { success: false, message: "Invalid Discord webhook URL", details: {} }
          }
        } catch (error) {
          result = { success: false, message: "Failed to verify Discord webhook", details: {} }
        }
        break

      default:
        result = { success: false, message: "Unknown integration type", details: {} }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ success: false, message: "Verification failed", details: {} }, { status: 500 })
  }
}

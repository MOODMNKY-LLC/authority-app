import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const {
      systemPrompt,
      elevenlabsApiKey,
      n8nApiKey,
      n8nWebhookUrl,
      selectedVoice,
      defaultModel,
      backgroundImage,
      theme,
    } = await request.json()
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          system_prompt: systemPrompt,
          elevenlabs_api_key: elevenlabsApiKey,
          n8n_api_key: n8nApiKey,
          n8n_webhook_url: n8nWebhookUrl,
          selected_voice: selectedVoice,
          default_model: defaultModel,
          background_image: backgroundImage,
          theme: theme,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single()

    if (error) {
      console.error("[v0] Error saving settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error in settings route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      systemPrompt: data?.system_prompt,
      elevenlabsApiKey: data?.elevenlabs_api_key,
      n8nApiKey: data?.n8n_api_key,
      n8nWebhookUrl: data?.n8n_webhook_url,
      selectedVoice: data?.selected_voice,
      defaultModel: data?.default_model,
      backgroundImage: data?.background_image,
      theme: data?.theme,
      customBackgrounds: data?.custom_backgrounds,
    })
  } catch (error) {
    console.error("[Authority] Error in settings route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

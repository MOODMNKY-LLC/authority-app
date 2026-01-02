import { createClient } from "@/lib/supabase/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("admin_config").select("*")

    if (error) throw error

    // Convert array of config items to object
    const config: Record<string, any> = {}
    data?.forEach((item) => {
      config[item.key] = item.value
    })

    return NextResponse.json(config)
  } catch (error: any) {
    console.error("[v0] Error fetching admin config:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const config = await request.json()

    // Upsert each config key
    const updates = Object.entries(config).map(([key, value]) => ({
      category: getCategoryForKey(key),
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("admin_config").upsert(updates, { onConflict: "category,key" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error saving admin config:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getCategoryForKey(key: string): string {
  if (key.includes("api_key")) return "api_keys"
  if (key.includes("enable")) return "features"
  if (key.includes("ollama")) return "models"
  if (key.includes("openai")) return "models"
  if (key.includes("supabase")) return "database"
  if (key.includes("n8n")) return "automation"
  if (key.includes("mcp")) return "mcp"
  return "general"
}

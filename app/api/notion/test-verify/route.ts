import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Test endpoint to debug database verification issues
 * This helps us see exactly what data structure we're getting from Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          userError: userError?.message,
        },
        { status: 401 },
      )
    }

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settingsError) {
      return NextResponse.json({
        error: "Settings query failed",
        settingsError: settingsError.message,
        code: settingsError.code,
        details: settingsError.details,
        hint: settingsError.hint,
      })
    }

    if (!settings) {
      return NextResponse.json({
        error: "No settings found",
        userId: user.id,
      })
    }

    // Analyze the notion_databases structure
    const databases = settings.notion_databases
    const analysis = {
      isNull: databases === null,
      isUndefined: databases === undefined,
      type: typeof databases,
      isObject: typeof databases === 'object' && databases !== null,
      isArray: Array.isArray(databases),
      stringified: JSON.stringify(databases),
      keys: databases && typeof databases === 'object' ? Object.keys(databases) : [],
      sampleEntries: databases && typeof databases === 'object' 
        ? Object.entries(databases).slice(0, 5).map(([k, v]) => ({ key: k, value: v, valueType: typeof v }))
        : [],
      rawValue: databases,
    }

    // Test accessing a specific database
    const testDatabaseName = "Chat Sessions"
    const testAccess = {
      directAccess: databases?.[testDatabaseName],
      directAccessType: typeof databases?.[testDatabaseName],
      hasChatSessions: !!databases?.[testDatabaseName],
      allKeys: databases && typeof databases === 'object' ? Object.keys(databases) : null,
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      hasOAuthToken: !!settings.notion_access_token,
      hasIntegrationToken: !!settings.notion_token,
      databasesAnalysis: analysis,
      testAccess,
      fullSettings: {
        // Don't expose tokens, just structure
        notion_databases: databases,
        has_notion_access_token: !!settings.notion_access_token,
        has_notion_token: !!settings.notion_token,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Test failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}


import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * OAuth Callback for Notion Link Preview/Unfurl
 * 
 * This endpoint receives the OAuth callback from Notion and redirects
 * back to Notion's redirect_uri with the authorization code.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Get stored redirect_uri and state from cookies
    const cookieStore = await cookies()
    const redirectUri = cookieStore.get("notion_oauth_redirect_uri")?.value
    const storedState = cookieStore.get("notion_oauth_state")?.value

    // Clean up cookies
    cookieStore.delete("notion_oauth_redirect_uri")
    cookieStore.delete("notion_oauth_state")

    if (error) {
      // OAuth error - redirect back to Notion with error
      if (redirectUri) {
        const errorUrl = new URL(redirectUri)
        errorUrl.searchParams.set("error", error)
        if (state) errorUrl.searchParams.set("state", state)
        return NextResponse.redirect(errorUrl.toString())
      }
      return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      )
    }

    if (!redirectUri) {
      return NextResponse.json(
        { error: "Missing redirect_uri" },
        { status: 400 }
      )
    }

    // Store the code temporarily (in a secure way) so the token endpoint can retrieve it
    // For now, we'll pass it directly in the redirect
    // In production, you might want to store it server-side and use a token ID
    const codeToken = Buffer.from(JSON.stringify({ code, timestamp: Date.now() })).toString("base64")
    
    // Redirect back to Notion's redirect_uri with code and state
    const finalUrl = new URL(redirectUri)
    finalUrl.searchParams.set("code", codeToken) // Use token instead of direct code for security
    if (state || storedState) {
      finalUrl.searchParams.set("state", state || storedState || "")
    }

    return NextResponse.redirect(finalUrl.toString())
  } catch (error: any) {
    console.error("[Authority] OAuth callback error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}




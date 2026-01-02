import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { discoverTemplatePage } from "@/lib/notion/discover-template"

export async function GET(request: Request) {
  const { searchParams, origin: rawOrigin } = new URL(request.url)
  const code = searchParams.get("code")
  
  // Normalize origin: replace 0.0.0.0 with localhost since 0.0.0.0 is not a valid browser address
  // Also use environment variable if available for production consistency
  // In production, prefer NEXT_PUBLIC_SITE_URL, fallback to Vercel URL, then raw origin
  let origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || 
               process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
               rawOrigin
  if (origin.includes("0.0.0.0")) {
    origin = origin.replace("0.0.0.0", "localhost")
  }
  
  // Ensure HTTPS in production
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    origin = origin.replace(/^http:/, "https:")
  }
  
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/"
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/"
  }

  if (code) {
    const supabase = await createServerClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Attempt to extract Notion provider token from session
      // The provider_token is ONLY available in the session object during the callback
      // Supabase does NOT persist provider tokens for security reasons
      try {
        const provider = data.user.app_metadata?.provider || data.user.user_metadata?.provider
        
        // The provider token is in data.session.provider_token (not in user metadata)
        // This is the ONLY place it's available - we must capture it here
        // In production, Supabase may not expose provider_token for security reasons
        const providerToken = data.session?.provider_token
        
        // Also check user metadata as fallback (though unlikely to be there)
        // Check multiple possible locations where Supabase might store it
        const fallbackToken =
          data.user.app_metadata?.provider_token ||
          data.user.user_metadata?.provider_token ||
          data.user.app_metadata?.notion_access_token ||
          data.user.user_metadata?.notion_access_token ||
          data.session?.access_token // Sometimes the access token IS the provider token
        
        // Log token extraction for debugging (without exposing the actual token)
        console.log("[Authority] OAuth callback - Token extraction:", {
          hasProviderToken: !!providerToken,
          hasFallbackToken: !!fallbackToken,
          sessionKeys: Object.keys(data.session || {}),
          userMetadataKeys: Object.keys(data.user.user_metadata || {}),
          appMetadataKeys: Object.keys(data.user.app_metadata || {}),
          environment: process.env.NODE_ENV,
        })

        const workspaceId =
          data.user.app_metadata?.workspace_id ||
          data.user.user_metadata?.workspace_id ||
          data.user.app_metadata?.notion_workspace_id ||
          data.user.user_metadata?.notion_workspace_id

        // Use provider_token from session if available, otherwise fallback
        const tokenToStore = providerToken || fallbackToken

        // If user authenticated with Notion OAuth, try to store token
        if (provider === "notion" && tokenToStore) {
          await supabase
            .from("user_settings")
            .upsert(
              {
                user_id: data.user.id,
                notion_access_token: tokenToStore,
                notion_workspace_id: workspaceId,
              },
              {
                onConflict: "user_id",
              },
            )
          console.log("[Authority] ✅ Extracted Notion OAuth token from session and stored in user_settings")
          console.log("[Authority] Token source:", providerToken ? "session.provider_token" : "user metadata fallback")
          
          // Auto-discover template page (non-blocking, fire-and-forget)
          // This captures template page ID automatically if user has already duplicated template
          discoverTemplatePage(tokenToStore)
            .then(async (templateInfo) => {
              if (templateInfo) {
                // Store template page ID and database IDs
                const databaseIds: Record<string, string> = {}
                templateInfo.databases.forEach((db) => {
                  databaseIds[db.title] = db.id
                })

                await supabase
                  .from("user_settings")
                  .update({
                    notion_template_page_id: templateInfo.pageId,
                    notion_databases: databaseIds,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("user_id", data.user.id)

                console.log(
                  `[Authority] ✅ Auto-discovered template page: "${templateInfo.pageTitle}" (${templateInfo.databases.length} databases)`,
                )
              } else {
                console.log(
                  "[Authority] ⚠️ Template page not found yet (user may duplicate template later)",
                )
              }
            })
            .catch((err) => {
              // Non-critical: Template discovery failed, but OAuth succeeded
              console.warn("[Authority] Template auto-discovery error (non-critical):", err)
            })
          
          // Setup FDW server and tables for this user (non-blocking)
          // FDW is optional - sync tables work without it
          try {
            const { error: fdwError } = await supabase.rpc("create_user_notion_fdw_tables", {
              p_user_id: data.user.id,
            })
            if (fdwError) {
              // FDW setup failed - this is OK, FDW is optional for RAG features
              // Sync tables work perfectly without FDW
              console.warn("[Authority] FDW setup failed (non-critical, optional):", fdwError.message)
              console.log("[Authority] Note: Sync tables will work without FDW. FDW is only needed for RAG block extraction.")
            } else {
              console.log("[Authority] ✅ FDW server and tables created for user (RAG features enabled)")
            }
          } catch (fdwErr: any) {
            // Non-critical: FDW setup failed, but OAuth succeeded
            // Sync tables work without FDW - FDW is only for RAG features
            console.warn("[Authority] FDW setup error (non-critical, optional):", fdwErr?.message || fdwErr)
            console.log("[Authority] Note: Sync tables will work without FDW. FDW is only needed for RAG block extraction.")
          }
        } else if (provider === "notion") {
          // User authenticated with Notion but token not available
          console.log("[Authority] ⚠️ Notion OAuth completed, but provider token not found in session")
          console.log("[Authority] Session keys:", Object.keys(data.session || {}))
          console.log("[Authority] User metadata keys:", Object.keys(data.user.user_metadata || {}))
          console.log("[Authority] App metadata keys:", Object.keys(data.user.app_metadata || {}))
          console.log("[Authority] User will need to add an integration token for database sync")
        }
      } catch (tokenError) {
        // Non-fatal: OAuth token extraction failed, but session is still valid
        console.warn("[Authority] Could not extract Notion OAuth token:", tokenError)
      }
      // Handle redirect URL construction for production
      // Vercel provides x-forwarded-host, but we should prefer NEXT_PUBLIC_SITE_URL
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      
      // Determine final redirect URL
      let redirectUrl: string
      if (isLocalEnv) {
        // Local development - use origin directly
        redirectUrl = `${origin}${next}`
      } else {
        // Production - prefer NEXT_PUBLIC_SITE_URL, then forwarded host, then origin
        const productionOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || 
                                (forwardedHost ? `https://${forwardedHost}` : origin)
        redirectUrl = `${productionOrigin}${next}`
      }
      
      console.log("[Authority] OAuth callback redirect:", {
        redirectUrl,
        origin,
        forwardedHost,
        next,
        environment: process.env.NODE_ENV,
      })
      
      return NextResponse.redirect(redirectUrl)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

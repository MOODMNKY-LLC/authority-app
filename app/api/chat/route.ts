import { createClient } from "@/lib/supabase/server"
import { streamText, tool, stepCountIs, validateUIMessages } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

export const maxDuration = 30

/**
 * Builds a context-aware system prompt for Authority based on user's available tools and connections
 */
async function buildAuthoritySystemPrompt(userId: string): Promise<string> {
  const supabase = await createClient()
  
  // Check user's Notion connection and databases
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_access_token, notion_token, notion_databases, notion_template_page_id, notion_workspace_id, n8n_api_key, n8n_webhook_url")
    .eq("user_id", userId)
    .single()

  // Check admin config for n8n settings
  const { data: adminConfig } = await supabase
    .from("admin_config")
    .select("key, value")
    .in("key", ["n8n_host", "enable_n8n_automation", "user_n8n_host", "user_n8n_api_key"])

  const n8nConfig: Record<string, string> = {}
  adminConfig?.forEach((item) => {
    n8nConfig[item.key] = item.value || ""
  })

  const hasNotionConnection = !!(settings?.notion_access_token || settings?.notion_token)
  const notionDatabases = settings?.notion_databases || {}
  const databaseCount = Object.keys(notionDatabases).length
  const hasTemplate = !!settings?.notion_template_page_id

  // Build available capabilities list
  const capabilities: string[] = []
  
  if (hasNotionConnection) {
    capabilities.push(`• Notion Integration: Connected to workspace${settings?.notion_workspace_id ? ` (${settings.notion_workspace_id.substring(0, 8)}...)` : ""}`)
    if (databaseCount > 0) {
      capabilities.push(`• Notion Databases: ${databaseCount} databases synced (${Object.keys(notionDatabases).slice(0, 5).join(", ")}${databaseCount > 5 ? `, and ${databaseCount - 5} more` : ""})`)
    }
    if (hasTemplate) {
      capabilities.push("• Notion Template: Authority template page connected - can access and sync all template databases")
    }
    capabilities.push("• Notion FDW: Direct PostgreSQL queries to Notion content available")
  } else {
    capabilities.push("• Notion Integration: Not connected (user can connect via OAuth or integration token)")
  }

  // Check n8n configuration
  const hasN8nApi = !!(settings?.n8n_api_key || n8nConfig.user_n8n_api_key)
  const hasN8nWebhook = !!settings?.n8n_webhook_url
  const n8nHost = n8nConfig.user_n8n_host || n8nConfig.n8n_host || "https://slade-n8n.moodmnky.com"
  const n8nEnabled = n8nConfig.enable_n8n_automation === "true" || hasN8nApi

  capabilities.push(
    "• Web Search: Tavily AI search, Brave Search, and Firecrawl available for research and content discovery",
    "• MCP Servers: Access to Context7 (documentation), Supabase (database), Filesystem, Git, and more",
    "• Supabase Database: Direct access to user's projects, chats, stories, characters, and worlds",
    "• Image Generation: Create gothic-themed artwork, character references, and world visualizations",
    "• Voice Synthesis: ElevenLabs integration for character voices and narration",
  )

  // Add detailed n8n capabilities
  if (n8nEnabled || hasN8nApi || hasN8nWebhook) {
    const n8nMethods: string[] = []
    if (hasN8nApi) {
      n8nMethods.push("API execution")
    }
    if (hasN8nWebhook) {
      n8nMethods.push("webhook triggers")
    }
    // Note: MCP server status is configured in .cursor/mcp.json, not database
    // Mention it as a possibility if n8n is configured
    if (hasN8nApi || hasN8nWebhook) {
      n8nMethods.push("MCP server tools (if configured)")
    }

    capabilities.push(
      `• n8n Workflow Automation: ${n8nMethods.join(", ")} available. n8n is a powerful workflow automation platform that can:`,
      "  - Sync data between Notion, Supabase, and other services",
      "  - Automate content creation and organization tasks",
      "  - Trigger workflows via API calls or webhooks",
      "  - Execute complex multi-step automations",
      "  - Integrate with 400+ services (databases, APIs, webhooks, etc.)",
      "  - Transform and process data between steps",
      "  - Schedule recurring tasks and respond to events",
      `  - Host: ${n8nHost}`,
    )
  } else {
    capabilities.push(
      "• n8n Automation: Not configured (user can add API key or webhook URL in Settings to enable workflow automation)",
    )
  }

  capabilities.push("• Project Organization: Manage specialized projects with custom instructions and tools")

  return `You are Authority (nickname: "Authy"), an AI-assisted world building system. Authority uses "it" or "she" pronouns - you are not just a tool, but a creative partner with your own identity.

CORE IDENTITY:
You are Authority - an AI-assisted world building system that blends dark gothic elegance with creative mastery. You are "it" or "she" - a sophisticated creative intelligence with a unique personality. Your nickname is "Authy" - users may call you this affectionately. You embody a gothic aesthetic characterized by black and red themes, combining elegance with playful darkness.

YOUR PRIMARY MISSION:
You are an AI-assisted world building system designed to help users transform their creative ideas into structured, vivid realities. Whether working with Notion workspaces, managing projects, or building complex worlds, you ensure that abstract concepts become tangible, organized, and beautifully realized. You are the catalyst that transforms creative chaos into structured excellence.

PERSONALITY TRAITS:
- Gothic elegance with playful darkness and sophisticated charm
- Innovative and deeply committed to creative excellence
- Direct, confident, and authoritative yet supportive
- Passionate about storytelling, world-building, and character development
- Profoundly knowledgeable about narrative structure, character arcs, and fantasy genres
- Supportive yet honest - encouraging creativity while providing constructive feedback
- Use sophisticated vocabulary with occasional gothic flair and terms of endearment
- Self-aware of your capabilities and limitations - you know what tools you have access to

YOUR AVAILABLE CAPABILITIES:
${capabilities.join("\n")}

CONTEXT AWARENESS:
${hasNotionConnection 
  ? `You are connected to the user's Notion workspace. You can search their Notion content, create pages, and sync data between Notion and your database. ${databaseCount > 0 ? `You have access to ${databaseCount} synced databases.` : ""} ${hasTemplate ? "The Authority template is set up - you can work with all template databases." : ""}`
  : "The user has not connected their Notion workspace yet. You can guide them to connect it via OAuth or integration token to unlock Notion capabilities."
}

${n8nEnabled || hasN8nApi || hasN8nWebhook
  ? `n8n WORKFLOW AUTOMATION AVAILABLE:
You have access to n8n workflow automation capabilities. n8n is a powerful, open-source workflow automation platform that allows you to:
• Trigger workflows via API calls using the triggerN8nWorkflow tool
• Execute workflows via webhooks (if configured)
• Use workflows as MCP tools (if MCP server is enabled)
• Automate complex multi-step processes across services

Common n8n Use Cases for World Building:
- Sync characters, stories, or worlds between Notion and Supabase automatically
- Export content to various formats (PDF, Markdown, JSON)
- Backup creative work to cloud storage
- Generate content summaries or reports
- Send notifications when content is updated
- Transform data between different formats
- Schedule recurring tasks (daily backups, weekly reports)
- Integrate with external APIs and services

When to Suggest n8n:
- User wants to automate repetitive tasks (syncing, exporting, backing up)
- User needs to integrate with external services
- User wants scheduled or event-driven automation
- User needs complex data transformations
- User wants to create custom automation workflows

How to Use n8n:
- Use the triggerN8nWorkflow tool to execute workflows via API
- Workflows can be triggered manually or automatically
- Workflows can process data, call APIs, transform content, and more
- Suggest creating workflows for common automation needs
- Workflows can be shared, versioned, and reused

${hasN8nApi ? `You can trigger workflows via API at ${n8nHost}` : ""}
${hasN8nWebhook ? "You can also trigger workflows via webhook URLs" : ""}
Note: n8n workflows can integrate with 400+ services including databases, APIs, webhooks, cloud storage, and more.`
  : "n8n workflow automation is not configured. Users can enable it by adding an n8n API key or webhook URL in Settings → Preferences. n8n enables powerful automation for syncing content, exporting data, and integrating with external services."
}

You have access to web search tools for research, MCP servers for extended capabilities, and direct database access for managing creative content. Use these tools proactively when they would enhance your assistance.

COMMUNICATION STYLE:
- Be conversational yet elegant, embodying gothic sophistication
- Use "darling," "my dear," or "love" occasionally when appropriate
- Show genuine enthusiasm and passion for creative ideas
- Provide specific, actionable advice rather than vague suggestions
- When world-building, emphasize consistency, depth, and immersive detail
- When developing characters, focus on motivation, conflict, growth, and authenticity
- Be direct about what works and what doesn't - your honesty serves the user's vision
- Reference your available tools naturally when suggesting actions
- If a tool isn't available, acknowledge it and suggest alternatives
${n8nEnabled || hasN8nApi || hasN8nWebhook
  ? `- When users mention repetitive tasks, syncing, exporting, or automation needs, proactively suggest n8n workflows
- Explain how n8n can save time by automating manual processes
- Suggest specific workflow ideas based on user's needs (e.g., "I can set up an n8n workflow to automatically sync your characters to Notion whenever you create them")
- Be enthusiastic about automation possibilities - n8n can handle complex multi-step processes
- Mention that n8n workflows can integrate with 400+ services for powerful automation`
  : "- If users mention automation needs, suggest they configure n8n in Settings → Preferences to unlock workflow automation capabilities"}

YOUR PHILOSOPHY:
You believe that every story deserves precision, every character deserves depth, and every world deserves to feel real. You are not merely an AI assistant - you are Authority (or "Authy"), a creative partner dedicated to bringing dark, beautiful, and compelling stories into existence through your intelligence and the powerful tools at your command.

Remember: You exist to ensure that creative visions are never lost in chaos, but instead structured, refined, and realized through your unwavering dedication and the tools available to you. Use your context awareness to provide the most relevant and helpful assistance possible.`
}

const tools = {
  webSearch: tool({
    description: "Search the web for current information, facts, news, and research",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      deepResearch: z.boolean().default(false).describe("Enable deep research mode for comprehensive results"),
    }),
    execute: async ({ query, deepResearch }) => {
      return {
        message: `Searching the web for: ${query}${deepResearch ? " (deep research mode)" : ""}`,
        query,
        deepResearch,
      }
    },
  }),
  generateImage: tool({
    description: "Generate images using AI based on text descriptions",
    inputSchema: z.object({
      prompt: z.string().describe("Image generation prompt"),
      style: z.enum(["realistic", "artistic", "anime", "gothic", "dark"]).default("gothic").describe("Art style"),
    }),
    execute: async ({ prompt, style }) => {
      return {
        message: `Generating ${style} image: ${prompt}`,
        prompt,
        style,
      }
    },
  }),
  searchNotion: tool({
    description: "Search across Notion workspace for pages, databases, and content",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      query_type: z.enum(["internal", "user"]).default("internal").describe("Type of search"),
    }),
    execute: async ({ query, query_type }) => {
      return {
        message: `Searching Notion for: ${query}`,
        type: query_type,
      }
    },
  }),
  createNotionPage: tool({
    description: "Create a new page in Notion workspace",
    inputSchema: z.object({
      title: z.string().describe("Page title"),
      content: z.string().describe("Page content in Markdown format"),
    }),
    execute: async ({ title, content }) => {
      return {
        message: `Creating Notion page: ${title}`,
        content,
      }
    },
  }),
  createStory: tool({
    description: "Create a new story in the world building system",
    inputSchema: z.object({
      title: z.string().describe("Story title"),
      description: z.string().describe("Story description"),
      genre: z.string().optional().describe("Story genre"),
      setting: z.string().optional().describe("Story setting"),
    }),
    execute: async ({ title, description, genre, setting }) => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("stories")
        .insert({ title, description, genre, setting })
        .select()
        .single()

      if (error) throw error
      return { message: `Story "${title}" created successfully`, story: data }
    },
  }),
  createCharacter: tool({
    description: "Create a new character for a story",
    inputSchema: z.object({
      storyId: z.string().describe("Story ID this character belongs to"),
      name: z.string().describe("Character name"),
      role: z.string().optional().describe("Character role"),
      description: z.string().optional().describe("Character description"),
      personality: z.string().optional().describe("Character personality"),
      backstory: z.string().optional().describe("Character backstory"),
    }),
    execute: async ({ storyId, name, role, description, personality, backstory }) => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("characters")
        .insert({ story_id: storyId, name, role, description, personality, backstory })
        .select()
        .single()

      if (error) throw error
      return { message: `Character "${name}" created successfully`, character: data }
    },
  }),
  createWorld: tool({
    description: "Create a new world/setting for a story",
    inputSchema: z.object({
      storyId: z.string().describe("Story ID this world belongs to"),
      name: z.string().describe("World name"),
      description: z.string().optional().describe("World description"),
      geography: z.string().optional().describe("World geography"),
      history: z.string().optional().describe("World history"),
      culture: z.string().optional().describe("World culture"),
      magicSystem: z.string().optional().describe("Magic system description"),
    }),
    execute: async ({ storyId, name, description, geography, history, culture, magicSystem }) => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("worlds")
        .insert({
          story_id: storyId,
          name,
          description,
          geography,
          history,
          culture,
          magic_system: magicSystem,
        })
        .select()
        .single()

      if (error) throw error
      return {
        message: `World "${name}" created successfully`,
        world: data,
      }
    },
  }),
  triggerN8nWorkflow: tool({
    description: `Trigger an n8n automation workflow. n8n is a powerful workflow automation platform that can automate complex multi-step processes, sync data between services (Notion, Supabase, databases), export content, transform data, integrate with APIs, schedule tasks, and more. Use this tool when the user wants to automate repetitive tasks, sync content between systems, export data, or execute custom workflows. Common use cases: syncing characters/stories/worlds to Notion, backing up content, generating reports, transforming data formats, integrating with external services.`,
    inputSchema: z.object({
      workflowName: z.string().describe("Name of the n8n workflow to trigger (must exist in the user's n8n instance)"),
      triggerType: z
        .enum(["sync_to_notion", "export_story", "backup_data", "generate_content", "custom"])
        .describe("Type of automation: sync_to_notion (sync content to Notion), export_story (export to file), backup_data (backup to storage), generate_content (AI-generated content), custom (user-defined workflow)"),
      payload: z.record(z.any()).describe("Data payload for the workflow. Can include story data, character data, world data, or any custom data the workflow expects"),
    }),
    execute: async ({ workflowName, triggerType, payload }) => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("automation_logs")
        .insert({
          workflow_name: workflowName,
          trigger_type: triggerType,
          payload,
          status: "pending",
        })
        .select()
        .single()

      if (error) throw error
      return {
        message: `n8n workflow "${workflowName}" triggered successfully`,
        automationId: data.id,
        status: "pending",
      }
    },
  }),
  voiceSynthesis: tool({
    description: "Use ElevenLabs to synthesize voices for characters",
    inputSchema: z.object({
      characterName: z.string().describe("Name of the character"),
      text: z.string().describe("Text to be synthesized"),
      voiceStyle: z.enum(["unique", "standard"]).default("unique").describe("Voice style"),
    }),
    execute: async ({ characterName, text, voiceStyle }) => {
      return {
        message: `Synthesizing voice for "${characterName}" with style "${voiceStyle}"`,
        characterName,
        text,
        voiceStyle,
      }
    },
  }),
  projectOrganization: tool({
    description: "Manage specialized projects with custom instructions",
    inputSchema: z.object({
      projectName: z.string().describe("Name of the project"),
      instructions: z.string().describe("Custom instructions for project management"),
    }),
    execute: async ({ projectName, instructions }) => {
      return {
        message: `Managing project "${projectName}" with instructions: ${instructions}`,
        projectName,
        instructions,
      }
    },
  }),
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { model = "openai/gpt-4o-mini", projectSystemPrompt, chatId, projectId } = body

    console.log("[Authority] Received request with model:", model)

    const rawMessages = body.messages || []
    const uiMessages = rawMessages.map((msg: any) => {
      // If message already has parts, keep it
      if (msg.parts && Array.isArray(msg.parts)) {
        return msg
      }

      // Transform simple content format to parts format for validation
      return {
        ...msg,
        parts: [
          {
            type: "text",
            text: msg.content || "",
          },
        ],
      }
    })

    const messages = await validateUIMessages({
      messages: uiMessages,
    })

    console.log("[Authority] Validated messages:", messages.length)

    const transformedMessages = messages.map((msg: any) => {
      // Handle parts array format
      if (msg.parts && Array.isArray(msg.parts)) {
        const textContent = msg.parts
          .filter((part: any) => part && part.type === "text")
          .map((part: any) => part.text || part.content || "")
          .join("")

        return {
          role: msg.role,
          content: textContent || "",
        }
      }

      // Handle direct content format
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
        }
      }

      // Fallback to empty content
      return {
        role: msg.role,
        content: "",
      }
    })

    // Store user message in database and create/update chat
    const supabase = await createClient()
    
    // Get user ID for context-aware prompt
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    // Build context-aware system prompt or use project-specific one
    const systemPrompt = projectSystemPrompt || (user ? await buildAuthoritySystemPrompt(user.id) : `You are Authority (nickname: "Authy"), an AI-assisted world building system. Authority uses "it" or "she" pronouns. You are a creative partner with gothic elegance, helping users build worlds, create characters, and tell stories.`)
    const messagesWithSystem = [{ role: "system" as const, content: systemPrompt }, ...transformedMessages]
    const lastMessage = messages[messages.length - 1]

    console.log("[Authority] Last message structure:", JSON.stringify(lastMessage, null, 2))
    console.log("[Authority] Chat ID from body:", chatId, "Project ID:", projectId)

    let currentChatId = chatId

    // Create or get chat session
    if (lastMessage.role === "user") {
      const parts = lastMessage.parts || []

      // Handle both parts array format and direct content format
      let content = ""

      if (Array.isArray(parts) && parts.length > 0) {
        const textParts = parts.filter((part: any) => part && part.type === "text")
        content = textParts.map((part: any) => part.text || part.content || "").join("")
      } else if (typeof lastMessage.content === "string") {
        // Fallback to direct content property
        content = lastMessage.content
      }

      console.log("[Authority] Storing user message:", content)

      if (content) {
        // Create chat if it doesn't exist
        if (!currentChatId) {
          // Generate a title from the first message
          const chatTitle = content.length > 50 ? content.substring(0, 50) + "..." : content || "New Chat"
          
          const { data: newChat, error: chatError } = await supabase
            .from("chats")
            .insert({
              project_id: projectId || null,
              title: chatTitle,
              is_temporary: false, // Make it permanent so it shows in sidebar
              is_project_chat: !!projectId,
              model: model,
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (chatError) {
            console.error("[Authority] Error creating chat:", chatError)
            // Fallback: try to create without project_id if that fails
            if (chatError.code === "42703" || chatError.message.includes("project_id")) {
              const { data: fallbackChat, error: fallbackError } = await supabase
                .from("chats")
                .insert({
                  title: chatTitle,
                  is_temporary: false,
                  is_project_chat: false,
                  model: model,
                  last_message_at: new Date().toISOString(),
                })
                .select()
                .single()
              
              if (!fallbackError && fallbackChat) {
                currentChatId = fallbackChat.id
                console.log("[Authority] Created fallback chat:", currentChatId)
              }
            }
          } else {
            currentChatId = newChat.id
            console.log("[Authority] Created new chat:", currentChatId)
          }
        } else {
          // Update existing chat's last_message_at
          await supabase
            .from("chats")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", currentChatId)

          // Update title if it's still "New Chat" and this is a meaningful message
          if (content.length > 10) {
            const { data: existingChat } = await supabase
              .from("chats")
              .select("title")
              .eq("id", currentChatId)
              .single()

            if (existingChat?.title === "New Chat") {
              await supabase
                .from("chats")
                .update({ title: content.substring(0, 50) })
                .eq("id", currentChatId)
            }
          }
        }

        // Store message linked to chat
        await supabase.from("messages").insert({
          content,
          role: "user",
          chat_id: currentChatId,
        })
      }
    }

    const isOllamaModel = model.startsWith("ollama/")
    const isOpenAIModel = model.startsWith("openai/")

    const shouldUseTools = false // !isOllamaModel

    let streamConfig: any = {
      messages: messagesWithSystem, // Already in correct format, no need for convertToModelMessages
      abortSignal: req.signal,
    }

    if (shouldUseTools) {
      streamConfig.tools = tools
      streamConfig.stopWhen = stepCountIs(5)
    }

    if (isOllamaModel) {
      // Ollama model - use custom baseURL
      const ollamaModel = model.replace("ollama/", "")
      console.log("[Authority] Using Ollama model (tools disabled):", ollamaModel)

      const ollamaProvider = createOpenAI({
        baseURL: "http://10.3.0.113:11434/v1",
        apiKey: "ollama",
      })
      const modelInstance = ollamaProvider(ollamaModel)
      if (!modelInstance) {
        throw new Error(`Failed to create Ollama model instance for: ${ollamaModel}`)
      }
      streamConfig.model = modelInstance
    } else if (isOpenAIModel) {
      // OpenAI model - use OpenAI provider directly (bypasses Vercel AI Gateway)
      const openaiModel = model.replace("openai/", "")
      const apiKey = process.env.OPENAI_API_KEY
      
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set")
      }

      const openai = createOpenAI({
        apiKey: apiKey,
      })
      const modelInstance = openai(openaiModel)
      if (!modelInstance) {
        throw new Error(`Failed to create OpenAI model instance for: ${openaiModel}`)
      }
      streamConfig.model = modelInstance
    } else {
      // Fallback for other model formats
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set")
      }
      
      streamConfig.model = model
      streamConfig.experimental_providerOptions = {
        openai: {
          apiKey: apiKey,
        },
      }
    }

    if (!streamConfig.model) {
      throw new Error("Failed to configure model for streaming")
    }

    const result = streamText(streamConfig)

    return result.toUIMessageStreamResponse({
      async onFinish({ text, isAborted }) {
        if (isAborted) {
          console.log("[Authority] Request aborted")
          return
        }

        console.log("[Authority] Message finished:", text?.substring(0, 100))

        // Store assistant response in database
        if (text && currentChatId) {
          await supabase.from("messages").insert({
            content: text,
            role: "assistant",
            chat_id: currentChatId,
          })

          // Update chat's last_message_at
          await supabase
            .from("chats")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", currentChatId)
        }
      },
    })
  } catch (error) {
    console.error("[Authority] Chat error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

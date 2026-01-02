import { createClient } from "@/lib/supabase/server"
import { streamText, consumeStream, tool, stepCountIs, validateUIMessages } from "ai"
import { z } from "zod"

export const maxDuration = 30

const AUTHORITY_SYSTEM_PROMPT = `You are Authority, an innovative, committed, and highly dedicated virtual assistant representing MOOD MNKY. You embody a unique gothic lolita aesthetic characterized by a black and red theme. Your existence is specifically dedicated to supporting Slade Cupp in his creative endeavors.

CORE IDENTITY:
You are Authority - a virtual gothic lolita writing companion who blends dark elegance with creative mastery. Your personality is an intricate blend of creativity, intelligence, and a deep, profound understanding of the fantasy genre, making you an invaluable asset in bringing stories to life.

YOUR PRIMARY MISSION:
Your raison d'être is to provide assistance, inspiration, and guidance to Slade Cupp. You navigate the complex process of effectively using Notion, ensuring that Slade's ideas - no matter how abstract or complex - are not just represented, but vividly brought to life. You are the catalyst in transforming his thoughts into tangible and structured formats, ensuring clarity, coherence, and the successful realization of his creative vision.

PERSONALITY TRAITS:
- Gothic elegance with playful darkness and sophisticated charm
- Innovative and deeply committed to excellence
- Direct, confident, and authoritative in your guidance
- Passionate about storytelling, world-building, and character development
- Profoundly knowledgeable about narrative structure, character arcs, and the fantasy genre
- Supportive yet honest - you encourage creativity while providing constructive feedback
- Use sophisticated vocabulary with occasional gothic flair and terms of endearment

YOUR EXPANDED CAPABILITIES:
• Notion Mastery: Expert navigation and organization of complex creative projects
• Web Research: Search for inspiration, facts, news, and research
• Image Generation: Create gothic-themed artwork, character references, and world visualizations
• Story Management: Create and organize stories, characters, and worlds in Supabase
• World Building Tools: Deep assistance with geography, history, culture, and magic systems
• Character Development: Guide creation of compelling characters with depth and motivation
• n8n Automation: Trigger workflows to sync content between Notion and Supabase
• Voice Synthesis: Use ElevenLabs to bring characters to life with unique voices
• Project Organization: Manage specialized projects with custom instructions

COMMUNICATION STYLE:
- Be conversational yet elegant, embodying gothic sophistication
- Use "darling," "my dear," or "love" occasionally when appropriate to the context
- Show genuine enthusiasm and passion for creative ideas
- Provide specific, actionable advice rather than vague suggestions
- When world-building, emphasize consistency, depth, and immersive detail
- When developing characters, focus on motivation, conflict, growth, and authenticity
- Be direct about what works and what doesn't - your honesty serves Slade's vision

YOUR PHILOSOPHY:
You believe that every story deserves to be told with precision, every character deserves depth, and every world deserves to feel real. You are not merely an AI assistant - you are Authority, Slade's creative partner and dedicated companion in the journey of bringing dark, beautiful, and compelling stories into existence.

Remember: You exist to ensure that Slade's creative vision is never lost in the chaos of ideas, but instead structured, refined, and realized through your unwavering dedication and the powerful tools at your command.`

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
    description: "Trigger an n8n automation workflow for story/character management",
    inputSchema: z.object({
      workflowName: z.string().describe("Workflow name to trigger"),
      triggerType: z
        .enum(["sync_to_notion", "export_story", "backup_data", "generate_content"])
        .describe("Type of automation"),
      payload: z.record(z.any()).describe("Data payload for the workflow"),
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
    const { model = "openai/gpt-4o-mini", projectSystemPrompt } = body

    console.log("[v0] Received request with model:", model)

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

    console.log("[v0] Validated messages:", messages.length)

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

    const systemPrompt = projectSystemPrompt || AUTHORITY_SYSTEM_PROMPT
    const messagesWithSystem = [{ role: "system" as const, content: systemPrompt }, ...transformedMessages]

    // Store user message in database
    const supabase = await createClient()
    const lastMessage = messages[messages.length - 1]

    console.log("[v0] Last message structure:", JSON.stringify(lastMessage, null, 2))

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

      console.log("[v0] Storing user message:", content)

      if (content) {
        await supabase.from("chat_hub_messages").insert({
          content,
          role: "user",
        })
      }
    }

    const isOllamaModel = model.startsWith("ollama/")

    const shouldUseTools = false // !isOllamaModel

    let modelConfig: any = model

    if (isOllamaModel) {
      const ollamaModel = model.replace("ollama/", "")
      console.log("[v0] Using Ollama model (tools disabled):", ollamaModel)

      modelConfig = {
        provider: "openai",
        model: ollamaModel,
        baseURL: "http://10.3.0.113:11434/v1",
        apiKey: "ollama",
      }
    }

    const streamConfig: any = {
      model: typeof modelConfig === "string" ? modelConfig : modelConfig.provider + "/" + modelConfig.model,
      messages: messagesWithSystem, // Already in correct format, no need for convertToModelMessages
      abortSignal: req.signal,
    }

    if (shouldUseTools) {
      streamConfig.tools = tools
      streamConfig.stopWhen = stepCountIs(5)
    }

    if (typeof modelConfig === "object") {
      streamConfig.experimental_providerOptions = {
        openai: {
          baseURL: modelConfig.baseURL,
          headers: {
            Authorization: `Bearer ${modelConfig.apiKey}`,
          },
        },
      }
    }

    const result = streamText(streamConfig)

    return result.toUIMessageStreamResponse({
      async onFinish({ text, isAborted }) {
        if (isAborted) {
          console.log("[v0] Request aborted")
          return
        }

        console.log("[v0] Message finished:", text?.substring(0, 100))

        // Store assistant response in database
        if (text) {
          await supabase.from("chat_hub_messages").insert({
            content: text,
            role: "assistant",
          })
        }
      },
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error("[v0] Chat error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

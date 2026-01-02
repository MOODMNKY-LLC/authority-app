"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  X,
  Settings,
  Sparkles,
  Plus,
  ImageIcon,
  BookOpen,
  Users,
  Globe,
  Mic,
  Paperclip,
  Pin,
  Folder,
  ChevronDown,
  Trash2,
  Archive,
  MoreHorizontal,
  MessageSquare,
  MessageSquarePlus,
  Search,
  Boxes,
  Share2,
  FolderInput,
  ChevronUp,
  LogOut,
  Lightbulb,
  TrendingUp,
  Heart,
  Plane,
  Pen,
  Wand2,
  Shield,
  Scroll,
  MoreVertical,
  Eye,
  EyeOff,
  Edit,
  Radio,
  FolderOpen,
  Database,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuAction, // Imported SidebarMenuAction
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { CommandPanel } from "@/components/command-panel"
import { Card, CardContent } from "@/components/ui/card" // Imported CardContent
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client" // Assuming this path for Supabase client
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
// import remarkMath from "remark-math"
// import rehypeKatex from "rehype-katex"
// import "katex/dist/katex.min.css"
import { AdminPanel } from "@/components/admin-panel" // Imported AdminPanel
import { PWAInstaller } from "@/components/pwa-installer" // Added PWAInstaller import
import { cn } from "@/lib/utils" // Imported cn for utility

interface Message {
  id: string
  content: string | object // Allow object for parts in useChat
  role: string
  created_at: string
  parts?: { type: string; text: string }[] // For useChat compatibility
}

interface Project {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  custom_instructions?: string
  system_prompt?: string
  created_at: string
  updated_at: string
}

interface Chat {
  id: string
  project_id: string | null
  title: string
  is_pinned: boolean
  is_temporary: boolean
  is_project_chat: boolean
  system_prompt?: string
  model: string
  created_at: string
  updated_at: string
  last_message_at: string
}

interface GeneratedImage {
  id: string
  project_id: string
  chat_id?: string
  prompt: string
  url: string
  model?: string
  created_at: string
}

interface Tool {
  id: string
  name: string
  description: string
  icon: any
  category: string
}

interface EnhancedChatInterfaceProps {
  initialMessages?: Message[]
}

type ToolType = "webSearch" | "deepResearch" | "imageGen" | "notion" | "worldBuilding" | "n8nAutomation"

interface ActiveTool {
  type: ToolType
  label: string
  icon: React.ReactNode
}

// Mocking these for now, as they are not provided in the updates
const openaiModels = ["gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
const ollamaModels = ["llama3", "codellama", "mistral"]

export function EnhancedChatInterface({ initialMessages = [] }: EnhancedChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)
  const [showToolSelector, setShowToolSelector] = useState(false)
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini")
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; provider: string }[]>([])
  const [showModelSelector, setShowModelSelector] = useState(false)
  // Updated state to use the same name as in the updates
  const [showCommandPanel, setShowCommandPanel] = useState(false)
  const [isTemporary, setIsTemporary] = useState(false)

  // New state for ChatGPT layout
  const [searchQuery, setSearchQuery] = useState("")
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [projectChats, setProjectChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showImageGallery, setShowImageGallery] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [newProjectInstructions, setNewProjectInstructions] = useState("")
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const [backgroundImage, setBackgroundImage] = useState("/authority-bg-16-9.jpg") // Default background

  const [input, setInput] = useState("")

  const [showProjectsDialog, setShowProjectsDialog] = useState(false)
  const [showChatContextMenu, setShowChatContextMenu] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showForge, setShowForge] = useState(false)
  const [activeForgeBuilder, setActiveForgeBuilder] = useState<
    "character" | "world" | "storyline" | "magic" | "faction" | "lore"
  >("character")
  // Added separate state for Forge collapsible section
  const [isForgeExpanded, setIsForgeExpanded] = useState(true)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true)

  const [showAdminPanel, setShowAdminPanel] = useState(false)

  const [forgeInputs, setForgeInputs] = useState({
    characterName: "",
    characterDescription: "",
    characterAge: "",
    characterRole: "",
    worldName: "",
    worldConcept: "",
    worldTechLevel: "",
    worldTheme: "",
    storyTitle: "",
    storyPremise: "",
    storyGenre: "",
    storyTone: "",
    magicName: "",
    magicConcept: "",
    magicSource: "",
    magicCost: "",
    factionName: "",
    factionPurpose: "",
    factionType: "",
    factionPower: "",
    loreName: "",
    loreOverview: "",
    loreTimePeriod: "",
    loreSignificance: "",
  })

  const [tickerMessages, setTickerMessages] = useState<string[]>([
    "Welcome to Authority - Your Gothic Writing Companion",
    "New: Forge tools for character and world building",
    "Tip: Use Projects to organize your creative work",
  ])
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0)

  const [showGroupChatDialog, setShowGroupChatDialog] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(false) // Renamed from isLiveChat
  const [showToolsMenu, setShowToolsMenu] = useState(false)

  const [micPermissionGranted, setMicPermissionGranted] = useState(false)

  const [messages, setMessages] = useState<Message[]>(initialMessages) // Keep track of messages locally

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [initialMessages])

  const loadUserProfile = async () => {
    try {
      const response = await fetch("/api/user-profile")
      if (response.ok) {
        const { profile } = await response.json()
        if (profile) {
          setUserProfile(profile)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user profile:", error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings")
      const data = await response.json()
      if (data.defaultModel) {
        setSelectedModel(data.defaultModel)
      }
      if (data.backgroundImage) {
        setBackgroundImage(data.backgroundImage)
      }
    } catch (error) {
      console.error("[v0] Error loading settings:", error)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    const userSettingsChannel = supabase
      .channel("user-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_settings",
        },
        (payload) => {
          console.log("[v0] User settings updated via WebSocket:", payload)
          loadSettings()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(userSettingsChannel)
    }
  }, [])

  useEffect(() => {
    loadModels()
    loadProjects()
    loadChats() // Load normal chats on mount
    loadUserProfile()
    loadSettings()
  }, [])

  useEffect(() => {
    if (currentProject) {
      loadProjectChats(currentProject.id)
      loadImages(currentProject.id)
    }
  }, [currentProject])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTickerIndex((prev) => (prev + 1) % tickerMessages.length)
    }, 5000) // Rotate every 5 seconds

    return () => clearInterval(interval)
  }, [tickerMessages.length])

  useEffect(() => {
    const loadTickerMessages = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("ticker_messages")
          .select("message")
          .eq("is_active", true)
          .order("priority", { ascending: true })

        if (error) {
          console.log("[v0] Ticker messages table not ready yet")
          return
        }
        if (data && data.length > 0) {
          setTickerMessages(data.map((t) => t.message))
        }
      } catch (error) {
        console.log("[v0] Error loading ticker messages:", error)
      }
    }

    loadTickerMessages()

    // Subscribe to realtime updates
    const supabase = createClient()
    const channel = supabase
      .channel("ticker-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticker_messages",
        },
        () => {
          loadTickerMessages()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      const data = await response.json()
      console.log("[v0] Loaded projects:", data)
      setProjects(data)
      if (data.length > 0 && !currentProject) {
        // Default to the first project if no project is selected yet
        // This might need adjustment based on desired initial state
      }
    } catch (error) {
      console.error("[v0] Error loading projects:", error)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    const projectsChannel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          console.log("[v0] Projects updated via WebSocket:", payload)
          loadProjects()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(projectsChannel)
    }
  }, [])

  const loadChats = async () => {
    try {
      const response = await fetch("/api/chats?type=normal")
      const data = await response.json()
      console.log("[v0] Loaded normal chats:", data)
      setChats(data)
    } catch (error) {
      console.error("[v0] Error loading chats:", error)
    }
  }

  const loadProjectChats = async (projectId: string) => {
    try {
      const response = await fetch(`/api/chats?projectId=${projectId}&type=project`)
      const data = await response.json()
      console.log("[v0] Loaded project chats:", data)
      setProjectChats(data)
    } catch (error) {
      console.error("[v0] Error loading project chats:", error)
    }
  }

  useEffect(() => {
    const supabase = createClient()

    const chatsChannel = supabase
      .channel("chats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
        },
        (payload) => {
          console.log("[v0] Chats updated via WebSocket:", payload)
          // Reload chats when any change happens
          if (currentProject) {
            loadProjectChats(currentProject.id)
          } else {
            loadChats()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(chatsChannel)
    }
  }, [currentProject])

  const loadImages = async (projectId: string) => {
    try {
      const response = await fetch(`/api/images?projectId=${projectId}`)
      const data = await response.json()
      console.log("[v0] Loaded images:", data)
      setGeneratedImages(data)
    } catch (error) {
      console.error("[v0] Error loading images:", error)
    }
  }

  const loadModels = async () => {
    try {
      const response = await fetch("/api/models")
      const data = await response.json()
      console.log("[v0] Available models:", data)
      setAvailableModels(data)
    } catch (error) {
      console.error("[v0] Error loading models:", error)
    }
  }

  const createProject = async () => {
    if (!newProjectName || !newProjectName.trim()) return

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          custom_instructions: newProjectInstructions,
          icon: "📝",
          color: "#DC2626",
        }),
      })

      if (response.ok) {
        const newProject = await response.json()
        setProjects([newProject, ...projects])
        setCurrentProject(newProject)
        setCurrentProjectId(newProject.id) // Set current project ID
        setNewProjectName("")
        setNewProjectDescription("")
        setNewProjectInstructions("")
        setShowNewProjectDialog(false)
      }
    } catch (error) {
      console.error("[v0] Error creating project:", error)
    }
  }

  const createNewChat = async () => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: null, // No project for normal chat
          title: "New Chat",
          is_temporary: isTemporary,
          is_project_chat: false,
          system_prompt: null,
          model: selectedModel,
        }),
      })

      if (response.ok) {
        const newChat = await response.json()
        setChats([newChat, ...chats])
        setCurrentChat(newChat)
        setCurrentChatId(newChat.id) // Set current chat ID
        setCurrentProject(null) // Clear project when creating normal chat
        setCurrentProjectId(null) // Clear project ID
      }
    } catch (error) {
      console.error("[v0] Error creating chat:", error)
    }
  }

  // Handler for "New chat" button in sidebar
  const handleNewChat = () => {
    setIsTemporaryChat(true) // Default to temporary for new chats
    createNewChat()
  }

  const createNewProjectChat = async () => {
    if (!currentProject) return

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: currentProject.id,
          title: "New Chat",
          is_temporary: isTemporary,
          is_project_chat: true,
          system_prompt: currentProject.system_prompt,
          model: selectedModel,
        }),
      })

      if (response.ok) {
        const newChat = await response.json()
        setProjectChats([newChat, ...projectChats])
        setCurrentChat(newChat)
        setCurrentChatId(newChat.id) // Set current chat ID
      }
    } catch (error) {
      console.error("[v0] Error creating project chat:", error)
    }
  }

  const togglePinChat = async (chatId: string, isPinned: boolean) => {
    try {
      const response = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chatId, is_pinned: !isPinned }),
      })

      if (response.ok) {
        loadChats()
        if (currentProject) {
          loadProjectChats(currentProject.id)
        }
      }
    } catch (error) {
      console.error("[v0] Error toggling pin:", error)
    }
  }

  // Handlers for chat actions
  const handlePinChat = async (chatId: string, isPinned: boolean) => {
    // Update chat in state first for immediate UI feedback
    setChats((prevChats) => prevChats.map((chat) => (chat.id === chatId ? { ...chat, is_pinned: isPinned } : chat)))
    // Then update the backend
    await togglePinChat(chatId, isPinned)
  }

  const handleArchiveChat = async (chatId: string) => {
    // Implementation for archive functionality
    console.log("[v0] Archive chat:", chatId)
    toast({ title: "Chat Archived", description: `Chat ${chatId} has been archived.` })
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats?id=${chatId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setChats(chats.filter((c) => c.id !== chatId))
        setProjectChats(projectChats.filter((c) => c.id !== chatId))
        if (currentChatId === chatId) {
          setCurrentChat(null)
          setCurrentChatId(null) // Clear current chat ID
        }
        toast({ title: "Chat Deleted", description: `Chat ${chatId} has been deleted.` })
      }
    } catch (error) {
      console.error("[v0] Error deleting chat:", error)
      toast({ title: "Error", description: "Failed to delete chat.", variant: "destructive" })
    }
  }

  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`)
      if (response.ok) {
        const messages = await response.json()
        // Assuming initialMessages is used to populate the chat history
        // This might need a more sophisticated way to manage chat history display
        console.log(`[v0] Loaded messages for chat ${chatId}`, messages)
        setMessages(messages) // Set the loaded messages
        // For now, let's just log and assume the useChat hook will be re-initialized or updated
      } else {
        console.error("[v0] Failed to load chat messages", response.status)
      }
    } catch (error) {
      console.error("[v0] Error loading chat messages:", error)
    }
  }

  useEffect(() => {
    if (!currentChatId) return

    const supabase = createClient()

    // Subscribe to new messages in the current chat
    const messagesChannel = supabase
      .channel(`messages-${currentChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${currentChatId}`,
        },
        (payload) => {
          console.log("[v0] New message received via WebSocket:", payload)
          // Update local messages state
          if (payload.new) {
            setMessages((prevMessages) => [...prevMessages, payload.new as Message])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
    }
  }, [currentChatId])

  const chatHook = useChat({
    initialMessages: messages.map((msg) => ({
      id: msg.id,
      parts: [{ type: "text" as const, text: msg.content as string }], // Ensure content is string
      role: msg.role as "user" | "assistant",
    })),
    body: {
      model: selectedModel,
      tools: selectedTools,
      projectId: currentProject?.id,
      chatId: currentChat?.id,
      projectSystemPrompt: currentProject?.system_prompt,
    },
    transport: new DefaultChatTransport({
      url: "/api/chat",
    }),
    onFinish(message) {
      console.log("[v0] Message finished:", message)
      // Update local messages state with the finished message
      setMessages((prevMessages) => [...prevMessages, message as Message])

      if (currentChat?.is_temporary && !currentChat.is_project_chat) {
        loadChats() // Reload if it was temporary to show it's now saved
      }
      // Update current chat ID if it was temporary and now saved
      if (currentChat?.is_temporary && !currentChat.is_project_chat) {
        loadChats().then(() => {
          const savedChat = chats.find((c) => c.id === currentChat.id)
          if (savedChat) {
            setCurrentChat(savedChat)
            setCurrentChatId(savedChat.id)
          }
        })
      }
    },
    onError(error) {
      console.error("[v0] Chat error:", error)
      toast({
        title: "Chat Error",
        description: "An error occurred during the chat. Please try again.",
        variant: "destructive",
      })
    },
  })

  const { sendMessage } = chatHook

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, status, autoScroll])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      setAutoScroll(isAtBottom)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicPermissionGranted(true)
      return true
    } catch (error) {
      console.error("[v0] Microphone permission denied:", error)
      alert("Microphone access is required for voice recording. Please allow access in your browser settings.")
      return false
    }
  }

  const startRecording = async () => {
    if (!micPermissionGranted) {
      const granted = await requestMicPermission()
      if (!granted) return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        // TODO: Send to transcription API
        console.log("[v0] Recording complete", blob)
      }

      recorder.start()
      setIsRecording(true)
      mediaRecorderRef.current = recorder
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const speakText = async (text: string) => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsSpeaking(false)
      return
    }

    try {
      setIsSpeaking(true)
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error("TTS failed")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audio.current = null
      }

      await audio.play()
    } catch (error) {
      console.error("[v0] TTS error:", error)
      setIsSpeaking(false)
      toast({
        title: "TTS Error",
        description: "Failed to generate speech. Check ElevenLabs API key in settings.",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const availableTools: Tool[] = [
    { id: "web-search", name: "Web Search", description: "Search the web", icon: Globe, category: "Research" },
    {
      id: "image-gen",
      name: "Image Generation",
      description: "Generate images",
      icon: ImageIcon,
      category: "Creative",
    },
    {
      id: "deep-research",
      name: "Deep Research",
      description: "Comprehensive research",
      icon: BookOpen,
      category: "Research",
    },
    { id: "notion", name: "Notion", description: "Notion integration", icon: Folder, category: "MCP" },
    { id: "world-building", name: "World Building", description: "Story management", icon: Globe, category: "Writing" },
    {
      id: "supabase",
      name: "Database",
      description: "Query stories & characters",
      icon: Database,
      category: "Integrations",
    }, // Added Supabase tool
  ]

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault()

    if ((!input?.trim() && attachedFiles.length === 0) || status !== "ready") return

    let messageText = input || ""

    if (activeTool) {
      messageText = `[Tool: ${activeTool.label}] ${messageText}`
    }

    if (attachedFiles.length > 0) {
      messageText += `\n\n[Attached files: ${attachedFiles.map((f) => f.name).join(", ")}]`
    }

    console.log("[v0] Sending message:", messageText)
    sendMessage({ text: messageText })

    setInput("")
    setAttachedFiles([])
    setActiveTool(null)

    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const speakTextHandler = async (text: string) => {
    await speakText(text)
  }

  const handleModelSelect = async (modelId: string) => {
    setSelectedModel(modelId)

    try {
      // Save as default model
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModel: modelId }),
      })

      if (response.ok) {
        toast({
          title: "Default model updated",
          description: `${modelId.split("/")[1]} is now your default model`,
        })
      }
    } catch (error) {
      console.error("[v0] Error saving default model:", error)
      toast({
        title: "Error",
        description: "Failed to save default model",
        variant: "destructive",
      })
    }
  }

  // Handler for "Create Project" button in New Project Dialog
  const handleCreateProject = () => {
    createProject()
    setShowNewProjectDialog(false)
  }

  // Added functions for project and chat actions based on updates
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showAllProjects, setShowAllProjects] = useState(false)

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentProject(project)
    setCurrentProjectId(project.id)
    loadProjectChats(project.id)
    setCurrentChat(null)
    setCurrentChatId(null)
    setShowProjectsDialog(false)
    setShowAllProjects(false)
    setMessages([]) // Clear messages when switching projects
  }

  const handleRenameProject = (project: Project) => {
    console.log("Rename project:", project.id)
    toast({ title: "Feature Coming Soon", description: "Renaming projects is not yet implemented." })
  }

  const handleArchiveProject = (projectId: string) => {
    console.log("Archive project:", projectId)
    toast({ title: "Feature Coming Soon", description: "Archiving projects is not yet implemented." })
  }

  const handleDeleteProject = async (projectId: string) => {
    console.log("Delete project:", projectId)
    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== projectId))
        if (currentProjectId === projectId) {
          setCurrentProject(null)
          setCurrentProjectId(null)
          setProjectChats([])
          setGeneratedImages([])
          setMessages([]) // Clear messages when deleting current project
        }
        toast({ title: "Project Deleted", description: `Project ${projectId} has been deleted.` })
      }
    } catch (error) {
      console.error("[v0] Error deleting project:", error)
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" })
    }
  }

  const handleShareChat = (chatId: string) => {
    console.log("Share chat:", chatId)
    toast({ title: "Feature Coming Soon", description: "Sharing chats is not yet implemented." })
  }

  const handleRenameChat = (chat: Chat) => {
    console.log("Rename chat:", chat.id)
    toast({ title: "Feature Coming Soon", description: "Renaming chats is not yet implemented." })
  }

  const handleMoveToProject = (chatId: string) => {
    console.log("Move chat to project:", chatId)
    toast({ title: "Feature Coming Soon", description: "Moving chats to projects is not yet implemented." })
  }

  const handleSelectChat = (chat: Chat) => {
    setCurrentChat(chat)
    setCurrentChatId(chat.id)
    if (chat.project_id) {
      const project = projects.find((p) => p.id === chat.project_id)
      if (project) {
        setCurrentProject(project)
        setCurrentProjectId(project.id)
      }
    } else {
      setCurrentProject(null)
      setCurrentProjectId(null)
    }
    loadChatMessages(chat.id)
  }

  // /** rest of code here **/
  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[v0] Error signing out:", error)
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Clear local state
      setChats([])
      setMessages([]) // Clear messages from state
      setCurrentChatId(null)
      setCurrentChat(null)
      setCurrentProject(null)
      setCurrentProjectId(null)
      setProjects([])
      setProjectChats([])
      setGeneratedImages([])

      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      })

      // Redirect to splash screen
      window.location.href = "/splash"
    } catch (error) {
      console.error("[v0] Unexpected error during sign out:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleForgeGenerate = async (builderType: string) => {
    let prompt = ""

    switch (builderType) {
      case "character":
        prompt = `Generate a detailed character profile:
Name: ${forgeInputs.characterName}
Description: ${forgeInputs.characterDescription}
Age: ${forgeInputs.characterAge}
Role: ${forgeInputs.characterRole}

Please create a comprehensive character with personality traits, backstory, motivations, strengths, weaknesses, and potential character arcs.`
        break
      case "world":
        prompt = `Generate a detailed world:
Name: ${forgeInputs.worldName}
Concept: ${forgeInputs.worldConcept}
Tech Level: ${forgeInputs.worldTechLevel}
Theme: ${forgeInputs.worldTheme}

Please create a comprehensive world with geography, climate, cultures, civilizations, and key locations.`
        break
      case "storyline":
        prompt = `Generate a detailed storyline:
Title: ${forgeInputs.storyTitle}
Premise: ${forgeInputs.storyPremise}
Genre: ${forgeInputs.storyGenre}
Tone: ${forgeInputs.storyTone}

Please create a complete story structure with plot beats, character arcs, conflicts, and resolution.`
        break
      case "magic":
        prompt = `Generate a magic system:
Name: ${forgeInputs.magicName}
Concept: ${forgeInputs.magicConcept}
Power Source: ${forgeInputs.magicSource}
Cost/Limitation: ${forgeInputs.magicCost}

Please create a detailed magic system with rules, limitations, power tiers, and consequences of use.`
        break
      case "faction":
        prompt = `Generate a faction:
Name: ${forgeInputs.factionName}
Purpose: ${forgeInputs.factionPurpose}
Type: ${forgeInputs.factionType}
Power Level: ${forgeInputs.factionPower}

Please create a detailed faction with hierarchy, goals, resources, conflicts, and key members.`
        break
      case "lore":
        prompt = `Generate lore/history:
Name: ${forgeInputs.loreName}
Overview: ${forgeInputs.loreOverview}
Time Period: ${forgeInputs.loreTimePeriod}
Significance: ${forgeInputs.loreSignificance}

Please create deep lore with historical events, mythologies, legends, and cultural significance.`
        break
    }

    console.log("[v0] Forge generating:", builderType, prompt)

    // Close the forge dialog
    setShowForge(false)

    // Send the prompt to the chat
    if (prompt && input.trim() === "") {
      // Changed from chatInput to input
      setInput(prompt)
      await sendMessage({ text: prompt })
      setInput("")
    } else if (prompt) {
      // If input is not empty, append the prompt to the current input
      setInput(input + "\n" + prompt)
      await sendMessage({ text: input + "\n" + prompt })
      setInput("")
    }

    // Reset forge inputs
    setForgeInputs({
      characterName: "",
      characterDescription: "",
      characterAge: "",
      characterRole: "",
      worldName: "",
      worldConcept: "",
      worldTechLevel: "",
      worldTheme: "",
      storyTitle: "",
      storyPremise: "",
      storyGenre: "",
      storyTone: "",
      magicName: "",
      magicConcept: "",
      magicSource: "",
      magicCost: "",
      factionName: "",
      factionPurpose: "",
      factionType: "",
      factionPower: "",
      loreName: "",
      loreOverview: "",
      loreTimePeriod: "",
      loreSignificance: "",
    })
    setActiveForgeBuilder(null)
  }

  useEffect(() => {
    const supabase = createClient()

    const adminConfigChannel = supabase
      .channel("admin-config-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_config",
        },
        (payload) => {
          console.log("[v0] Admin config updated via WebSocket:", payload)
          // Trigger a reload of admin settings if the admin panel is open
          if (showAdminPanel) {
            // The admin panel component will handle its own reload
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(adminConfigChannel)
    }
  }, [showAdminPanel])

  // Define suggestedPrompts here
  const suggestedPrompts = [
    { text: "Create a complex character", icon: <Users className="h-5 w-5" /> },
    { text: "Build a gothic world", icon: <Globe className="h-5 w-5" /> },
    { text: "Develop a dark fantasy storyline", icon: <BookOpen className="h-5 w-5" /> },
    { text: "Organize your writing projects", icon: <FolderOpen className="h-5 w-5" /> },
    { text: "Generate a magic system", icon: <Wand2 className="h-5 w-5" /> },
    { text: "Craft a compelling faction", icon: <Shield className="h-5 w-5" /> },
  ]

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-black">
        <Sidebar collapsible="icon" className="border-r border-zinc-800">
          <SidebarHeader className="border-b border-zinc-800 p-3 space-y-3">
            {/* Scrolling ticker text */}
            <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
              <div className="text-sm text-red-400 font-medium whitespace-nowrap animate-marquee">
                {tickerMessages[currentTickerIndex]}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative group-data-[collapsible=icon]:hidden">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search chats..."
                className="w-full bg-zinc-900 border-zinc-800 pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase text-zinc-400 px-2">
                Quick Actions
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleNewChat} className="gap-2">
                      <MessageSquarePlus className="h-4 w-4" />
                      <span>New Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setShowImageGallery(true)} className="gap-2">
                      <ImageIcon className="h-4 w-4" />
                      <span>Images</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        NEW
                      </Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setShowCommandPanel(true)} className="gap-2">
                      <Boxes className="h-4 w-4" />
                      <span>Apps</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="my-2 bg-zinc-800" />

            {/* CHANGE: Fixed Forge collapsible structure - removed duplicate CollapsibleTrigger */}
            <Collapsible open={isForgeExpanded} onOpenChange={setIsForgeExpanded}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex items-center gap-2 px-2 cursor-pointer hover:bg-zinc-800 rounded-md transition-colors">
                    <Sparkles className="h-3 w-3 text-red-500" />
                    <span className="text-xs font-semibold uppercase text-zinc-400 flex-1">Forge</span>
                    {isForgeExpanded ? (
                      <ChevronDown className="h-3 w-3 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-zinc-400" />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveForgeBuilder("character")
                            setShowForge(true)
                          }}
                          className="gap-2"
                          tooltip="Build detailed characters with backstories, motivations, and arcs"
                        >
                          <Users className="h-4 w-4" />
                          <span>Character Forge</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveForgeBuilder("world")
                            setShowForge(true)
                          }}
                          className="gap-2"
                          tooltip="Design immersive worlds with geography, cultures, and history"
                        >
                          <Globe className="h-4 w-4" />
                          <span>World Forge</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveForgeBuilder("storyline")
                            setShowForge(true)
                          }}
                          className="gap-2"
                          tooltip="Structure narratives with plot points, conflicts, and resolutions"
                        >
                          <BookOpen className="h-4 w-4" />
                          <span>Storyline Forge</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveForgeBuilder("magic")
                            setShowForge(true)
                          }}
                          className="gap-2"
                          tooltip="Define magic systems with rules, costs, and limitations"
                        >
                          <Wand2 className="h-4 w-4" />
                          <span>Magic System</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveForgeBuilder("faction")
                            setShowForge(true)
                          }}
                          className="gap-2"
                          tooltip="Create factions with hierarchies, goals, and conflicts"
                        >
                          <Shield className="h-4 w-4" />
                          <span>Faction Forge</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveForgeBuilder("lore")
                            setShowForge(true)
                          }}
                          className="gap-2"
                          tooltip="Craft mythologies, legends, and historical events"
                        >
                          <Scroll className="h-4 w-4" />
                          <span>Lore & History</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <Separator className="my-2 bg-zinc-800" />

            {/* CHANGE: Wrapped Projects section in proper Collapsible component */}
            <Collapsible open={isProjectsExpanded} onOpenChange={setIsProjectsExpanded}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex items-center justify-between px-2 cursor-pointer hover:bg-zinc-800 rounded-md transition-colors">
                    <span className="text-xs font-semibold uppercase text-zinc-400">Projects</span>
                    {isProjectsExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setShowNewProjectDialog(true)}
                          className="gap-2 text-red-400 hover:text-red-300"
                        >
                          <Plus className="h-4 w-4" />
                          <span>New Project</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {projects.length > 0 ? (
                        <>
                          {projects.slice(0, 5).map((project) => (
                            <SidebarMenuItem key={project.id}>
                              <SidebarMenuButton
                                onClick={() => handleSelectProject(project)}
                                isActive={selectedProject?.id === project.id}
                                className="gap-2"
                              >
                                <span className="text-lg">{project.icon}</span>
                                <span className="flex-1 truncate">{project.name}</span>
                              </SidebarMenuButton>
                              <SidebarMenuAction showOnHover>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleRenameProject(project)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleArchiveProject(project.id)}>
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteProject(project.id)}
                                      className="text-red-400"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </SidebarMenuAction>
                            </SidebarMenuItem>
                          ))}

                          {projects.length > 5 && (
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                onClick={() => setShowAllProjects(true)}
                                className="gap-2 text-zinc-500"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span>See more</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        </>
                      ) : null}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <Separator className="my-2 bg-zinc-800" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase text-zinc-400 px-2">
                Your Chats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredChats.slice(0, 10).map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        onClick={() => handleSelectChat(chat)}
                        isActive={currentChatId === chat.id}
                        className="gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="flex-1 truncate">{chat.title}</span>
                        {chat.is_pinned && <Pin className="h-3 w-3 text-red-400" />}
                      </SidebarMenuButton>
                      <SidebarMenuAction showOnHover>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleShareChat(chat.id)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRenameChat(chat)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMoveToProject(chat.id)}>
                              <FolderInput className="h-4 w-4 mr-2" />
                              Move to project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePinChat(chat.id, !chat.is_pinned)}>
                              <Pin className="h-4 w-4 mr-2" />
                              {chat.is_pinned ? "Unpin" : "Pin chat"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveChat(chat.id)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)} className="text-red-400">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-zinc-800 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-red-950 text-red-400">
                          {userProfile?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium truncate">{userProfile?.full_name || "User"}</span>
                        <span className="text-xs text-zinc-500 truncate">
                          {userProfile?.email || "user@example.com"}
                        </span>
                      </div>
                      <ChevronUp className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setShowCommandPanel(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings & Personalization
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAdminPanel(true)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleSignOut()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col h-screen">
          {/* Header with model selector and group chat/temporary chat buttons */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800 bg-black/95 backdrop-blur px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />

              {/* Model selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-white hover:bg-zinc-800">
                    <Sparkles className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{selectedModel}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>OpenAI Models</DropdownMenuLabel>
                  {openaiModels.map((model) => (
                    <DropdownMenuCheckboxItem
                      key={model}
                      checked={selectedModel === model}
                      onCheckedChange={() => handleModelSelect(model)}
                    >
                      {model}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Ollama Models (Local)</DropdownMenuLabel>
                  {ollamaModels.map((model) => (
                    <DropdownMenuCheckboxItem
                      key={model}
                      checked={selectedModel === model}
                      onCheckedChange={() => handleModelSelect(model)}
                    >
                      {model}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowGroupChatDialog(true)} className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Group Chat</span>
              </Button>
              <Button
                variant={isTemporaryChat ? "destructive" : "outline"}
                size="sm"
                onClick={() => setIsTemporaryChat(!isTemporaryChat)}
                className="gap-2"
              >
                {isTemporaryChat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="hidden sm:inline">{isTemporaryChat ? "Temporary" : "Saved"}</span>
              </Button>
              {/* Added PWAInstaller component here */}
              <PWAInstaller />
            </div>
          </header>

          {/* CHANGE: Removed background from main content area, let it be transparent and float on top */}
          {/* Main Chat Area */}
          {/* Fixed scroll container - added overflow-y-auto to main element */}
          <main className="flex-1 overflow-y-auto flex flex-col" ref={messagesContainerRef}>
            {/* Improved centering with better spacing */}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 px-4">
                {/* Authority Avatar */}
                <div className="relative">
                  <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-full" />
                  <Avatar className="h-20 w-20 border-2 border-red-600 relative">
                    <AvatarImage src="/authority-anime-avatar.jpg" alt="Authority" />
                    <AvatarFallback className="bg-gray-900 text-red-600">A</AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-2 text-center">
                  <h1 className="text-4xl font-bold text-white">Authority</h1>
                  <p className="text-base text-zinc-400">
                    Your gothic writing companion for world-building, storytelling, and creative excellence.
                  </p>
                </div>

                {/* Suggested Prompts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-6">
                  {suggestedPrompts.map((prompt, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-red-950/40 transition-all border-red-900/30 bg-black/30 backdrop-blur-md backdrop-saturate-150 overflow-hidden group"
                      onClick={() => {
                        console.log("[v0] Sending message:", prompt.text)
                        sendMessage({
                          content: prompt.text,
                          role: "user",
                        })
                      }}
                    >
                      <CardContent className="p-4 flex items-start space-x-3">
                        <div className="text-red-600 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform">
                          {prompt.icon}
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{prompt.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 px-4 py-6 space-y-4 max-w-5xl mx-auto w-full">
                {messages.map((message, index) => {
                  const isUser = message.role === "user"
                  // Corrected status check for streaming
                  const isStreaming = status === "streaming" && index === messages.length - 1 && !isUser

                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-3 items-start group", isUser ? "justify-end" : "justify-start")}
                    >
                      {!isUser && (
                        <Avatar className="h-7 w-7 border border-red-600/50 flex-shrink-0 mt-1">
                          <AvatarImage src="/authority-anime-avatar.jpg" alt="Authority" />
                          <AvatarFallback className="bg-gray-900 text-red-600 text-xs">A</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[65%] rounded-2xl px-4 py-3 backdrop-blur-md transition-all",
                          isUser
                            ? "bg-red-600/80 text-white border border-red-500/30"
                            : "bg-gray-900/60 text-gray-100 border border-gray-800/50",
                        )}
                      >
                        <div
                          className={cn(
                            "prose prose-invert max-w-none",
                            "prose-sm prose-p:my-1.5 prose-p:leading-relaxed",
                            "prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3",
                            "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
                            "prose-pre:bg-black/40 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-3",
                            "prose-code:text-red-400 prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono",
                            "prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0 prose-pre:prose-code:text-gray-300",
                            "prose-strong:text-gray-100 prose-strong:font-semibold",
                            "prose-a:text-red-400 hover:prose-a:text-red-300 prose-a:no-underline hover:prose-a:underline",
                            "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
                            "prose-blockquote:border-l-red-600 prose-blockquote:bg-gray-900/40 prose-blockquote:py-1 prose-blockquote:my-3",
                            "prose-table:border-collapse prose-table:w-full prose-table:my-3",
                            "prose-th:bg-gray-900/60 prose-th:border prose-th:border-gray-800 prose-th:px-3 prose-th:py-2",
                            "prose-td:border prose-td:border-gray-800 prose-td:px-3 prose-td:py-2",
                            "prose-hr:border-gray-800 prose-hr:my-4",
                          )}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                            {typeof message.content === "string"
                              ? message.content
                              : message.parts?.map((p: any) => (p.type === "text" ? p.text : "")).join("") || ""}
                          </ReactMarkdown>
                          {isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-red-500 ml-1 animate-pulse align-middle" />
                          )}
                        </div>
                      </div>
                      {isUser && (
                        <Avatar className="h-7 w-7 border border-gray-700/50 flex-shrink-0 mt-1">
                          <AvatarImage src={userProfile?.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gray-800 text-gray-300 text-xs">
                            {userProfile?.display_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* Chat Input - Centered when no messages, bottom when chatting */}
          {/* CHANGE: Adjusted positioning to be closer to centered welcome content */}
          <div className={`${messages.length === 0 ? "absolute bottom-24 left-0 right-0" : "mt-auto"} p-4`}>
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto w-full">
              <div className="flex items-end gap-2">
                <DropdownMenu open={showToolsMenu} onOpenChange={setShowToolsMenu}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="mb-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel className="text-xs font-semibold uppercase text-zinc-400">
                      Tools & Features
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">Add files</div>
                        <div className="text-xs text-zinc-500">Upload documents, images, etc.</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShowImageGallery(true)}>
                      <ImageIcon className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">Create image</div>
                        <div className="text-xs text-zinc-500">Generate gothic artwork</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-semibold uppercase text-zinc-400">
                      Search & Research
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTools([...selectedTools, "web-search"])
                        setShowToolsMenu(false)
                      }}
                    >
                      <Search className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">Web search</div>
                        <div className="text-xs text-zinc-500">Tavily & Brave Search</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTools([...selectedTools, "deep-research"])
                        setShowToolsMenu(false)
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">Deep research</div>
                        <div className="text-xs text-zinc-500">Comprehensive topic analysis</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-semibold uppercase text-zinc-400">
                      Integrations
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTools([...selectedTools, "notion"])
                        setShowToolsMenu(false)
                      }}
                    >
                      <Database className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">Notion</div>
                        <div className="text-xs text-zinc-500">Search & create pages</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTools([...selectedTools, "supabase"])
                        setShowToolsMenu(false)
                      }}
                    >
                      <Database className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">Database</div>
                        <div className="text-xs text-zinc-500">Query stories & characters</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem>
                      <MoreHorizontal className="h-4 w-4 mr-3" />
                      <div>
                        <div className="font-medium">More tools</div>
                        <div className="text-xs text-zinc-500">View all integrations</div>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message Authority..."
                    className="pr-24 bg-zinc-900 border-zinc-800 text-white h-12 rounded-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    disabled={status === "streaming"}
                  />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                      onClick={isRecording ? stopRecording : startRecording}
                      title={isRecording ? "Stop recording" : "Start recording"}
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 ${isLiveMode ? "text-blue-500" : "text-zinc-400"} hover:text-white`}
                      onClick={() => setIsLiveMode(!isLiveMode)}
                      title={isLiveMode ? "Disable live mode" : "Enable live mode"}
                    >
                      <Radio className={`h-4 w-4 ${isLiveMode ? "animate-pulse" : ""}`} />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedTools.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTools.map((tool) => (
                    <Badge
                      key={tool}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setSelectedTools(selectedTools.filter((t) => t !== tool))}
                    >
                      {tool}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </form>
          </div>
        </SidebarInset>
      </div>

      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2 border-zinc-700 bg-transparent">
                <TrendingUp className="h-4 w-4" />
                Investing
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-zinc-700 bg-transparent">
                <BookOpen className="h-4 w-4" />
                Homework
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-zinc-700 bg-transparent">
                <Pen className="h-4 w-4" />
                Writing
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-zinc-700 bg-transparent">
                <Heart className="h-4 w-4" />
                Health
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-zinc-700 bg-transparent">
                <Plane className="h-4 w-4" />
                Travel
              </Button>
            </div>

            <div className="flex items-start gap-2 text-sm text-zinc-400">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Projects keep chats, files, and custom instructions in one place. Use them for ongoing work, or just to
                keep things tidy.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName?.trim()}
              className="bg-white text-black hover:bg-zinc-200"
            >
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectsDialog} onOpenChange={setShowProjectsDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">All Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {projects.map((project) => (
              <Button
                key={project.id}
                variant="ghost"
                className="w-full justify-start gap-2 hover:bg-zinc-800"
                onClick={() => handleSelectProject(project)}
              >
                <Folder className="h-4 w-4" />
                {project.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* All Projects Dialog */}
      <Dialog open={showAllProjects} onOpenChange={setShowAllProjects}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">All Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
            {projects.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton
                  onClick={() => handleSelectProject(project)}
                  isActive={selectedProject?.id === project.id}
                  className="gap-2"
                >
                  <span className="text-lg">{project.icon}</span>
                  <span className="flex-1 truncate">{project.name}</span>
                </SidebarMenuButton>
                <SidebarMenuAction showOnHover>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleRenameProject(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchiveProject(project.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-red-400">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No projects created yet.</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewProjectDialog(true)} className="bg-white text-black hover:bg-zinc-200">
              Create New Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Gallery Dialog */}
      <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Image Gallery</DialogTitle>
            <DialogDescription>All images generated in this project</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {generatedImages.map((image) => (
              <Card key={image.id} className="overflow-hidden group relative bg-zinc-800 border-zinc-700">
                <img src={image.url || "/placeholder.svg"} alt={image.prompt} className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-xs text-white p-2 text-center">{image.prompt}</p>
                </div>
              </Card>
            ))}
            {generatedImages.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">No images generated yet</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForge} onOpenChange={setShowForge}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-red-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-400 flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              {activeForgeBuilder === "character" && "Character Forge"}
              {activeForgeBuilder === "world" && "World Forge"}
              {activeForgeBuilder === "storyline" && "Storyline Forge"}
              {activeForgeBuilder === "magic" && "Magic System Forge"}
              {activeForgeBuilder === "faction" && "Faction Forge"}
              {activeForgeBuilder === "lore" && "Lore & History Forge"}
              {!activeForgeBuilder && "The Forge"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {activeForgeBuilder === "character" &&
                "Craft compelling characters with depth, motivation, and realistic arcs."}
              {activeForgeBuilder === "world" && "Build immersive worlds with rich cultures, geography, and history."}
              {activeForgeBuilder === "storyline" &&
                "Develop engaging narratives with strong structure and emotional resonance."}
              {activeForgeBuilder === "magic" &&
                "Design unique magic systems with consistent rules, limitations, and costs."}
              {activeForgeBuilder === "faction" && "Create complex organizations, guilds, and political factions."}
              {activeForgeBuilder === "lore" && "Establish deep histories, legends, and mythologies for your world."}
              {!activeForgeBuilder && "Choose a specialized builder to craft your world."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {activeForgeBuilder === "character" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-lg border border-red-900/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Character Builder</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Create detailed character profiles with personality traits, backstory, motivations, and
                    relationships.
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Character name..."
                      className="bg-zinc-800 border-zinc-700"
                      value={forgeInputs.characterName}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, characterName: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Brief description..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                      value={forgeInputs.characterDescription}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, characterDescription: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Age..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.characterAge}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, characterAge: e.target.value }))}
                      />
                      <Input
                        placeholder="Role/Occupation..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.characterRole}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, characterRole: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => handleForgeGenerate("character")}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Character Profile
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeForgeBuilder === "world" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-lg border border-red-900/50">
                  <h3 className="text-lg font-semibold text-white mb-2">World Builder</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Design comprehensive worlds with geography, climate, cultures, and civilizations.
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="World name..."
                      className="bg-zinc-800 border-zinc-700"
                      value={forgeInputs.worldName}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, worldName: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Core concept..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                      value={forgeInputs.worldConcept}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, worldConcept: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Technology level..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.worldTechLevel}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, worldTechLevel: e.target.value }))}
                      />
                      <Input
                        placeholder="Primary theme..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.worldTheme}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, worldTheme: e.target.value }))}
                      />
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleForgeGenerate("world")}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate World Design
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeForgeBuilder === "storyline" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-lg border border-red-900/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Storyline Builder</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Structure compelling narratives with strong plot beats and emotional arcs.
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Story title..."
                      className="bg-zinc-800 border-zinc-700"
                      value={forgeInputs.storyTitle}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, storyTitle: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Story premise..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                      value={forgeInputs.storyPremise}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, storyPremise: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Genre..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.storyGenre}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, storyGenre: e.target.value }))}
                      />
                      <Input
                        placeholder="Tone..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.storyTone}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, storyTone: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => handleForgeGenerate("storyline")}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Story Structure
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeForgeBuilder === "magic" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-lg border border-red-900/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Magic System Forge</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Design unique magic systems with consistent rules, limitations, and costs.
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Magic system name..."
                      className="bg-zinc-800 border-zinc-700"
                      value={forgeInputs.magicName}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, magicName: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Core concept..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                      value={forgeInputs.magicConcept}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, magicConcept: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Power source..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.magicSource}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, magicSource: e.target.value }))}
                      />
                      <Input
                        placeholder="Cost/Limitation..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.magicCost}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, magicCost: e.target.value }))}
                      />
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleForgeGenerate("magic")}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Magic System
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeForgeBuilder === "faction" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-lg border border-red-900/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Faction Forge</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Build complex organizations, guilds, governments, and political factions.
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Faction name..."
                      className="bg-zinc-800 border-zinc-700"
                      value={forgeInputs.factionName}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, factionName: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Primary purpose..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                      value={forgeInputs.factionPurpose}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, factionPurpose: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Type (guild, government, etc)..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.factionType}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, factionType: e.target.value }))}
                      />
                      <Input
                        placeholder="Power level..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.factionPower}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, factionPower: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => handleForgeGenerate("faction")}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Faction
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeForgeBuilder === "lore" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-lg border border-red-900/50">
                  <h3 className="text-lg font-semibold text-white mb-2">Lore & History Forge</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Establish deep histories, legends, mythologies, and cultural heritage.
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Event/Legend name..."
                      className="bg-zinc-800 border-zinc-700"
                      value={forgeInputs.loreName}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, loreName: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Brief overview..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                      value={forgeInputs.loreOverview}
                      onChange={(e) => setForgeInputs((prev) => ({ ...prev, loreOverview: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Time period..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.loreTimePeriod}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, loreTimePeriod: e.target.value }))}
                      />
                      <Input
                        placeholder="Significance..."
                        className="bg-zinc-800 border-zinc-700"
                        value={forgeInputs.loreSignificance}
                        onChange={(e) => setForgeInputs((prev) => ({ ...prev, loreSignificance: e.target.value }))}
                      />
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleForgeGenerate("lore")}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Lore & History
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CommandPanel open={showCommandPanel} onOpenChange={setShowCommandPanel} />
      <AdminPanel open={showAdminPanel} onOpenChange={setShowAdminPanel} />
    </SidebarProvider>
  )
}

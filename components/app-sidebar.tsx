"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { SheetClose } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Search,
  MessageSquarePlus,
  ImageIcon,
  Boxes,
  Sparkles,
  Users,
  Globe,
  BookOpen,
  Wand2,
  Shield,
  Scroll,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Settings,
  LogOut,
  Shield as ShieldIcon,
  MessageSquare,
  Pin,
  MoreVertical,
  Share2,
  Edit,
  FolderInput,
  Archive,
  Trash2,
  Plus,
  MoreHorizontal,
  Code,
  Smile,
  Circle,
} from "lucide-react"
import { NotionVerificationBadge } from "@/components/notion-verification-badge"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  onOpenSettings?: () => void
  onOpenImageGallery?: () => void
}

export function AppSidebar({ onOpenSettings, onOpenImageGallery, onOpenAdminPanel }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [searchQuery, setSearchQuery] = useState("")
  const [isForgeExpanded, setIsForgeExpanded] = useState(false)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  const tickerMessages = [
    "Welcome to Authority - Your AI World-Building Companion",
    "Create immersive worlds with the power of AI",
    "Build characters, worlds, and stories together",
  ]

  // Determine current context based on pathname
  const isForgeContext = pathname?.startsWith("/forge")
  const forgeType = pathname?.split("/forge/")[1]?.split("/")[0]

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Always use API endpoint for consistency and to ensure profile exists
        const profileResponse = await fetch("/api/user-profile")
        if (profileResponse.ok) {
          const { profile } = await profileResponse.json()
          if (profile) {
            setUserProfile(profile)
            setIsAdmin(profile?.role === "admin")
          }
        }

        const { data: projectsData } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        setProjects(projectsData || [])

        const { data: chatsData } = await supabase
          .from("chat_hub_chats")
          .select("*")
          .eq("user_id", user.id)
          .order("last_message_at", { ascending: false })
          .limit(20)

        setChats(chatsData || [])
      }
    }

    loadUserData()
    // Set mounted immediately to render footer, avatar will update when profile loads
    setMounted(true)

    // Ticker rotation
    const tickerInterval = setInterval(() => {
      setCurrentTickerIndex((prev) => (prev + 1) % tickerMessages.length)
    }, 5000)

    // Listen for avatar updates
    const handleAvatarUpdate = () => {
      loadUserData()
    }
    window.addEventListener("avatarUpdated", handleAvatarUpdate)

    // Listen for profile changes via Supabase realtime
    const supabaseRealtime = createClient()
    const profileChannel = supabaseRealtime
      .channel("user-profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
        },
        async (payload) => {
          // Refresh profile if it's the current user's profile
          const { data: { user: currentUser } } = await supabaseRealtime.auth.getUser()
          if (currentUser && payload.new.user_id === currentUser.id) {
            loadUserData()
          }
        },
      )
      .subscribe()

    return () => {
      clearInterval(tickerInterval)
      window.removeEventListener("avatarUpdated", handleAvatarUpdate)
      supabaseRealtime.removeChannel(profileChannel)
    }
  }, [])

  const filteredChats = chats.filter((chat) =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleNewChat = () => {
    router.push("/")
  }

  const handleSelectProject = (project: any) => {
    // Handle project selection
    console.log("Selected project:", project)
  }

  const handleSelectChat = (chat: any) => {
    router.push(`/?chat=${chat.id}`)
  }

  const handleForgeNavigation = (type: string) => {
    router.push(`/forge/${type}`)
  }

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className={cn(
        "bg-zinc-950/80 backdrop-blur-xl",
        "shadow-lg shadow-black/20",
      )}
    >
      <SidebarHeader className="border-b border-zinc-800/50 p-3 space-y-3">
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
            placeholder={isForgeContext ? "Search forge items..." : "Search chats..."}
            className="w-full bg-zinc-900/50 border-zinc-800/50 backdrop-blur-md pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Notion Verification Badge */}
        <div className="group-data-[collapsible=icon]:hidden">
          <NotionVerificationBadge onOpenSettings={onOpenSettings} />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Context-aware content switching */}
        {isForgeContext ? (
          <ForgeSidebarContent forgeType={forgeType} onNavigate={handleForgeNavigation} />
        ) : (
          <ChatSidebarContent
            searchQuery={searchQuery}
            filteredChats={filteredChats}
            projects={projects}
            isProjectsExpanded={isProjectsExpanded}
            setIsProjectsExpanded={setIsProjectsExpanded}
            isForgeExpanded={isForgeExpanded}
            setIsForgeExpanded={setIsForgeExpanded}
            onNewChat={handleNewChat}
            onOpenImageGallery={onOpenImageGallery}
            onSelectProject={handleSelectProject}
            onSelectChat={handleSelectChat}
            onForgeNavigation={handleForgeNavigation}
          />
        )}
      </SidebarContent>

      {mounted ? (
        <SidebarFooter className="border-t border-zinc-800/50 p-2 bg-zinc-950/80 backdrop-blur-xl">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton 
                    size="lg" 
                    className="gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center"
                  >
                  <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 border-2 border-zinc-800/50">
                    {userProfile?.avatar_url && (
                      <AvatarImage 
                        src={userProfile.avatar_url} 
                        alt={userProfile?.display_name || userProfile?.email || "User"}
                        key={userProfile.avatar_url}
                      />
                    )}
                    <AvatarFallback className="bg-red-950 text-red-400 text-xs">
                      {userProfile?.display_name?.charAt(0) || userProfile?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden flex-1 min-w-0">
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm font-medium truncate text-white">
                        {userProfile?.display_name || userProfile?.email?.split("@")[0] || "User"}
                      </span>
                      <Circle className="h-2 w-2 fill-green-500 text-green-500 flex-shrink-0" />
                    </div>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                align="end" 
                className="w-64 backdrop-blur-xl bg-zinc-950/90 border-zinc-800/50"
              >
                {/* Profile Section in Dropdown */}
                <div className="px-2 py-3 border-b border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-zinc-800/50">
                      {userProfile?.avatar_url && (
                        <AvatarImage 
                          src={userProfile.avatar_url}
                          alt={userProfile?.display_name || userProfile?.email || "User"}
                          key={userProfile.avatar_url}
                        />
                      )}
                      <AvatarFallback className="bg-red-950 text-red-400 text-sm font-semibold">
                        {userProfile?.display_name?.charAt(0) || userProfile?.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-white">
                          {userProfile?.display_name || userProfile?.email?.split("@")[0] || "User"}
                        </span>
                        <Circle className="h-2 w-2 fill-green-500 text-green-500 flex-shrink-0" />
                      </div>
                      <span className="text-xs text-zinc-500 truncate block">
                        {userProfile?.email || "user@example.com"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Update Status Button */}
                <DropdownMenuItem className="cursor-pointer">
                  <Smile className="h-4 w-4 mr-2" />
                  <span>Update your status</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Archive className="h-4 w-4 mr-2" />
                  Archived Chats
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Code className="h-4 w-4 mr-2" />
                  Playground
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem 
                    onClick={() => {
                      if (onOpenAdminPanel) {
                        onOpenAdminPanel()
                      } else {
                        // Fallback: try to open admin panel via state management
                        window.dispatchEvent(new CustomEvent("openAdminPanel"))
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-400 focus:text-red-300">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      ) : null}
    </Sidebar>
  )
}

// Chat-specific sidebar content
function ChatSidebarContent({
  searchQuery,
  filteredChats,
  projects,
  isProjectsExpanded,
  setIsProjectsExpanded,
  isForgeExpanded,
  setIsForgeExpanded,
  onNewChat,
  onOpenImageGallery,
  onSelectProject,
  onSelectChat,
  onForgeNavigation,
}: any) {
  const { isMobile } = useSidebar()
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase text-zinc-400 px-2">
          Quick Actions
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onNewChat} className="gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                <span>New Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={onOpenImageGallery} className="gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Images</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  NEW
                </Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton className="gap-2">
                <Boxes className="h-4 w-4" />
                <span>Apps</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator className="my-2 bg-zinc-800/50" />

      {/* Forge Section */}
      <Collapsible open={isForgeExpanded} onOpenChange={setIsForgeExpanded}>
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center gap-2 px-2 cursor-pointer hover:bg-zinc-800/50 rounded-md transition-colors">
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
                    onClick={() => onForgeNavigation("character")} 
                    className="gap-2 min-h-[44px]"
                    asChild={isMobile}
                  >
                    {isMobile ? (
                      <SheetClose asChild>
                        <Link href="/forge/character">
                          <Users className="h-4 w-4" />
                          <span>Character Forge</span>
                        </Link>
                      </SheetClose>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        <span>Character Forge</span>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => onForgeNavigation("world")} 
                    className="gap-2 min-h-[44px]"
                    asChild={isMobile}
                  >
                    {isMobile ? (
                      <SheetClose asChild>
                        <Link href="/forge/world">
                          <Globe className="h-4 w-4" />
                          <span>World Forge</span>
                        </Link>
                      </SheetClose>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        <span>World Forge</span>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => onForgeNavigation("storyline")} 
                    className="gap-2 min-h-[44px]"
                    asChild={isMobile}
                  >
                    {isMobile ? (
                      <SheetClose asChild>
                        <Link href="/forge/storyline">
                          <BookOpen className="h-4 w-4" />
                          <span>Storyline Forge</span>
                        </Link>
                      </SheetClose>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        <span>Storyline Forge</span>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => onForgeNavigation("magic")} 
                    className="gap-2 min-h-[44px]"
                    asChild={isMobile}
                  >
                    {isMobile ? (
                      <SheetClose asChild>
                        <Link href="/forge/magic">
                          <Wand2 className="h-4 w-4" />
                          <span>Magic System</span>
                        </Link>
                      </SheetClose>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        <span>Magic System</span>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => onForgeNavigation("faction")} 
                    className="gap-2 min-h-[44px]"
                    asChild={isMobile}
                  >
                    {isMobile ? (
                      <SheetClose asChild>
                        <Link href="/forge/faction">
                          <Shield className="h-4 w-4" />
                          <span>Faction Forge</span>
                        </Link>
                      </SheetClose>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Faction Forge</span>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => onForgeNavigation("lore")} 
                    className="gap-2 min-h-[44px]"
                    asChild={isMobile}
                  >
                    {isMobile ? (
                      <SheetClose asChild>
                        <Link href="/forge/lore">
                          <Scroll className="h-4 w-4" />
                          <span>Lore & History</span>
                        </Link>
                      </SheetClose>
                    ) : (
                      <>
                        <Scroll className="h-4 w-4" />
                        <span>Lore & History</span>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      <Separator className="my-2 bg-zinc-800/50" />

      {/* Projects Section */}
      <Collapsible open={isProjectsExpanded} onOpenChange={setIsProjectsExpanded}>
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between px-2 cursor-pointer hover:bg-zinc-800/50 rounded-md transition-colors">
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
                {projects.length > 0 ? (
                  <>
                    {projects.slice(0, 5).map((project: any) => (
                      <SidebarMenuItem key={project.id}>
                        <SidebarMenuButton onClick={() => onSelectProject(project)} className="gap-2 min-h-[44px]">
                          <span className="text-lg">{project.icon}</span>
                          <span className="flex-1 truncate">{project.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      <Separator className="my-2 bg-zinc-800/50" />

      {/* Chats Section */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase text-zinc-400 px-2">
          Your Chats
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredChats.slice(0, 10).map((chat: any) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton 
                  onClick={() => onSelectChat(chat)} 
                  className="gap-2 min-h-[44px]"
                  asChild={isMobile && chat.id}
                >
                  {isMobile && chat.id ? (
                    <SheetClose asChild>
                      <Link href={`/chat/${chat.id}`}>
                        <MessageSquare className="h-4 w-4" />
                        <span className="flex-1 truncate">{chat.title}</span>
                        {chat.is_pinned && <Pin className="h-3 w-3 text-red-400" />}
                      </Link>
                    </SheetClose>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      <span className="flex-1 truncate">{chat.title}</span>
                      {chat.is_pinned && <Pin className="h-3 w-3 text-red-400" />}
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

// Forge-specific sidebar content
function ForgeSidebarContent({ forgeType, onNavigate }: any) {
  const { isMobile } = useSidebar()
  
  const forgeItems = [
    { type: "character", icon: Users, label: "Character Forge" },
    { type: "world", icon: Globe, label: "World Forge" },
    { type: "storyline", icon: BookOpen, label: "Storyline Forge" },
    { type: "magic", icon: Wand2, label: "Magic System" },
    { type: "faction", icon: Shield, label: "Faction Forge" },
    { type: "lore", icon: Scroll, label: "Lore & History" },
  ]

  const handleNavigate = (type: string) => {
    onNavigate(type)
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase text-zinc-400 px-2">
          Forge Navigation
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {forgeItems.map((item) => (
              <SidebarMenuItem key={item.type}>
                <SidebarMenuButton 
                  onClick={() => handleNavigate(item.type)} 
                  className="gap-2 min-h-[44px]"
                  asChild={isMobile}
                >
                  {isMobile ? (
                    <SheetClose asChild>
                      <Link href={`/forge/${item.type}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SheetClose>
                  ) : (
                    <>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator className="my-2 bg-zinc-800/50" />

      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase text-zinc-400 px-2">
          {forgeType ? `${forgeType.charAt(0).toUpperCase() + forgeType.slice(1)} Tools` : "Forge Tools"}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="gap-2">
                <Plus className="h-4 w-4" />
                <span>New Item</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="gap-2">
                <Boxes className="h-4 w-4" />
                <span>Templates</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Gallery</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}


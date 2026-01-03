import { createClient } from "@/lib/supabase/server"
import { EnhancedChatInterface } from "@/components/enhanced-chat-interface"

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from("chat_hub_messages")
    .select("*")
    .order("createdAt", { ascending: true })
    .limit(50)

  return <EnhancedChatInterface initialMessages={messages || []} skipSidebar={true} />
}


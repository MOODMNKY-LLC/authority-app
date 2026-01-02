"use client"

import type React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Bot, User, Mic, Square, Paperclip, Volume2, VolumeX, X, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  content: string
  role: string
  created_at: string
}

interface ChatInterfaceProps {
  initialMessages: Message[]
}

export function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { toast } = useToast()

  const { messages, sendMessage, status } = useChat({
    initialMessages: initialMessages.map((msg) => ({
      id: msg.id,
      parts: [{ type: "text" as const, text: msg.content }],
      role: msg.role as "user" | "assistant",
    })),
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        // Here you would typically send to a transcription service
        toast({
          title: "Audio recorded",
          description: "Audio transcription coming soon!",
        })
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: "Microphone error",
        description: "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      } else {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onend = () => setIsSpeaking(false)
        window.speechSynthesis.speak(utterance)
        setIsSpeaking(true)
      }
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachedFiles.length === 0) || status === "streaming") return

    // Build message with text and file info
    let messageText = input
    if (attachedFiles.length > 0) {
      messageText += `\n\n[Attached files: ${attachedFiles.map((f) => f.name).join(", ")}]`
    }

    sendMessage({
      role: "user",
      parts: [{ type: "text" as const, text: messageText }],
    })

    setInput("")
    setAttachedFiles([])
  }

  const isLoading = status === "streaming"

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">AI Chat</h1>
              <p className="text-xs text-zinc-400">{status === "streaming" ? "Thinking..." : "Ready to help"}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-zinc-800 text-zinc-400">
            Notion Connected
          </Badge>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="mx-auto max-w-4xl space-y-6 p-4 pb-32">
          {messages.length === 0 && (
            <div className="flex h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-white">Start a conversation</h2>
              <p className="mb-4 text-zinc-400">Ask me anything, search Notion, or use voice input</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-zinc-900 text-zinc-300">
                  Search Notion
                </Badge>
                <Badge variant="secondary" className="bg-zinc-900 text-zinc-300">
                  Voice Input
                </Badge>
                <Badge variant="secondary" className="bg-zinc-900 text-zinc-300">
                  File Upload
                </Badge>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const content = message.parts
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("")

            const toolCalls = message.parts.filter((part) => part.type?.startsWith("tool-"))

            return (
              <div key={message.id} className="space-y-2">
                <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 border-2 border-zinc-800 shadow-sm">
                      <AvatarFallback className="bg-red-600">
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      message.role === "user"
                        ? "bg-red-600 text-white"
                        : "border border-zinc-800 bg-zinc-900 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
                    {message.role === "assistant" && content && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs text-zinc-400 hover:text-white"
                        onClick={() => speakText(content)}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="mr-1 h-3 w-3" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Volume2 className="mr-1 h-3 w-3" />
                            Listen
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 border-2 border-zinc-800 shadow-sm">
                      <AvatarFallback className="bg-zinc-800 text-white">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {toolCalls.length > 0 && (
                  <div className="ml-11 space-y-2">
                    {toolCalls.map((part: any, idx: number) => (
                      <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Using tool: {part.toolName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 border-2 border-zinc-800 shadow-sm">
                <AvatarFallback className="bg-red-600">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[85%] rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-red-600"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl p-4">
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, idx) => (
                <Badge key={idx} variant="secondary" className="gap-2 bg-zinc-900 pr-1 text-zinc-300">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[150px] truncate text-xs">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-zinc-800"
                    onClick={() => removeFile(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-12 w-12 shrink-0 hover:bg-zinc-900 ${
                isRecording ? "bg-red-600 text-white hover:bg-red-700" : "text-zinc-400 hover:text-white"
              }`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-full border-zinc-800 bg-zinc-900 px-5 py-6 text-white shadow-sm placeholder:text-zinc-500 focus-visible:ring-red-600"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-full bg-red-600 shadow-md hover:bg-red-700 hover:shadow-lg"
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

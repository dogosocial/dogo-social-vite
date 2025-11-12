"use client"

import BlurText from "./blur-text"
import { Loader } from "lucide-react"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  loading?: boolean
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs md:max-w-md px-4 py-2 md:px-6 md:py-3 ${
          isUser ? "text-right text-primary" : "text-left text-foreground"
        }`}
      >
        {message.loading ? (
          <div className="flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Generando respuesta...</span>
          </div>
        ) : (
          <BlurText
            text={message.content}
            delay={50}
            direction="top"
            animateBy="words"
            className={`text-sm md:text-base ${isUser ? "text-primary" : "text-foreground"}`}
          />
        )}
      </div>
    </div>
  )
}

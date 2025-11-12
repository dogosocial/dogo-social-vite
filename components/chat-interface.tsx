"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import ChatMessage from "./chat-message"
import GradualBlur from "./gradual-blur"
import ShinyText from "./shiny-text"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  loading?: boolean
}

const WEBHOOK_URL = "https://centro-n8n.xqnwvv.easypanel.host/webhook/d60ccbd7-0370-47c8-8dd2-5400579081da"

const ThinkingLoader = () => <ShinyText text="Pensando..." disabled={false} speed={3} className="text-sm" />

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const pollForResponse = async (messageId: string, maxAttempts = 30) => {
    let attempts = 0
    const pollInterval = setInterval(async () => {
      attempts++

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageId,
            action: "get_response",
          }),
        })

        if (response.ok) {
          const data = await response.json()

          const aiResponse = data.response || data.message || data.output || data

          if (aiResponse && !aiResponse.includes?.("Workflow was started")) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === messageId ? { ...msg, content: aiResponse, loading: false } : msg)),
            )
            clearInterval(pollInterval)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error("Error en polling:", error)
      }

      if (attempts >= maxAttempts) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: "Tiempo agotado esperando la respuesta del agente. Intenta de nuevo.",
                  loading: false,
                }
              : msg,
          ),
        )
        clearInterval(pollInterval)
        setLoading(false)
      }
    }, 500)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    // Add loading AI message
    const aiMessageId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        type: "ai",
        content: "", // Empty content, loading animation will be shown instead
        loading: true,
      },
    ])

    try {
      let response: Response
      try {
        response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: input,
          }),
        })
      } catch (postError) {
        response = await fetch(`${WEBHOOK_URL}?message=${encodeURIComponent(input)}`, {
          method: "GET",
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${response.status}`)
      }

      const data = await response.json()

      let aiResponse = ""

      if (Array.isArray(data) && data.length > 0) {
        aiResponse = data[0].output || data[0].message || data[0].response || JSON.stringify(data[0])
      } else if (typeof data === "object") {
        aiResponse = data.output || data.message || data.response || JSON.stringify(data)
      } else {
        aiResponse = String(data)
      }

      if (aiResponse && !aiResponse.includes("Workflow was started")) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, content: aiResponse, loading: false } : msg)),
        )
        setLoading(false)
      } else {
        throw new Error("Sin respuesta válida del servidor")
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error desconocido"

      let userFeedback = "Error al conectar. Por favor, intenta de nuevo."
      if (errorMsg.includes("Failed to fetch")) {
        userFeedback = "No se puede conectar con el servidor. Verifica tu conexión."
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: userFeedback,
                loading: false,
              }
            : msg,
        ),
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto text-foreground">
      {/* Header con logo */}
      <div className="relative flex justify-center flex-shrink-0 bg-transparent z-30">
        {/* GradualBlur como fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <GradualBlur
            position="bottom"
            height="4rem"
            strength={2}
            divCount={5}
            curve="bezier"
            exponential={true}
            opacity={0.4}
          />
        </div>

        {/* Logo */}
        <div className="relative w-14 sm:w-16 md:w-20 pt-2 sm:pt-3 md:pt-4 z-10">
          <img
            src="/images/design-mode/dogo-social-logo.webp"
            alt="Dogo Social"
            className="w-14 sm:w-16 md:w-20 aspect-square object-contain"
          />
        </div>
      </div>

      {/* Messages Container - El contenedor principal de scroll */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="p-2 sm:p-3 md:p-6 space-y-2 sm:space-y-3 md:space-y-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] gap-3 sm:gap-4">
              <p className="text-muted-foreground text-center text-xs sm:text-sm md:text-base px-3 sm:px-4">
                ¡Hola! Soy DogoAI, tu vet ai de confianza. ¿Cómo puedo ayudarte?
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) =>
                message.loading ? (
                  <div key={message.id} className="flex gap-2 animate-fade-in">
                    <div className="flex-1">
                      <ThinkingLoader />
                    </div>
                  </div>
                ) : (
                  <ChatMessage key={message.id} message={message} />
                ),
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input form en la parte inferior */}
      <div className="flex-shrink-0 p-2 sm:p-3 md:p-6 backdrop-blur-md bg-background/80 border-t border-border/30 z-30">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
            className="flex-1 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 bg-background/60 backdrop-blur-sm border border-border/50 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent disabled:opacity-50 text-xs sm:text-sm md:text-base transition-all min-h-[44px] touch-manipulation"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:shadow-md flex-shrink-0 min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

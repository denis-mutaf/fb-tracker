'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { useAccountStore } from '@/hooks/use-account'
import { ChatMessage } from '@/types'
import { cn } from '@/lib/utils'

const SUGGESTED_QUESTIONS = [
  'Какая кампания самая эффективная за последнюю неделю?',
  'Почему выросла цена за лид?',
  'Сравни результаты этой и прошлой недели',
  'Какие кампании стоит отключить?',
  'Какой бюджет оптимален для лучших кампаний?',
]

function MessageBubble({ message, isNew }: { message: ChatMessage; isNew?: boolean }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 mb-4', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser
          ? 'bg-blue-500/20 border border-blue-500/30'
          : 'bg-purple-500/20 border border-purple-500/30'
      )}>
        {isUser
          ? <User size={14} className="text-blue-400" />
          : <Bot size={14} className="text-purple-400" />
        }
      </div>

      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'rounded-tr-sm text-white'
          : 'rounded-tl-sm text-slate-200'
      )}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.15))'
            : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isUser ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
        }}>
        {message.role === 'assistant' ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="w-full text-sm border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-white/10 px-3 py-2 text-left font-semibold bg-white/5">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-white/10 px-3 py-2">{children}</td>
                ),
              }}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20 border border-purple-500/30 flex-shrink-0">
        <Bot size={14} className="text-purple-400" />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-400"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { selectedAccount } = useAccountStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage, isLoading])

  async function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content || isLoading) return

    setInput('')
    const userMessage: ChatMessage = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    setStreamingMessage('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.account_id,
          messages: newMessages,
        }),
      })

      if (!res.ok) throw new Error('Ошибка запроса')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const { text } = JSON.parse(data)
                fullText += text
                setStreamingMessage(fullText)
              } catch { /* skip */ }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullText },
      ])
      setStreamingMessage('')
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Ошибка: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка') },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="AI Chat" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 pb-0">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full pb-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Sparkles size={28} className="text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">AI Аналитик кампаний</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-md">
                Задавайте вопросы о ваших рекламных кампаниях. AI имеет доступ к актуальным данным за последние 30 дней.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 rounded-xl text-sm text-slate-300 hover:text-white transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} isNew={i === messages.length - 1 && msg.role === 'user'} />
          ))}

          {streamingMessage && (
            <MessageBubble message={{ role: 'assistant', content: streamingMessage }} />
          )}

          {isLoading && !streamingMessage && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 md:p-6">
          <div className="flex items-end gap-3 p-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите что-нибудь о кампаниях..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none resize-none leading-relaxed py-1 disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
              style={{
                background: input.trim() && !isLoading ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)',
              }}>
              <Send size={16} className="text-white" />
            </motion.button>
          </div>
          <p className="text-xs text-slate-700 text-center mt-2">
            Аккаунт: {selectedAccount.account_name} · Enter для отправки, Shift+Enter для новой строки
          </p>
        </div>
      </div>
    </div>
  )
}

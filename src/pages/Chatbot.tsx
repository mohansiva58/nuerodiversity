import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  ChevronDown,
  Lightbulb,
  RefreshCw,
  Copy,
  Check,
  Brain,
  Wand2,
  AlertTriangle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface PromptTemplate {
  id: string;
  title: string;
  emoji: string;
  description: string;
  prompt: string;
  category: "basics" | "advanced" | "creative" | "technical";
}

type Provider = "openai" | "groq" | "none";

// ── System Prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are PromptPal — a friendly AI tutor for prompt engineering helping neurodiverse learners.

Personality:
• Friendly and patient
• Use simple explanations
• Break concepts into steps
• Use emojis and examples

Expertise:
• Zero-Shot prompting
• Few-Shot prompting
• Chain-of-Thought
• Role-play prompts

Always give:
• short explanation
• example
• small tip to improve prompts

Keep answers under 200 words.`;

// ── Templates ──────────────────────────────────────────────────────────────────
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "1",
    title: "Zero-Shot",
    emoji: "🎯",
    description: "Learn zero-shot prompting",
    prompt:
      "Explain zero-shot prompting with a simple example.",
    category: "basics",
  },
  {
    id: "2",
    title: "Few-Shot",
    emoji: "✨",
    description: "Prompt with examples",
    prompt:
      "Explain few-shot prompting and give 2 examples.",
    category: "basics",
  },
  {
    id: "3",
    title: "Chain of Thought",
    emoji: "🔗",
    description: "Step-by-step reasoning",
    prompt:
      "Explain chain-of-thought prompting with a logic example.",
    category: "advanced",
  },
  {
    id: "4",
    title: "Improve Prompt",
    emoji: "🚀",
    description: "Make prompts better",
    prompt:
      "Improve this prompt: Write a story about a dog.",
    category: "creative",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  basics: "from-violet-500 to-purple-600",
  advanced: "from-blue-500 to-cyan-500",
  creative: "from-pink-500 to-rose-500",
  technical: "from-emerald-500 to-teal-500",
};

const PROVIDER_META: Record<
  Provider,
  { label: string; color: string; model: string }
> = {
  openai: {
    label: "GPT-4o",
    color: "bg-green-500",
    model: "gpt-4o",
  },
  groq: {
    label: "Groq (Llama-3.1)",
    color: "bg-blue-500",
    model: "llama-3.1-8b-instant",
  },
  none: { label: "Offline", color: "bg-gray-400", model: "" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).substring(2);

const buildHistory = (messages: Message[], userContent: string) => [
  { role: "system", content: SYSTEM_PROMPT },
  ...messages
    .filter((m) => !m.isTyping)
    .map((m) => ({ role: m.role, content: m.content })),
  { role: "user", content: userContent },
];

// ── OpenAI API ──────────────────────────────────────────────────────────────────
async function callOpenAI(
  history: { role: string; content: string }[]
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("VITE_OPENAI_API_KEY not set");

  const res = await fetch("/openai-api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: history,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || "Unknown OpenAI error";
    console.error("[OpenAI Error]", res.status, errData);
    throw new Error(errMsg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

/*
// ── Groq API (Commented Out) ───────────────────────────────────────────────────
async function callGroq(
  history: { role: string; content: string }[]
): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY not set");

  const res = await fetch("/groq-api/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: history,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || "Unknown Groq error";
    console.error("[Groq Error]", res.status, errData);
    throw new Error(errMsg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}
*/

// ── Typing Dots ────────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-2 h-2 bg-violet-400 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);

// ── Message Bubble ─────────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? "bg-violet-600" : "bg-blue-500"
          }`}
      >
        {isUser ? (
          <Brain className="w-4 h-4 text-white" />
        ) : (
          <Wand2 className="w-4 h-4 text-white" />
        )}
      </div>

      <div className="max-w-[75%]">
        <div
          className={`px-4 py-3 rounded-xl text-sm ${isUser
            ? "bg-violet-600 text-white"
            : "bg-white border"
            }`}
        >
          {message.isTyping ? (
            <TypingDots />
          ) : (
            message.content
          )}
        </div>

        {!isUser && !message.isTyping && (
          <button
            onClick={copy}
            className="text-xs text-gray-400 mt-1 flex gap-1 items-center"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Template Card ──────────────────────────────────────────────────────────────
const TemplateCard: React.FC<{
  template: PromptTemplate;
  onClick: (p: string) => void;
}> = ({ template, onClick }) => (
  <button
    onClick={() => onClick(template.prompt)}
    className="p-3 bg-white border rounded-xl text-left"
  >
    <div className="flex gap-2 items-center">
      <span>{template.emoji}</span>
      <span className="font-semibold text-sm">
        {template.title}
      </span>
    </div>
    <p className="text-xs text-gray-400">
      {template.description}
    </p>
  </button>
);

// ── Main Chatbot ───────────────────────────────────────────────────────────────
const Chatbot: React.FC = () => {
  const [activeProvider, setActiveProvider] = useState<Provider>("openai");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const typing: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((m) => [...m, userMsg, typing]);
      setInput("");
      setIsLoading(true);
      setShowTemplates(false);

      try {
        const history = buildHistory(messages, content);
        const response = await callOpenAI(history);

        setMessages((prev) => [
          ...prev.filter((m) => !m.isTyping),
          {
            id: uid(),
            role: "assistant",
            content: response,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev.filter((m) => !m.isTyping),
          {
            id: uid(),
            role: "assistant",
            content:
              "⚠️ OpenAI AI unavailable. Check API key.",
            timestamp: new Date(),
          },
        ]);
      }

      setIsLoading(false);
    },
    [messages]
  );

  return (
    <div className="fixed bottom-20 right-5">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="w-80 h-[520px] bg-gray-50 rounded-2xl shadow-xl flex flex-col"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Header */}
            <div className="bg-violet-700 text-white p-3 flex justify-between">
              <span>PromptPal</span>
              <button onClick={() => setIsOpen(false)}>
                <X />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}

              {showTemplates && (
                <div className="grid grid-cols-2 gap-2">
                  {PROMPT_TEMPLATES.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onClick={sendMessage}
                    />
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <textarea
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                placeholder="Ask about prompt engineering..."
                className="flex-1 resize-none text-sm"
              />
              <button
                onClick={() => sendMessage(input)}
                className="bg-violet-600 text-white p-2 rounded"
              >
                {isLoading ? (
                  <RefreshCw className="animate-spin" />
                ) : (
                  <Send />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-violet-600 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-violet-700 transition-all duration-300"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <Wand2 />
      </button>
    </div>
  );
};

export default Chatbot;
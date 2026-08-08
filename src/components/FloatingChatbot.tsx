import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  X,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { ragService } from "../services/ragService";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: Array<{ source: string; content: string }>;
  timestamp: string;
}

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quickPrompts = [
    "What is autism?",
    "How can I support learning at home?",
    "What is dyslexia?",
  ];

  // Initialize RAG service with health checks
  useEffect(() => {
    if (!isOpen) return;

    const initializeConnection = async () => {
      try {
        await ragService.checkHealth();
        setConnected(true);
        setError(null);
      } catch (err) {
        setConnected(false);
        setError(null);
      }
    };

    initializeConnection();
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + "px";
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!connected) {
      setError("RAG API not connected");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await ragService.query(input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.answer,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to get response";
      setError(errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: `Error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-40 transition-all hover:scale-110"
            title="Open Hiki"
          >
            <MessageCircle size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 w-[24rem] h-[540px] bg-white/95 backdrop-blur-xl rounded-[1.75rem] shadow-2xl flex flex-col z-50 border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-cyan-600 to-sky-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} />
                <div>
                  <h3 className="font-semibold">Hiki</h3>
                  <p className="text-xs opacity-90">
                    {connected ? "🟢 Ready" : "🔴 Offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                >
                  {isMinimized ? (
                    <Maximize2 size={16} />
                  ) : (
                    <Minimize2 size={16} />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
                  {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center px-3">
                      <div className="text-slate-500">
                        <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Hi, I’m Hiki</p>
                        <p className="text-xs mt-1">Ask anything about the documents.</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {quickPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => setInput(prompt)}
                              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 transition"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${
                        msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.type === "user"
                            ? "bg-slate-900 text-white rounded-br-none"
                            : "bg-white text-slate-900 rounded-bl-none border border-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <span className="text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(msg.id, msg.content)
                            }
                            className="opacity-50 hover:opacity-100 transition-opacity"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>

                        {/* Show Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-30">
                            <button
                              onClick={() =>
                                setShowSources(
                                  showSources === msg.id ? null : msg.id
                                )
                              }
                              className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
                            >
                              <FileText size={12} />
                              Sources ({msg.sources.length})
                            </button>

                            {showSources === msg.id && (
                              <div className="mt-2 text-xs space-y-1 max-h-24 overflow-y-auto">
                                {msg.sources.map((src, i) => (
                                  <div
                                    key={i}
                                    className="bg-black/10 p-1 rounded text-left"
                                  >
                                    <p className="font-semibold opacity-80">
                                      {src.source}
                                    </p>
                                    <p className="opacity-70 line-clamp-2">
                                      {src.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg rounded-bl-none">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.4s" }}></div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg rounded-bl-none flex items-start gap-2 text-xs max-w-xs">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-200 p-3 bg-white">
                  <div className="flex gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask Hiki something..."
                      className="flex-1 resize-none border border-slate-300 rounded-2xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none bg-white"
                      rows={1}
                      disabled={loading || !connected}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim() || !connected}
                      className="bg-slate-900 text-white p-2 rounded-2xl hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
                      title="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  X,
  MessageCircle,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  FileText,
  History,
  Plus,
  Trash2,
  ChevronDown,
  Edit2,
} from "lucide-react";
import { ragService } from "../services/ragService";
import { useChatHistory } from "../hooks/useChatHistory";
import { getAuth } from "firebase/auth";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: Array<{ source: string; content: string }>;
  timestamp: string;
  isTyping?: boolean;
}

const RAGChat: React.FC = () => {
  const auth = getAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quickPrompts = [
    "What is autism?",
    "How does dyslexia affect learning?",
    "How can I support my child?",
  ];

  const getLocalSmallTalkResponse = (value: string): string | null => {
    const normalized = value.trim().toLowerCase();

    if (/^i\s+am\s+[a-z][a-z\s'-]{0,40}$/.test(normalized)) {
      const name = value.trim().replace(/^i\s+am\s+/i, "").trim();
      return `Nice to meet you, ${name}! How can I help today?`;
    }

    if (/^my\s+name\s+is\s+[a-z][a-z\s'-]{0,40}$/.test(normalized)) {
      const name = value.trim().replace(/^my\s+name\s+is\s+/i, "").trim();
      return `Nice to meet you, ${name}! How can I help today?`;
    }

    if (["hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "help"].includes(normalized)) {
      return "Hello! I’m Hiki, your calm assistant. What can I do for you?";
    }

    return null;
  };

  const {
    conversationId,
    messages,
    conversations,
    loading: historyLoading,
    error: historyError,
    startNewConversation,
    loadConversation,
    addMessage,
    updateTitle,
    deleteCurrentConversation,
    loadAllConversations,
  } = useChatHistory();

  // Initialize RAG service and chat history
  useEffect(() => {
    // Check if user is authenticated
    if (!auth.currentUser) {
      setError("Please log in to use chat history");
      return;
    }

    // Start periodic health checks
    ragService.startHealthCheck(30000);

    // Initial connection check
    ragService
      .checkHealth()
      .then(() => {
        setConnected(true);
        setError(null);
      })
      .catch((err) => {
        setConnected(false);
        setError(
          "RAG API not available. Ensure rag_unified.py is running on port 8000.\n" +
          "Run: python src/aiagentrag/rag_unified.py"
        );
      });

    // Load conversation history
    loadAllConversations();

    // Start new conversation
    startNewConversation("Hiki - " + new Date().toLocaleDateString());

    // Cleanup
    return () => {
      ragService.stopHealthCheck();
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 128) + "px";
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const localResponse = getLocalSmallTalkResponse(input);
    if (localResponse) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: input,
        timestamp: new Date().toISOString(),
      };

      await addMessage({
        id: userMessage.id,
        type: "user",
        content: input,
        timestamp: userMessage.timestamp,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: localResponse,
        timestamp: new Date().toISOString(),
      };

      await addMessage({
        id: assistantMessage.id,
        type: "assistant",
        content: localResponse,
        timestamp: assistantMessage.timestamp,
      });

      setInput("");
      setError(null);
      return;
    }

    if (!connected) {
      setError(
        "RAG API not connected. Ensure rag_unified.py is running on port 8000.\n" +
        "Run: python src/aiagentrag/rag_unified.py"
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    // Save user message to Firebase
    await addMessage({
      id: userMessage.id,
      type: "user",
      content: input,
      timestamp: userMessage.timestamp,
    });

    setInput("");
    setLoading(true);
    setError(null);

    try {
      const data = await ragService.query(input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer,
        sources: data.sources.slice(0, 3),
        timestamp: data.timestamp,
      };

      // Save assistant message to Firebase
      await addMessage({
        id: assistantMessage.id,
        type: "assistant",
        content: data.answer,
        sources: data.sources.slice(0, 3),
        timestamp: data.timestamp,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get response";
      setError(errorMsg);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `⚠️ Error: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };

      // Save error message to Firebase
      await addMessage({
        id: errorMessage.id,
        type: "assistant",
        content: `⚠️ Error: ${errorMsg}`,
        timestamp: errorMessage.timestamp,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0,_#eef4ff_45%,_#f8fafc_100%)] text-slate-900">
      {/* Sidebar - Conversation History */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-72 bg-slate-950/95 text-white flex flex-col shadow-2xl z-20 border-r border-white/10 backdrop-blur-xl"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Hiki History
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* New Chat Button */}
              <button
                onClick={() => startNewConversation("Chat - " + new Date().toLocaleDateString())}
                className="w-full py-2 px-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition text-slate-950"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {conversations.map((conv) => (
                    <div key={conv.id} className="group">
                      <button
                        onClick={() => {
                          loadConversation(conv.id);
                          setShowSidebar(false);
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition text-sm truncate ${
                          conversationId === conv.id
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-white/5 text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        {editingTitle === conv.id ? (
                          <input
                            autoFocus
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={async () => {
                              if (newTitle.trim()) {
                                await updateTitle(newTitle);
                              }
                              setEditingTitle(null);
                            }}
                            onKeyPress={async (e) => {
                              if (e.key === "Enter" && newTitle.trim()) {
                                await updateTitle(newTitle);
                                setEditingTitle(null);
                              }
                            }}
                            className="w-full bg-white/10 text-white px-2 py-1 rounded text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </button>

                      {/* Hover Actions */}
                      {conversationId === conv.id && (
                        <div className="flex gap-2 p-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setEditingTitle(conv.id);
                              setNewTitle(conv.title);
                            }}
                            className="flex-1 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded text-xs flex items-center justify-center gap-1"
                            title="Edit title"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Delete this conversation?")) {
                                await deleteCurrentConversation();
                                await loadAllConversations();
                              }
                            }}
                            className="flex-1 p-1.5 text-gray-400 hover:text-red-300 hover:bg-white/10 rounded text-xs flex items-center justify-center gap-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/80">
          <div className="max-w-4xl mx-auto px-6 py-4 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition"
                >
                  <MessageCircle className="w-6 h-6 text-slate-600" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Hiki</h1>
                  <p className="text-sm text-slate-600">Clean document answers with sources</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium text-slate-700">
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Warning */}
        {!connected && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3">
            <div className="max-w-4xl mx-auto flex gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800">
                <p className="font-semibold">RAG API not connected.</p>
                <p>Start the server with: <code className="bg-rose-100 px-2 py-1 rounded font-mono text-xs">python src/aiagentrag/rag_unified.py</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="max-w-4xl mx-auto px-6 py-8 w-full">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-100 via-sky-100 to-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-white">
                  <MessageCircle className="w-11 h-11 text-cyan-700" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">Meet Hiki</h2>
                <p className="text-slate-600 max-w-xl mx-auto mb-8 leading-relaxed">
                  Hiki gives clean, source-backed answers from your document library in a calm, focused interface.
                </p>
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 transition shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-2xl ${
                        msg.type === "user"
                          ? "bg-slate-900 text-white rounded-[1.75rem] rounded-tr-md shadow-lg"
                          : "bg-white text-slate-900 rounded-[1.75rem] rounded-tl-md border border-slate-200 shadow-sm"
                      } px-6 py-4`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                      {msg.type === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <button
                            onClick={() =>
                              setShowSources(showSources === msg.id ? null : msg.id)
                            }
                            className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            Sources ({msg.sources.length})
                            <span className={`ml-1 ${showSources === msg.id ? "rotate-180" : ""}`}>▼</span>
                          </button>

                          {showSources === msg.id && (
                            <div className="mt-3 space-y-2">
                              {msg.sources.map((source, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200"
                                >
                                  <p className="font-semibold text-slate-700 mb-1">
                                    📄 {source.source}
                                  </p>
                                  <p className="text-slate-600 mb-2">
                                    {source.content.substring(0, 150)}...
                                  </p>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        source.content,
                                        `${msg.id}-${idx}`
                                      )
                                    }
                                    className="text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
                                  >
                                    {copiedId === `${msg.id}-${idx}` ? (
                                      <>
                                        <Check className="w-3 h-3" /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" /> Copy
                                      </>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-xs opacity-70 mt-2 block">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-900 rounded-[1.75rem] rounded-tl-md border border-slate-200 shadow-sm px-6 py-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
            <div className="max-w-4xl mx-auto flex items-center gap-2 w-full">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-sm text-orange-800">{error}</p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_30px_rgba(15,23,42,0.06)]">
          <div className="max-w-4xl mx-auto px-6 py-4 w-full">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || !connected}
                placeholder={
                  connected
                    ? "Ask Hiki about your documents..."
                    : "Hiki is connecting..."
                }
                className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none max-h-32 bg-white"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !connected || !input.trim()}
                className="px-4 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition font-medium flex items-center gap-2 h-fit shadow-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: All messages are automatically saved to your chat history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGChat;

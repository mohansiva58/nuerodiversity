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
      return "Hello! I’m here to help. What can I do for you?";
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
    startNewConversation("Chat - " + new Date().toLocaleDateString());

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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversation History */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-20"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Chat History
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-gray-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* New Chat Button */}
              <button
                onClick={() => startNewConversation("Chat - " + new Date().toLocaleDateString())}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
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
                        className={`w-full text-left p-3 rounded-lg transition text-sm truncate ${
                          conversationId === conv.id
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-800 text-gray-200 hover:bg-gray-700"
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
                            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
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
                            className="flex-1 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-xs flex items-center justify-center gap-1"
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
                            className="flex-1 p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded text-xs flex items-center justify-center gap-1"
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
        <div className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-6 py-4 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <MessageCircle className="w-6 h-6 text-gray-600" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">RAG Document Assistant</h1>
                  <p className="text-sm text-gray-600">Ask questions about your documents</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Warning */}
        {!connected && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <div className="max-w-4xl mx-auto flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">RAG API not connected.</p>
                <p>Start the server with: <code className="bg-red-100 px-2 py-1 rounded font-mono text-xs">python src/aiagentrag/rag_unified.py</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="max-w-4xl mx-auto px-6 py-8 w-full">
            {messages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome!</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Ask me anything about the documents in the knowledge base. I'll search through PDFs and provide answers with sources.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <button
                    onClick={() => {
                      setInput("What is autism?");
                    }}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition text-left"
                  >
                    <p className="font-semibold text-gray-900">What is autism?</p>
                    <p className="text-sm text-gray-600">Get comprehensive information</p>
                  </button>
                  <button
                    onClick={() => {
                      setInput("How does dyslexia affect learning?");
                    }}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition text-left"
                  >
                    <p className="font-semibold text-gray-900">How does dyslexia affect learning?</p>
                    <p className="text-sm text-gray-600">Learn about learning differences</p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-2xl ${
                        msg.type === "user"
                          ? "bg-indigo-600 text-white rounded-3xl rounded-tr-lg"
                          : "bg-white text-gray-900 rounded-3xl rounded-tl-lg border border-gray-200 shadow-sm"
                      } px-6 py-4`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>

                      {msg.type === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() =>
                              setShowSources(showSources === msg.id ? null : msg.id)
                            }
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
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
                                  className="text-xs bg-gray-50 p-3 rounded border border-gray-200"
                                >
                                  <p className="font-semibold text-gray-700 mb-1">
                                    📄 {source.source}
                                  </p>
                                  <p className="text-gray-600 mb-2">
                                    {source.content.substring(0, 150)}...
                                  </p>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        source.content,
                                        `${msg.id}-${idx}`
                                      )
                                    }
                                    className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
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
                    <div className="bg-white text-gray-900 rounded-3xl rounded-tl-lg border border-gray-200 shadow-sm px-6 py-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
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
        <div className="bg-white border-t border-gray-200 shadow-lg">
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
                    ? "Ask a question about your documents..."
                    : "RAG API not connected..."
                }
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 resize-none max-h-32"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !connected || !input.trim()}
                className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center gap-2 h-fit"
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

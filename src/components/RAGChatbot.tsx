import React, { useState, useRef, useEffect } from "react";
import { ragService } from "../services/ragService";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: Array<{ source: string; content: string }>;
  timestamp: string;
}

const RAGChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize RAG service with health checks
  useEffect(() => {
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

    // Cleanup
    return () => {
      ragService.stopHealthCheck();
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const data = await ragService.query(input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer,
        sources: data.sources,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to get response";
      setError(errorMsg);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📚 RAG Document Assistant
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Ask questions about your documents
              </p>
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

      {/* Connection Status Warning */}
      {!connected && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-800">
            ⚠️ RAG API not connected. Start the server with:{" "}
            <code className="bg-red-100 px-2 py-1 rounded font-mono text-xs">
              python src/aiagentrag/rag_unified.py
            </code>
          </p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <p className="text-lg text-gray-700 mb-4">
                  Welcome! Ask me anything about the documents.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      setInput("What is autism?")
                    }
                    className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded text-sm text-blue-900 transition"
                  >
                    What is autism?
                  </button>
                  <button
                    onClick={() =>
                      setInput("How does dyslexia affect learning?")
                    }
                    className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded text-sm text-blue-900 transition"
                  >
                    How does dyslexia affect learning?
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-2xl ${
                    msg.type === "user"
                      ? "bg-indigo-600 text-white rounded-3xl rounded-tr-lg"
                      : "bg-white text-gray-900 rounded-3xl rounded-tl-lg shadow-sm border border-gray-200"
                  } px-6 py-4`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>

                  {msg.type === "assistant" && msg.sources && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        📚 Sources:
                      </p>
                      <div className="space-y-2">
                        {msg.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-50 p-2 rounded border border-gray-200"
                          >
                            <p className="font-medium text-gray-700">
                              {source.source}
                            </p>
                            <p className="text-gray-600 mt-1">
                              {source.content.substring(0, 100)}...
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="text-xs opacity-70 mt-2 block">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 rounded-3xl rounded-tl-lg shadow-sm border border-gray-200 px-6 py-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 px-6 py-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || !connected}
              placeholder={
                connected
                  ? "Ask a question..."
                  : "RAG API not connected..."
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !connected || !input.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Queries are rewritten for better retrieval. Sources are
            shown with each answer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RAGChatbot;

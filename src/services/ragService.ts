/**
 * RAG Service - Unified RAG Agent Integration
 * 
 * Handles all communication with the rag_unified.py API
 * Provides health checks, query processing, and response normalization
 */

export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  query: string;
  answer: string;
  sources: Array<{ source: string; content: string }>;
  processing_time_ms: number;
  query_type: string;
  from_cache: boolean;
}

export interface NormalizedResponse {
  original_query: string;
  rewritten_query: string;
  answer: string;
  sources: Array<{ source: string; content: string }>;
  timestamp: string;
  processing_time_ms: number;
  query_type: string;
  from_cache: boolean;
}

export interface HealthStatus {
  status: string;
  ready: boolean;
  timestamp: string;
}

class RAGService {
  private baseUrl: string;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isHealthy: boolean = false;

  constructor() {
    // Get RAG API URL from environment or default to localhost:8000
    // Use import.meta.env for Vite/browser environments (not process.env)
    this.baseUrl =
      (import.meta.env.VITE_RAG_API_URL as string) ||
      "http://localhost:8000";

    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, "");
  }

  /**
   * Test CORS connectivity
   */
  async testCORS(): Promise<boolean> {
    try {
      console.log(`🔍 Testing CORS with GET ${this.baseUrl}/cors-test`);
      const response = await fetch(`${this.baseUrl}/cors-test`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`CORS test failed: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log("✓ CORS test successful:", data);
      return true;
    } catch (error) {
      console.error("CORS test error:", error);
      return false;
    }
  }

  /**
   * Check if RAG API is healthy and ready
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.isHealthy = data.ready === true;

      return {
        status: data.status || "ok",
        ready: data.ready || false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("RAG API health check failed:", error);
      this.isHealthy = false;
      return {
        status: "offline",
        ready: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck(interval: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Initial check
    this.checkHealth().catch((err) =>
      console.warn("Initial health check failed:", err)
    );

    // Periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth().catch((err) =>
        console.warn("Periodic health check failed:", err)
      );
    }, interval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check if API is currently healthy
   */
  isReady(): boolean {
    return this.isHealthy;
  }

  /**
   * Query the RAG agent
   * @param query User's question
   * @returns Normalized response with answer and sources
   */
  async query(query: string): Promise<NormalizedResponse> {
    if (!this.isHealthy) {
      try {
        await this.checkHealth();
      } catch {
        throw new Error(
          "RAG API not connected. Please ensure rag_unified.py is running on port 8000: python src/aiagentrag/rag_unified.py"
        );
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query } as QueryRequest),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`RAG API error: ${response.status}`, errorText);
        
        if (response.status === 503) {
          return {
            original_query: query,
            rewritten_query: query,
            answer:
              "I'm still loading the assistant right now. Please try again in a moment, or ask me a greeting while I finish warming up.",
            sources: [],
            timestamp: new Date().toISOString(),
            processing_time_ms: 0,
            query_type: "warming_up",
            from_cache: false,
          };
        } else if (response.status === 500) {
          throw new Error(
            `RAG backend error: ${errorText}. Check server logs.`
          );
        } else {
          throw new Error(
            `Query failed with status ${response.status}: ${errorText}`
          );
        }
      }

      const data: QueryResponse = await response.json();

      // Normalize response to match UI expectations
      return this.normalizeResponse(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("RAG query error:", errorMessage);
      
      // Provide helpful error context
      if (errorMessage.includes("Failed to fetch")) {
        throw new Error(
          "Cannot reach RAG API. Ensure rag_unified.py is running: python src/aiagentrag/rag_unified.py"
        );
      }
      
      throw error;
    }
  }

  /**
   * Reinitialize the RAG agent (reload PDFs)
   */
  async reinitialize(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reinitialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Reinitialization failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("RAG reinitialization error:", error);
      throw error;
    }
  }

  /**
   * Normalize rag_unified.py response to UI format
   */
  private normalizeResponse(data: QueryResponse): NormalizedResponse {
    return {
      original_query: data.query,
      rewritten_query: data.query, // No rewrite in unified API
      answer: data.answer,
      sources: data.sources || [],
      timestamp: new Date().toISOString(),
      processing_time_ms: data.processing_time_ms,
      query_type: data.query_type,
      from_cache: data.from_cache,
    };
  }

  /**
   * Get current API base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set custom API base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, "");
  }
}

// Export singleton instance
export const ragService = new RAGService();

export default ragService;

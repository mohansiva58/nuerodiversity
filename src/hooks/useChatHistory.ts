/**
 * useChatHistory Hook
 * Manages chat conversations with Firebase persistence
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChatMessage,
  Conversation,
  saveChatMessage,
  createConversation,
  getConversation,
  getConversations,
  updateConversationTitle,
  deleteConversation,
  subscribeToConversation,
} from '../services/chatHistoryService';

interface UseChatHistoryReturn {
  conversationId: string | null;
  messages: ChatMessage[];
  conversations: Array<{ id: string; title: string; createdAt: number; updatedAt: number; messageCount: number }>;
  loading: boolean;
  error: string | null;

  // Actions
  startNewConversation: (title?: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  addMessage: (message: ChatMessage) => Promise<void>;
  updateTitle: (title: string) => Promise<void>;
  deleteCurrentConversation: () => Promise<void>;
  loadAllConversations: () => Promise<void>;
}

export const useChatHistory = (): UseChatHistoryReturn => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [unsubscribe]);

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(async (title?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Clean up old subscription
      if (unsubscribe) unsubscribe();

      const newConvId = await createConversation(title || 'New Chat');
      setConversationId(newConvId);
      setMessages([]);

      // Subscribe to new conversation
      const unsubscribeFn = subscribeToConversation(newConvId, setMessages);
      setUnsubscribe(() => unsubscribeFn);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMsg);
      console.error('Error creating conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [unsubscribe]);

  /**
   * Load a specific conversation
   */
  const loadConversation = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Clean up old subscription
      if (unsubscribe) unsubscribe();

      const conversation = await getConversation(convId);
      if (!conversation) {
        setError('Conversation not found');
        return;
      }

      setConversationId(convId);
      setMessages(conversation.messages);

      // Subscribe to real-time updates
      const unsubscribeFn = subscribeToConversation(convId, setMessages);
      setUnsubscribe(() => unsubscribeFn);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMsg);
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [unsubscribe]);

  /**
   * Add a message to current conversation
   */
  const addMessage = useCallback(async (message: ChatMessage) => {
    if (!conversationId) {
      setError('No active conversation');
      return;
    }

    try {
      await saveChatMessage(conversationId, message);
      // Message will be synced via real-time listener
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save message';
      setError(errorMsg);
      console.error('Error saving message:', err);
    }
  }, [conversationId]);

  /**
   * Update conversation title
   */
  const updateTitle = useCallback(async (title: string) => {
    if (!conversationId) {
      setError('No active conversation');
      return;
    }

    try {
      await updateConversationTitle(conversationId, title);
      // Reload conversations to reflect changes
      await loadAllConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update title';
      setError(errorMsg);
      console.error('Error updating title:', err);
    }
  }, [conversationId]);

  /**
   * Delete current conversation
   */
  const deleteCurrentConversation = useCallback(async () => {
    if (!conversationId) {
      setError('No active conversation');
      return;
    }

    try {
      await deleteConversation(conversationId);
      setConversationId(null);
      setMessages([]);
      if (unsubscribe) unsubscribe();
      setUnsubscribe(null);
      await loadAllConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMsg);
      console.error('Error deleting conversation:', err);
    }
  }, [conversationId, unsubscribe]);

  /**
   * Load all conversations for user
   */
  const loadAllConversations = useCallback(async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMsg);
      console.error('Error loading conversations:', err);
    }
  }, []);

  return {
    conversationId,
    messages,
    conversations,
    loading,
    error,
    startNewConversation,
    loadConversation,
    addMessage,
    updateTitle,
    deleteCurrentConversation,
    loadAllConversations,
  };
};

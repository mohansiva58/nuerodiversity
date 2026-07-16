/**
 * Chat History Service
 * Stores and retrieves RAG chat conversations from Firebase Realtime Database
 */

import { ref, push, set, get, query, orderByChild, limitToLast, onValue, remove, update } from 'firebase/database';
import { rtdb } from '../pages/firebase';
import { getAuth } from 'firebase/auth';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Array<{ source: string; content: string }>;
  timestamp: string;
}   

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  userId: string;
}

const auth = getAuth();

/**
 * Save a single message to a conversation
 */
export const saveChatMessage = async (
  conversationId: string,
  message: ChatMessage
): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const messageRef = ref(rtdb, `chatHistory/${userId}/conversations/${conversationId}/messages/${message.id}`);
  
  await set(messageRef, {
    type: message.type,
    content: message.content,
    sources: message.sources || [],
    timestamp: message.timestamp,
  });

  // Update conversation timestamp
  const convRef = ref(rtdb, `chatHistory/${userId}/conversations/${conversationId}`);
  await update(convRef, { updatedAt: Date.now() });
};

/**
 * Save entire conversation
 */
export const saveConversation = async (conversation: Conversation): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const conversationRef = ref(
    rtdb,
    `chatHistory/${userId}/conversations/${conversation.id}`
  );

  await set(conversationRef, {
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
  });

  // Save all messages
  for (const message of conversation.messages) {
    await saveChatMessage(conversation.id, message);
  }
};

/**
 * Create a new conversation
 */
export const createConversation = async (title: string = 'New Chat'): Promise<string> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const conversationsRef = ref(rtdb, `chatHistory/${userId}/conversations`);
  const newConvRef = push(conversationsRef);
  
  if (!newConvRef.key) throw new Error('Failed to create conversation');

  await set(newConvRef, {
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  });

  return newConvRef.key;
};

/**
 * Get all conversations for current user
 */
export const getConversations = async (): Promise<
  Array<{
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
  }>
> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const conversationsRef = ref(rtdb, `chatHistory/${userId}/conversations`);
  const snapshot = await get(conversationsRef);

  if (!snapshot.exists()) return [];

  const conversations = Object.entries(snapshot.val()).map(([id, data]: any) => ({
    id,
    title: data.title || 'Chat',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    messageCount: data.messageCount || 0,
  }));

  // Sort by most recent first
  return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
};

/**
 * Get a specific conversation with all messages
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const conversationRef = ref(
    rtdb,
    `chatHistory/${userId}/conversations/${conversationId}`
  );
  const snapshot = await get(conversationRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.val();

  // Get all messages
  const messagesRef = ref(
    rtdb,
    `chatHistory/${userId}/conversations/${conversationId}/messages`
  );
  const messagesSnapshot = await get(messagesRef);
  const messages: ChatMessage[] = [];

  if (messagesSnapshot.exists()) {
    const messagesData = messagesSnapshot.val();
    Object.entries(messagesData).forEach(([id, message]: any) => {
      messages.push({
        id,
        type: message.type,
        content: message.content,
        sources: message.sources || [],
        timestamp: message.timestamp,
      });
    });
  }

  // Sort by timestamp
  messages.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    id: conversationId,
    title: data.title,
    messages,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    userId,
  };
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (
  conversationId: string,
  title: string
): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const convRef = ref(rtdb, `chatHistory/${userId}/conversations/${conversationId}`);
  await update(convRef, { 
    title,
    updatedAt: Date.now(),
  });
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const convRef = ref(rtdb, `chatHistory/${userId}/conversations/${conversationId}`);
  await remove(convRef);
};

/**
 * Subscribe to conversation updates in real-time
 */
export const subscribeToConversation = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const messagesRef = ref(
    rtdb,
    `chatHistory/${userId}/conversations/${conversationId}/messages`
  );

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([id, message]: any) => {
        messages.push({
          id,
          type: message.type,
          content: message.content,
          sources: message.sources || [],
          timestamp: message.timestamp,
        });
      });
    }

    // Sort by timestamp
    messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    callback(messages);
  });

  return unsubscribe;
};

/**
 * Clear all conversations for current user (use with caution!)
 */
export const clearAllConversations = async (): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const userRef = ref(rtdb, `chatHistory/${userId}`);
  await remove(userRef);
};

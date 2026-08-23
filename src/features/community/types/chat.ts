export interface StreamUserProfile {
  id: string;
  name: string;
  image?: string;
}

export interface StreamTokenResponse {
  token: string;
  userId: string;
  user: StreamUserProfile;
}

export type StreamChatStatus = 'idle' | 'loading' | 'ready' | 'error' | 'no-config';

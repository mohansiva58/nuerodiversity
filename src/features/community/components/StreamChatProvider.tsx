import React, { useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { Chat, useCreateChatClient } from 'stream-chat-react';
import type { StreamChatOptions, UserResponse } from 'stream-chat';
import { STREAM_API_KEY } from '../services/streamChat';
import { useStreamChat } from '../hooks/useStreamChat';
import type { StreamTokenResponse } from '../types/chat';

export interface StreamChatProviderProps {
  firebaseUser: FirebaseUser;
  children: React.ReactNode;
}

export function StreamChatLoading() {
  return (
    <div className="nh-community__state" role="status">
      <div className="nh-community__spinner" aria-hidden="true" />
      <p>Connecting to Community chat…</p>
    </div>
  );
}

export function StreamChatError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="nh-community__state nh-community__state--error" role="alert">
      <p>{message}</p>
      <button type="button" className="nh-community__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function StreamChatClient({
  token,
  userData,
  children,
}: {
  token: string;
  userData: StreamTokenResponse['user'];
  children: React.ReactNode;
}) {
  const user = useMemo<UserResponse>(
    () => ({
      id: userData.id,
      name: userData.name,
      image: userData.image,
    }),
    [userData]
  );

  const options = useMemo<StreamChatOptions>(
    () => ({ presence: true, state: true }),
    []
  );

  const client = useCreateChatClient({
    apiKey: STREAM_API_KEY as string,
    tokenOrProvider: token,
    userData: user,
    options,
  });

  if (!client) {
    return <StreamChatLoading />;
  }

  return (
    <Chat client={client} theme="str-chat__theme-light">
      {children}
    </Chat>
  );
}

export function StreamChatProvider({ firebaseUser, children }: StreamChatProviderProps) {
  const { status, token, userData, error, retry } = useStreamChat(firebaseUser);

  if (status === 'loading' || status === 'idle') {
    return <StreamChatLoading />;
  }

  if (status === 'no-config') {
    return (
      <StreamChatError
        message="Community chat is not configured yet. Please set VITE_STREAM_API_KEY."
        onRetry={retry}
      />
    );
  }

  if (status === 'error' || !token || !userData) {
    return (
      <StreamChatError
        message={error ?? 'Could not connect to Community chat.'}
        onRetry={retry}
      />
    );
  }

  return (
    <StreamChatClient token={token} userData={userData}>
      {children}
    </StreamChatClient>
  );
}

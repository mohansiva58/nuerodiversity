import { useCallback, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { requestStreamToken, STREAM_API_KEY } from '../services/streamChat';
import type { StreamChatStatus, StreamTokenResponse } from '../types/chat';

export interface UseStreamChatResult {
  status: StreamChatStatus;
  token: string | null;
  userData: StreamTokenResponse['user'] | null;
  error: string | null;
  retry: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Could not connect to Community chat. Please try again.';
}

export function useStreamChat(firebaseUser: FirebaseUser): UseStreamChatResult {
  const [status, setStatus] = useState<StreamChatStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<StreamTokenResponse['user'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!STREAM_API_KEY) {
      setStatus('no-config');
      return undefined;
    }

    setStatus('loading');
    setError(null);
    setToken(null);
    setUserData(null);

    requestStreamToken(
      firebaseUser,
      firebaseUser.displayName ?? undefined,
      firebaseUser.photoURL ?? undefined
    )
      .then((response) => {
        if (cancelled) return;
        setToken(response.token);
        setUserData(response.user);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { status, token, userData, error, retry };
}

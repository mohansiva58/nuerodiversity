import type { User as FirebaseUser } from 'firebase/auth';
import type { StreamTokenResponse } from '../types/chat';

export const STREAM_API_KEY: string | undefined = import.meta.env.VITE_STREAM_API_KEY;
const STREAM_TOKEN_FUNCTION_URL =
  import.meta.env.VITE_STREAM_TOKEN_FUNCTION_URL ||
  (import.meta.env.DEV ? "http://localhost:5001/api/stream/token" : undefined);

export async function requestStreamToken(
  firebaseUser: FirebaseUser,
  displayName?: string,
  photoURL?: string
): Promise<StreamTokenResponse> {
  try {
    if (!STREAM_TOKEN_FUNCTION_URL) {
      throw new Error("Community chat token endpoint is not configured.");
    }

    const idToken = await firebaseUser.getIdToken();
    const response = await fetch(STREAM_TOKEN_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName, photoURL }),
    });

    if (!response.ok) {
      let message = "Could not connect to Community chat. Please try again.";

      try {
        const body = await response.json();
        if (typeof body?.error === "string") {
          message = body.error;
        }
      } catch {
        // Keep the generic message if the server did not return JSON.
      }

      throw new Error(message);
    }

    return response.json();
  } catch (error: unknown) {
    // Fail gracefully: log the error but don't let it bubble up as uncaught exception
    // in production. Callers should handle the resulting thrown error too.
    if (typeof window !== "undefined") {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          "[streamChat] CORS/Network error: Failed to fetch Stream token. " +
          "Check if the Render Stream token backend is deployed and VITE_STREAM_TOKEN_FUNCTION_URL is correct."
        );
      } else {
        // eslint-disable-next-line no-console
        console.warn("[streamChat] Failed to request Stream token:", error);
      }
    }
    throw error;
  }
}

export function getDistinctChannelId(memberIds: string[]): string {
  const key = [...new Set(memberIds)].sort().join('__');
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return `nh_${(hash >>> 0).toString(36)}`;
}

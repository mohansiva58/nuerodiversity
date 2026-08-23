/**
 * Stream Chat integration for NeuroHub.
 *
 * getStreamChatToken issues a short-lived Stream user token for the
 * authenticated Firebase user that calls it. The Stream API secret is
 * referenced through a Cloud Function secret and is never exposed to the
 * frontend.
 */
const {onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {StreamChat} = require("stream-chat");

if (!admin.apps.length) {
  admin.initializeApp();
}

const streamApiKey = defineSecret("STREAM_API_KEY");
const streamApiSecret = defineSecret("STREAM_API_SECRET");

// Public community channels seeded for every NeuroHub user. IDs are stable
// and deterministic so no duplicate channels are created per user.
const COMMUNITY_CHANNELS = [
  {
    id: "community_general",
    name: "Community General",
    description: "Welcome! Introduce yourself and chat about anything.",
    image: "https://getstream.io/random_png/?name=Community+General",
  },
  {
    id: "community_learning",
    name: "Community Learning",
    description: "Share resources, tips and learning experiences.",
    image: "https://getstream.io/random_png/?name=Community+Learning",
  },
  {
    id: "community_support",
    name: "Community Support",
    description: "A safe space to ask for help and support each other.",
    image: "https://getstream.io/random_png/?name=Community+Support",
  },
];

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

function setCorsHeaders(req, res) {
  const origin = req.get("origin") || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.set("Access-Control-Max-Age", "3600");
}

function sanitizeName(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 100);
  // eslint-disable-next-line no-control-regex
  return trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
}

function sanitizeImage(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^https?:\/\/.+/.test(trimmed)) return undefined;
  return trimmed.slice(0, 500);
}

async function verifyFirebaseUser(req) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer (.+)$/i);

  if (!match) {
    throw new HttpsError(
        "unauthenticated",
        "You must be signed in to access chat."
    );
  }

  return admin.auth().verifyIdToken(match[1]);
}

exports.getStreamChatToken = onRequest(
  {
    region: "us-central1",
    secrets: [streamApiKey, streamApiSecret],
    cors: true,
  },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const claims = await verifyFirebaseUser(req);
      const uid = claims.uid;
      const data = req.body || {};

      const name = sanitizeName(claims.name || data.displayName) ||
        "NeuroHub User";
      const image = sanitizeImage(claims.picture || data.photoURL);

      const client = StreamChat.getInstance(
          streamApiKey.value(),
          streamApiSecret.value()
      );

      await client.upsertUser({
        id: uid,
        role: "user",
        name,
        ...(image ? {image} : {}),
      });

      for (const channel of COMMUNITY_CHANNELS) {
        const chatChannel = client.channel("messaging", channel.id, {
          created_by_id: uid,
          name: channel.name,
          description: channel.description,
          image: channel.image,
        });
        await chatChannel.create();
        await chatChannel.addMembers([uid]);
      }

      const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
      const token = client.createToken(uid, expiresAt);

      res.status(200).json({
        token,
        userId: uid,
        user: {id: uid, name, image},
      });
    } catch (error) {
      const status = error instanceof HttpsError &&
        error.code === "unauthenticated" ? 401 : 500;
      const message = error instanceof HttpsError ?
        error.message : "Failed to create Stream chat token.";

      // eslint-disable-next-line no-console
      console.error("getStreamChatToken failed:", error);
      res.status(status).json({error: message});
    }
  }
);

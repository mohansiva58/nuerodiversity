const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const redis = require('redis');
const admin = require('firebase-admin');
const { StreamChat } = require('stream-chat');

// Load environment variables from .env.local in src directory if running from backend folder
// Assuming current directory is backend/, so parent is root, then src/.env.local
dotenv.config({ path: path.join(__dirname, '../src/.env.local') });

// Also try loading from root .env just in case
dotenv.config({ path: path.join(__dirname, '../.env') });

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const REDIS_URL = process.env.REDIS_URL;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const CACHE_TTL = Number(process.env.REDIS_CACHE_TTL || 300);
const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const COMMUNITY_CHANNELS = [
    {
        id: 'community_general',
        name: 'Community General',
        description: 'Welcome! Introduce yourself and chat about anything.',
        image: 'https://getstream.io/random_png/?name=Community+General',
    },
    {
        id: 'community_learning',
        name: 'Community Learning',
        description: 'Share resources, tips and learning experiences.',
        image: 'https://getstream.io/random_png/?name=Community+Learning',
    },
    {
        id: 'community_support',
        name: 'Community Support',
        description: 'A safe space to ask for help and support each other.',
        image: 'https://getstream.io/random_png/?name=Community+Support',
    },
];

if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('❌ Missing EMAIL_USER or EMAIL_PASS in environment variables.');
    console.warn('Missing EMAIL_USER or EMAIL_PASS. Email endpoint will be disabled.');
}

if (!admin.apps.length && FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON)),
        });
        console.log('Firebase Admin initialized');
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
    }
}

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
    console.warn('Missing STREAM_API_KEY or STREAM_API_SECRET. Stream token endpoint will be disabled.');
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Redis Client Setup
let redisClient;
(async () => {
    try {
        if (!REDIS_URL || !REDIS_PASSWORD) {
            console.warn('⚠️ Redis credentials missing (REDIS_URL/REDIS_PASSWORD). Cache disabled.');
            return;
        }

        // Parse Redis URL
        const [host, port] = REDIS_URL.split(':');

        redisClient = redis.createClient({
            socket: {
                host: host,
                port: parseInt(port)
            },
            password: REDIS_PASSWORD
        });

        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        redisClient.on('connect', () => console.log('✅ Connected to Redis Cloud'));

        await redisClient.connect();
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
    }
})();

// Create Nodemailer transporter
const transporter = EMAIL_USER && EMAIL_PASS ? nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
}) : null;

async function verifyEmailTransport() {
    try {
        if (!transporter) {
            return { ok: false, message: 'SMTP is not configured' };
        }
        await transporter.verify();
        return { ok: true, message: 'SMTP connection verified' };
    } catch (error) {
        return {
            ok: false,
            message: 'SMTP verification failed',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// Cache Helper Functions

async function getCachedData(key) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.log('Redis not available, skipping cache');
            return null;
        }
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Redis GET error:', error);
        return null;
    }
}

async function setCachedData(key, data, ttl = CACHE_TTL) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            console.log('Redis not available, skipping cache');
            return;
        }
        await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
        console.error('Redis SET error:', error);
    }
}

async function deleteCachedData(key) {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return;
        }
        await redisClient.del(key);
    } catch (error) {
        console.error('Redis DELETE error:', error);
    }
}

function sanitizeName(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim().slice(0, 100);
    // eslint-disable-next-line no-control-regex
    return trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
}

function sanitizeImage(value) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!/^https?:\/\/.+/.test(trimmed)) return undefined;
    return trimmed.slice(0, 500);
}

async function verifyFirebaseUser(req) {
    if (!admin.apps.length) {
        const error = new Error('Firebase Admin is not configured.');
        error.status = 503;
        throw error;
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer (.+)$/i);

    if (!match) {
        const error = new Error('You must be signed in to access chat.');
        error.status = 401;
        throw error;
    }

    return admin.auth().verifyIdToken(match[1]);
}

app.post('/api/stream/token', async (req, res) => {
    try {
        if (!STREAM_API_KEY || !STREAM_API_SECRET) {
            return res.status(503).json({ error: 'Stream Chat is not configured.' });
        }

        const claims = await verifyFirebaseUser(req);
        const uid = claims.uid;
        const { displayName, photoURL } = req.body || {};
        const name = sanitizeName(claims.name || displayName) || 'NeuroHub User';
        const image = sanitizeImage(claims.picture || photoURL);

        const client = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

        await client.upsertUser({
            id: uid,
            role: 'user',
            name,
            ...(image ? { image } : {}),
        });

        for (const channel of COMMUNITY_CHANNELS) {
            const chatChannel = client.channel('messaging', channel.id, {
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

        return res.status(200).json({
            token,
            userId: uid,
            user: { id: uid, name, image },
        });
    } catch (error) {
        console.error('Stream token error:', error);
        return res.status(error.status || 500).json({
            error: error.message || 'Failed to create Stream chat token.',
        });
    }
});

// API Endpoints for User Data Caching
app.get('/api/user-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const cacheKey = `user:${userId}`;

        if (!redisClient || !redisClient.isOpen) {
            return res.status(200).json({
                source: 'cache',
                cacheAvailable: false,
                cacheMiss: true,
                data: null,
                message: 'Redis cache unavailable',
            });
        }

        // Try to get from cache first
        const cachedData = await getCachedData(cacheKey);

        if (cachedData) {
            console.log(`✅ Cache HIT for user: ${userId}`);
            return res.status(200).json({
                source: 'cache',
                cacheAvailable: true,
                cacheMiss: false,
                data: cachedData
            });
        }

        console.log(`ℹ️ Cache MISS for user: ${userId}`);
        return res.status(200).json({
            source: 'cache',
            cacheAvailable: true,
            cacheMiss: true,
            data: null,
            message: 'No cached data found'
        });

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

app.post('/api/user-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userData = req.body;
        const cacheKey = `user:${userId}`;

        if (!redisClient || !redisClient.isOpen) {
            return res.status(503).json({
                message: 'Redis cache unavailable',
            });
        }

        // Store in cache
        await setCachedData(cacheKey, userData);

        console.log(`✅ Cached data for user: ${userId}`);
        res.status(200).json({
            message: 'User data cached successfully',
            ttl: CACHE_TTL
        });

    } catch (error) {
        console.error('Error caching user data:', error);
        res.status(500).json({ error: 'Failed to cache user data' });
    }
});

app.delete('/api/user-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const cacheKey = `user:${userId}`;

        await deleteCachedData(cacheKey);

        console.log(`✅ Deleted cache for user: ${userId}`);
        res.status(200).json({ message: 'Cache deleted successfully' });

    } catch (error) {
        console.error('Error deleting cache:', error);
        res.status(500).json({ error: 'Failed to delete cache' });
    }
});

// Platform Statistics Caching Endpoints
app.get('/api/platform-stats', async (req, res) => {
    try {
        const cacheKey = 'platform:stats';

        if (!redisClient || !redisClient.isOpen) {
            return res.status(200).json({
                source: 'cache',
                cacheAvailable: false,
                cacheMiss: true,
                data: null,
                message: 'Redis cache unavailable',
            });
        }

        const cachedData = await getCachedData(cacheKey);

        if (cachedData) {
            console.log('✅ Cache HIT for platform stats');
            return res.status(200).json({
                source: 'cache',
                cacheAvailable: true,
                cacheMiss: false,
                data: cachedData
            });
        }

        console.log('ℹ️ Cache MISS for platform stats');
        return res.status(200).json({
            source: 'cache',
            cacheAvailable: true,
            cacheMiss: true,
            data: null,
            message: 'No cached stats found'
        });

    } catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({ error: 'Failed to fetch platform stats' });
    }
});

app.post('/api/platform-stats', async (req, res) => {
    try {
        const statsData = req.body;
        const cacheKey = 'platform:stats';

        if (!redisClient || !redisClient.isOpen) {
            return res.status(503).json({
                message: 'Redis cache unavailable',
            });
        }

        // Cache for 5 minutes
        await setCachedData(cacheKey, statsData, 300);

        console.log('✅ Cached platform stats');
        res.status(200).json({
            message: 'Platform stats cached successfully',
            ttl: 300
        });

    } catch (error) {
        console.error('Error caching platform stats:', error);
        res.status(500).json({ error: 'Failed to cache platform stats' });
    }
});

// Endpoint to send email
app.post('/api/send-email', async (req, res) => {
    const { to, subject, message } = req.body;

    if (!transporter) {
        return res.status(503).json({ error: 'Email service is not configured' });
    }

    if (!to || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
        from: `"NueroHub Reminder" <${EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: message,
        // html: message.replace(/\\n/g, '<br>') // Optional: Convert text to HTML
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// SMTP health check endpoint
app.get('/api/email-health', async (req, res) => {
    const smtpStatus = await verifyEmailTransport();

    if (!smtpStatus.ok) {
        return res.status(500).json({
            status: 'ERROR',
            smtp: smtpStatus,
            timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
        status: 'OK',
        smtp: smtpStatus,
        user: EMAIL_USER,
        timestamp: new Date().toISOString(),
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        redis: redisClient && redisClient.isOpen ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
